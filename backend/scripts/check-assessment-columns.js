/**
 * One-off: check assessments and users table columns to debug listAssessmentsByOrganization.
 * Run: node scripts/check-assessment-columns.js
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

const client = new pg.Client({ connectionString });

async function run() {
  await client.connect();
  const tables = ["assessments", "cots_buyer_assessments", "cots_vendor_assessments", "users"];
  for (const table of tables) {
    const r = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
      [table]
    );
    console.log(table + ":", r.rows.map((x) => x.column_name).join(", "));
  }
  await client.end();
}

run().catch((e) => {
  console.error(e.message, e.code, e.detail);
  process.exit(1);
});
