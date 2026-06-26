/**
 * Run the same query as listAssessmentsByOrganization to reproduce the error.
 * Run: node scripts/run-list-assessments-query.js [organizationId]
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });
config({ path: join(__dirname, "..", ".env") });

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DATABASE_USER ?? "postgres"}:${encodeURIComponent(process.env.DATABASE_PASSWORD ?? "Postgresql123")}@${process.env.DATABASE_HOST ?? "localhost"}:${process.env.DATABASE_PORT ?? "5432"}/${process.env.DATABASE_NAME ?? "ai_eval_db"}`;

const orgIdParam = process.argv[2] ?? "23";

const client = new pg.Client({ connectionString });

const query = `
SELECT
  a.id AS "assessmentId",
  a.type,
  a.status,
  a.created_at AS "createdAt",
  a.updated_at AS "updatedAt",
  a.organization_id AS "organizationId",
  b.organization_name AS "organizationName",
  u.email AS "completedByUserEmail",
  u.user_first_name AS "completedByUserFirstName",
  u.user_last_name AS "completedByUserLastName",
  u.user_name AS "completedByUserName"
FROM assessments a
LEFT JOIN cots_buyer_assessments b ON a.id = b.assessment_id
LEFT JOIN cots_vendor_assessments v ON a.id = v.assessment_id
LEFT JOIN users u ON b.user_id = u.id
WHERE a.organization_id = $1
ORDER BY a.created_at DESC
`;

async function run() {
  await client.connect();
  console.log("Running with organization_id =", orgIdParam);
  const r = await client.query(query, [orgIdParam]);
  console.log("Rows:", r.rowCount);
  if (r.rows[0]) console.log("First row keys:", Object.keys(r.rows[0]));
  await client.end();
}

run().catch((e) => {
  console.error("Error message:", e.message);
  console.error("Code:", e.code);
  console.error("Detail:", e.detail);
  process.exit(1);
});
