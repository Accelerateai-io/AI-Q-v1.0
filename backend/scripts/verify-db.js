/**
 * Verify DB connectivity and key tables (sectors, industries, users, assessments).
 * Run from backend: node scripts/verify-db.js
 * Uses DATABASE_URL from .env.local
 */
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

async function run() {
  const results = { ok: true, checks: [] };
  try {
    await client.connect();
    results.checks.push({ name: "Connection", status: "OK" });

    const q = (sql, label) => client.query(sql).then((r) => ({ label, rowCount: r.rowCount ?? r.rows?.[0] }));
    const queries = [
      ["SELECT 1 AS one", "Ping"],
      ["SELECT COUNT(*) AS c FROM public.sectors", "sectors"],
      ["SELECT COUNT(*) AS c FROM public.industries", "industries"],
      ["SELECT COUNT(*) AS c FROM public.users", "users"],
      ["SELECT COUNT(*) AS c FROM public.assessments", "assessments"],
    ];

    for (const [sql, label] of queries) {
      try {
        const res = await client.query(sql);
        const count = res.rows?.[0]?.c ?? res.rows?.[0]?.one;
        results.checks.push({ name: label, status: "OK", value: count });
      } catch (e) {
        results.checks.push({ name: label, status: "FAIL", error: e.message });
        results.ok = false;
      }
    }
  } catch (err) {
    console.error("DB connection failed:", err.message);
    results.ok = false;
    results.checks.push({ name: "Connection", status: "FAIL", error: err.message });
  } finally {
    await client.end();
  }

  console.log("\n--- DB verification ---");
  results.checks.forEach((c) => {
    const val = c.value != null ? ` (${c.value})` : "";
    const err = c.error ? `: ${c.error}` : "";
    console.log(`  ${c.name}: ${c.status}${val}${err}`);
  });
  console.log("----------------------\n");
  process.exit(results.ok ? 0 : 1);
}

run();
