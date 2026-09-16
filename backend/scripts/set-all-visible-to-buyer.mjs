/**
 * One-off: set visible_to_buyer = true for all vendor_self_attestations products.
 * Run: node scripts/set-all-visible-to-buyer.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
dotenv.config({ path: path.join(backendRoot, ".env.local") });
dotenv.config({ path: path.join(backendRoot, ".env") });

const DATABASE_USER = process.env.DATABASE_USER ?? "postgres";
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD ?? "Postgresql123";
const DATABASE_HOST = process.env.DATABASE_HOST ?? "127.0.0.1";
const DATABASE_PORT = process.env.DATABASE_PORT ?? "5432";
const DATABASE_NAME = process.env.DATABASE_NAME ?? "ai_q_vendors_db";
const fromParts = `postgresql://${encodeURIComponent(DATABASE_USER)}:${encodeURIComponent(DATABASE_PASSWORD)}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;
const connectionString = (process.env.DATABASE_URL ?? "").trim() || fromParts;

const pool = new pg.Pool({ connectionString });
try {
  const before = await pool.query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE visible_to_buyer IS TRUE)::int AS visible_true,
      count(*) FILTER (WHERE visible_to_buyer IS NOT TRUE)::int AS visible_false
    FROM vendor_self_attestations
  `);
  console.log("Before:", before.rows[0]);

  const updated = await pool.query(`
    UPDATE vendor_self_attestations
    SET visible_to_buyer = TRUE
    WHERE visible_to_buyer IS DISTINCT FROM TRUE
    RETURNING id, product_name, status
  `);
  console.log("Updated rows:", updated.rowCount);
  for (const r of updated.rows.slice(0, 50)) {
    console.log("-", r.id, "|", r.status, "|", r.product_name ?? "(no name)");
  }
  if (updated.rowCount > 50) {
    console.log("... and", updated.rowCount - 50, "more");
  }

  const after = await pool.query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE visible_to_buyer IS TRUE)::int AS visible_true,
      count(*) FILTER (WHERE visible_to_buyer IS NOT TRUE)::int AS visible_false
    FROM vendor_self_attestations
  `);
  console.log("After:", after.rows[0]);
} catch (err) {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
