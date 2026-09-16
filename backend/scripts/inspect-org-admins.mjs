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
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position
  `);
  console.log("users cols:", cols.rows.map((r) => r.column_name));

  const admins = await pool.query(`
    SELECT organization_id::text AS organization_id, id, email, role, user_platform_role
    FROM users
    WHERE organization_id IS NOT NULL
      AND LOWER(TRIM(COALESCE(role, ''))) = 'admin'
    ORDER BY organization_id::int, id
  `);
  console.log("org admins:", admins.rows.length);
  console.log(admins.rows.slice(0, 15));

  const missing = await pool.query(`
    SELECT vo.organization_id, vo.user_id AS current_user_id, o."organizationName"
    FROM vendor_onboarding vo
    LEFT JOIN organizations o ON o.id::text = trim(vo.organization_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM users u
      WHERE u.organization_id::text = trim(vo.organization_id)
        AND LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
    )
    ORDER BY vo.organization_id
    LIMIT 40
  `);
  console.log("vendor orgs without admin user:", missing.rows.length, missing.rows.slice(0, 20));

  const mismatch = await pool.query(`
    SELECT
      count(*) FILTER (WHERE vo.user_id IS DISTINCT FROM admin.id)::int AS onboarding_mismatch,
      count(*)::int AS onboarding_total
    FROM vendor_onboarding vo
    LEFT JOIN LATERAL (
      SELECT u.id
      FROM users u
      WHERE u.organization_id::text = trim(vo.organization_id)
        AND LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
      ORDER BY u.id
      LIMIT 1
    ) admin ON true
  `);
  console.log("onboarding mismatch vs org admin:", mismatch.rows[0]);

  const attMismatch = await pool.query(`
    SELECT
      count(*) FILTER (WHERE vsa.user_id IS DISTINCT FROM admin.id)::int AS attestation_mismatch,
      count(*)::int AS attestation_total
    FROM vendor_self_attestations vsa
    LEFT JOIN LATERAL (
      SELECT u.id
      FROM users u
      WHERE u.organization_id::text = trim(vsa.organization_id)
        AND LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
      ORDER BY u.id
      LIMIT 1
    ) admin ON true
  `);
  console.log("attestation mismatch vs org admin:", attMismatch.rows[0]);
} catch (err) {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
