/**
 * Seed risk_mappings table from Excel ("Shared Enhanced Risk Database Jan 2026.xlsx").
 * Drops and recreates risk_mappings with schema matching Excel headers:
 * Risk_id, Risk_Title, Domains, Description, Technical_Description, Executive_Summary,
 * Attack_Vector, Observable_Indicators, Data_to_Identify_Risk, Evidence_Sources,
 * Intent, Timing, Risk_Type_Detected, Primary_Risk, Secondary_Risks.
 *
 * Run from backend: npm run seed-risk-mappings
 * Excel path: project root or set env RISK_EXCEL_PATH.
 */

import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, "..");
const rootDir = join(backendDir, "..");

config({ path: join(backendDir, ".env.local") });
const connectionString = process.env.DATABASE_URL;

const excelFileName = "Shared Enhanced Risk Database Jan 2026.xlsx";
const possiblePaths = [
  process.env.RISK_EXCEL_PATH,
  join(rootDir, excelFileName),
  join(rootDir, "..", excelFileName),
  join(backendDir, excelFileName),
  join(process.cwd(), excelFileName),
].filter(Boolean);
const excelPath = possiblePaths.find(existsSync);
if (!excelPath) {
  console.error("Excel file not found. Tried:", possiblePaths.join(", "));
  console.error("Place the file in project root or set RISK_EXCEL_PATH.");
  process.exit(1);
}
console.log("Using Excel:", excelPath);

let connStr = connectionString;
if (!connStr) {
  const user = process.env.DATABASE_USER ?? "postgres";
  const password = process.env.DATABASE_PASSWORD ?? "Postgresql123";
  const host = process.env.DATABASE_HOST ?? "localhost";
  const port = process.env.DATABASE_PORT ?? "5432";
  const database = process.env.DATABASE_NAME ?? "ai_eval_db";
  connStr = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

let XLSX;
try {
  XLSX = (await import("xlsx")).default;
} catch {
  console.error("From backend run: npm install xlsx --save-dev");
  process.exit(1);
}

const client = new pg.Client({ connectionString: connStr });

function norm(s) {
  if (s == null || typeof s !== "string") return "";
  return s.trim().toLowerCase().replace(/\s+/g, "_");
}

function colIndex(headers, ...names) {
  const normalized = headers.map((h, i) => ({ i, n: norm(h) }));
  for (const name of names) {
    const n = norm(name);
    const found = normalized.find((x) => x.n === n || x.n.replace(/_/g, "") === n.replace(/_/g, ""));
    if (found) return found.i;
  }
  return -1;
}

function val(row, index, defaultVal = null) {
  if (index < 0 || !row || index >= row.length) return defaultVal;
  const c = row[index];
  if (c === null || c === undefined || c === "") return defaultVal;
  if (typeof c === "number" && !Number.isNaN(c)) return c;
  return String(c).trim() || defaultVal;
}

/** DB columns in INSERT order (risk_id first as PK) */
const DB_COLUMNS = [
  "risk_id",
  "risk_title",
  "domains",
  "description",
  "technical_description",
  "executive_summary",
  "attack_vector",
  "observable_indicators",
  "data_to_identify_risk",
  "evidence_sources",
  "intent",
  "timing",
  "risk_type_detected",
  "primary_risk",
  "secondary_risks",
];

/** Excel header variants per DB column */
const HEADER_MAP = [
  ["risk_id", "risk id"],
  ["risk_title", "risk title"],
  ["domains", "domain"],
  ["description"],
  ["technical_description", "technical description"],
  ["executive_summary", "executive summary"],
  ["attack_vector", "attack vector"],
  ["observable_indicators", "observable indicators"],
  ["data_to_identify_risk", "data to identify risk"],
  ["evidence_sources", "evidence sources"],
  ["intent"],
  ["timing"],
  ["risk_type_detected", "risk type detected"],
  ["primary_risk", "primary risk"],
  ["secondary_risks", "secondary risks"],
];

const VARCHAR_255 = [
  "risk_id",
  "risk_title",
  "domains",
  "attack_vector",
  "intent",
  "timing",
  "risk_type_detected",
  "primary_risk",
  "secondary_risks",
];

async function run() {
  try {
    const wb = XLSX.readFile(excelPath);
    await client.connect();
    console.log("Sheets:", wb.SheetNames.join(", "));

    await client.query("DROP TABLE IF EXISTS public.risk_mappings CASCADE");
    await client.query(`
      CREATE TABLE public.risk_mappings (
        risk_mapping_id serial PRIMARY KEY,
        risk_id varchar(255),
        risk_title varchar(255),
        domains varchar(255),
        description text,
        technical_description text,
        executive_summary text,
        attack_vector varchar(255),
        observable_indicators text,
        data_to_identify_risk text,
        evidence_sources text,
        intent varchar(255),
        timing varchar(255),
        risk_type_detected varchar(255),
        primary_risk varchar(255),
        secondary_risks varchar(255)
      );
      CREATE INDEX idx_risk_mappings_domains ON public.risk_mappings (domains) WHERE domains IS NOT NULL;
      CREATE INDEX idx_risk_mappings_risk_type_detected ON public.risk_mappings (risk_type_detected) WHERE risk_type_detected IS NOT NULL;
    `);
    console.log("Dropped and recreated risk_mappings table.");

    let totalInserted = 0;

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (!rows.length) {
        console.log(sheetName, ": empty, skipped");
        continue;
      }

      const headers = rows[0].map((h) => (h != null ? String(h) : ""));
      const dataRows = rows.slice(1).filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null));

      const colMap = {};
      for (let i = 0; i < HEADER_MAP.length; i++) {
        const dbCol = DB_COLUMNS[i];
        const variants = HEADER_MAP[i];
        let idx = -1;
        for (const v of variants) {
          idx = colIndex(headers, v);
          if (idx >= 0) break;
        }
        colMap[dbCol] = idx;
      }

      // Fallback: if we have 15 columns and first header looks like risk_id, use column order
      if (colMap.risk_id < 0 && headers.length >= 15) {
        const first = norm(headers[0]);
        if (first.includes("risk") && (first.includes("id") || first === "risk_id")) {
          for (let i = 0; i < DB_COLUMNS.length && i < headers.length; i++) colMap[DB_COLUMNS[i]] = i;
        }
      }

      const riskIdIdx = colMap.risk_id;
      if (riskIdIdx < 0) {
        console.log(sheetName, ": no risk_id column, skipped. Headers:", headers.slice(0, 10).join(" | "));
        continue;
      }
      console.log(sheetName, ": data rows to process:", dataRows.length);

      let sheetCount = 0;
      for (const row of dataRows) {
        const values = [];
        for (const dbCol of DB_COLUMNS) {
          const idx = colMap[dbCol];
          let v = idx >= 0 ? val(row, idx, null) : null;
          if (v != null && VARCHAR_255.includes(dbCol)) v = String(v).slice(0, 255);
          values.push(v);
        }

        await client.query(
          `INSERT INTO public.risk_mappings (
            risk_id, risk_title, domains, description, technical_description, executive_summary,
            attack_vector, observable_indicators, data_to_identify_risk, evidence_sources,
            intent, timing, risk_type_detected, primary_risk, secondary_risks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          values
        );
        sheetCount++;
      }
      if (sheetCount > 0) console.log(sheetName, ": inserted", sheetCount, "rows");
      totalInserted += sheetCount;
    }

    console.log("Done. Total rows inserted into risk_mappings:", totalInserted);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
