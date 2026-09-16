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
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name ILIKE '%vendor%' OR table_name ILIKE '%onboard%')
    ORDER BY table_name
  `);
  console.log("Vendor-related tables:", tables.rows.map((r) => r.table_name));

  const attUsers = await pool.query(`
    SELECT user_id, count(*)::int AS products
    FROM vendor_self_attestations
    GROUP BY user_id
    ORDER BY products DESC
  `);
  console.log("Attestations by user_id:", attUsers.rows);

  const vo = await pool.query(`
    SELECT count(*)::int AS total_vendors,
           count(DISTINCT user_id)::int AS distinct_users
    FROM vendor_onboarding
  `);
  console.log("vendor_onboarding:", vo.rows[0]);

  const byUser = await pool.query(`
    SELECT user_id, count(*)::int AS vendors
    FROM vendor_onboarding
    GROUP BY user_id
    ORDER BY vendors DESC
    LIMIT 15
  `);
  console.log("vendor_onboarding by user_id (top):", byUser.rows);

  const productCount = Number(attUsers.rows.reduce((s, r) => s + Number(r.products), 0));
  const vendorCount = Number(vo.rows[0].total_vendors);
  console.log({
    productCount,
    vendorCount,
    cartesianIfSameUser: vendorCount * productCount,
    explanation: "Directory fetches products per vendor by user_id; if many vendor_onboarding rows share one user_id that owns all products, UI multiplies them.",
  });
} catch (err) {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
