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
  const a = await pool.query(`
    SELECT organization_id, count(*)::int AS n
    FROM vendor_self_attestations
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 20
  `);
  const v = await pool.query(`
    SELECT organization_id, user_id, count(*)::int AS n
    FROM vendor_onboarding
    GROUP BY 1, 2
    ORDER BY n DESC
    LIMIT 20
  `);
  const overlap = await pool.query(`
    SELECT vo.organization_id AS vendor_org, count(vsa.id)::int AS products
    FROM vendor_onboarding vo
    LEFT JOIN vendor_self_attestations vsa
      ON trim(coalesce(vsa.organization_id, '')) = trim(coalesce(vo.organization_id, ''))
    GROUP BY vo.organization_id
    ORDER BY products DESC
    LIMIT 20
  `);
  const sum = await pool.query(`
    SELECT count(vsa.id)::int AS matched_products
    FROM vendor_onboarding vo
    JOIN vendor_self_attestations vsa
      ON trim(coalesce(vsa.organization_id, '')) = trim(coalesce(vo.organization_id, ''))
  `);
  const orphans = await pool.query(`
    SELECT count(*)::int AS orphan_products
    FROM vendor_self_attestations vsa
    WHERE NOT EXISTS (
      SELECT 1 FROM vendor_onboarding vo
      WHERE trim(coalesce(vo.organization_id, '')) = trim(coalesce(vsa.organization_id, ''))
    )
  `);
  const withProducts = await pool.query(`
    SELECT count(*)::int AS vendors_with_products
    FROM vendor_onboarding vo
    WHERE EXISTS (
      SELECT 1 FROM vendor_self_attestations vsa
      WHERE trim(coalesce(vsa.organization_id, '')) = trim(coalesce(vo.organization_id, ''))
        AND upper(trim(coalesce(vsa.status, ''))) = 'COMPLETED'
        AND vsa.visible_to_buyer IS TRUE
    )
  `);
  console.log({
    attestationOrgs: a.rows,
    vendorOnboardingSample: v.rows,
    productsPerVendorOrgTop: overlap.rows,
    matchedProductsByOrg: sum.rows[0],
    orphanProducts: orphans.rows[0],
    vendorsWithProducts: withProducts.rows[0],
  });
} catch (err) {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
