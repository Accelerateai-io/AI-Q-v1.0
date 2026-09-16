/**
 * Upsert system admin: admin@work.com / 12345678
 * Run from backend: node scripts/seed-admin.mjs
 */
import bcrypt from "bcrypt";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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

const EMAIL = "admin@work.com";
const PASSWORD = "12345678";
const SALT_ROUNDS = 10;

const pool = new pg.Pool({ connectionString });

try {
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // Ensure organization id=1 exists (enum is buyer|vendor only in this DB)
  const org = await pool.query(`SELECT id FROM organizations WHERE id = 1 LIMIT 1`);
  if (org.rows.length === 0) {
    await pool.query(`
      INSERT INTO organizations (id, "organizationName", "organizationType", "organizationStatus", created_by)
      VALUES (1, 'ai eval', 'vendor', 'active', 'seed')
    `);
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('organizations', 'id'), GREATEST((SELECT MAX(id) FROM organizations), 1))`,
    );
  }

  const existing = await pool.query(
    `SELECT id, email FROM users WHERE lower(trim(email)) = lower(trim($1)) LIMIT 1`,
    [EMAIL],
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE users SET
        user_password = $1,
        role = 'system admin',
        user_platform_role = 'system admin',
        "userStatus" = 'active',
        account_status = 'confirmed',
        user_signup_completed = 'true',
        user_onboarding_completed = 'true',
        onboarding_status = 'completed',
        organization_id = 1,
        user_name = COALESCE(NULLIF(trim(user_name), ''), 'Admin'),
        user_first_name = COALESCE(NULLIF(trim(user_first_name), ''), 'Admin'),
        user_last_name = COALESCE(NULLIF(trim(user_last_name), ''), 'Admin')
      WHERE id = $2`,
      [hash, existing.rows[0].id],
    );
    console.log(`Updated existing admin user id=${existing.rows[0].id} (${EMAIL})`);
  } else {
    const inserted = await pool.query(
      `INSERT INTO users (
        email, organization_id, role, invited_by, account_status,
        user_name, user_first_name, user_last_name, user_password,
        "userStatus", user_signup_completed, user_onboarding_completed,
        onboarding_status, user_platform_role
      ) VALUES (
        $1, 1, 'system admin', '1', 'confirmed',
        'Admin', 'Admin', 'Admin', $2,
        'active', 'true', 'true',
        'completed', 'system admin'
      ) RETURNING id`,
      [EMAIL, hash],
    );
    console.log(`Created admin user id=${inserted.rows[0].id} (${EMAIL})`);
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT MAX(id) FROM users), 1))`,
    );
  }

  console.log("Admin ready: admin@work.com / 12345678");
} catch (err) {
  console.error("Seed admin failed:", err.message);
  if (err.detail) console.error("Detail:", err.detail);
  process.exitCode = 1;
} finally {
  await pool.end();
}
