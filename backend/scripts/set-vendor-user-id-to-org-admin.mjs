/**
 * Set vendor_onboarding / vendor_self_attestations / generated_profile_reports.user_id
 * to the organization admin user (role = 'admin') for that organization_id.
 *
 * Run: node scripts/set-vendor-user-id-to-org-admin.mjs
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
const client = await pool.connect();
try {
  await client.query("BEGIN");

  const onboarding = await client.query(`
    UPDATE vendor_onboarding vo
    SET user_id = admin.id,
        updated_at = NOW()
    FROM (
      SELECT DISTINCT ON (u.organization_id)
        u.organization_id::text AS organization_id,
        u.id
      FROM users u
      WHERE u.organization_id IS NOT NULL
        AND LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
      ORDER BY u.organization_id, u.id
    ) admin
    WHERE trim(vo.organization_id) = trim(admin.organization_id)
      AND vo.user_id IS DISTINCT FROM admin.id
    RETURNING vo.id, vo.organization_id, vo.user_id
  `);

  const attestations = await client.query(`
    UPDATE vendor_self_attestations vsa
    SET user_id = admin.id,
        updated_at = NOW()
    FROM (
      SELECT DISTINCT ON (u.organization_id)
        u.organization_id::text AS organization_id,
        u.id
      FROM users u
      WHERE u.organization_id IS NOT NULL
        AND LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
      ORDER BY u.organization_id, u.id
    ) admin
    WHERE trim(coalesce(vsa.organization_id, '')) = trim(admin.organization_id)
      AND vsa.user_id IS DISTINCT FROM admin.id
    RETURNING vsa.id, vsa.organization_id, vsa.user_id, vsa.product_name
  `);

  const reports = await client.query(`
    UPDATE generated_profile_reports gpr
    SET user_id = admin.id
    FROM (
      SELECT DISTINCT ON (u.organization_id)
        u.organization_id::text AS organization_id,
        u.id
      FROM users u
      WHERE u.organization_id IS NOT NULL
        AND LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
      ORDER BY u.organization_id, u.id
    ) admin
    WHERE trim(coalesce(gpr.organization_id, '')) = trim(admin.organization_id)
      AND gpr.user_id IS DISTINCT FROM admin.id
    RETURNING gpr.id, gpr.organization_id, gpr.user_id
  `);

  await client.query("COMMIT");

  console.log("Updated vendor_onboarding:", onboarding.rowCount);
  console.log("Updated vendor_self_attestations:", attestations.rowCount);
  console.log("Updated generated_profile_reports:", reports.rowCount);

  const check = await client.query(`
    SELECT
      (SELECT count(*)::int FROM vendor_onboarding vo
        WHERE EXISTS (
          SELECT 1 FROM users u
          WHERE u.organization_id::text = trim(vo.organization_id)
            AND LOWER(TRIM(COALESCE(u.role,''))) = 'admin'
            AND u.id = vo.user_id
        )) AS onboarding_matched,
      (SELECT count(*)::int FROM vendor_onboarding) AS onboarding_total,
      (SELECT count(*)::int FROM vendor_self_attestations vsa
        WHERE EXISTS (
          SELECT 1 FROM users u
          WHERE u.organization_id::text = trim(vsa.organization_id)
            AND LOWER(TRIM(COALESCE(u.role,''))) = 'admin'
            AND u.id = vsa.user_id
        )) AS attestation_matched,
      (SELECT count(*)::int FROM vendor_self_attestations) AS attestation_total
  `);
  console.log("After:", check.rows[0]);
  console.log("Sample attestations:", attestations.rows.slice(0, 8));
} catch (err) {
  try {
    await client.query("ROLLBACK");
  } catch {
    /* ignore */
  }
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
