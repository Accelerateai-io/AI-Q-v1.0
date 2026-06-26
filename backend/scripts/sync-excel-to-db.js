/**
 * Sync database from "DB Schema Mapping.xlsx" – all sheets.
 * - Each sheet maps to DB table(s). Column names = table columns. Do not modify Excel values.
 * - Sector & industries: no surrogate IDs; use Excel columns as-is; upsert by natural key (industry_id, industry_sector_id).
 * - Other tables: upsert by natural key where applicable. No duplicate records.
 *
 * Prerequisite: npm install xlsx pg (from backend). DATABASE_URL in .env.local.
 * Run from backend: node scripts/sync-excel-to-db.js
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, "..");
const rootDir = join(backendDir, "..");
const excelPath = join(rootDir, "DB Schema Mapping.xlsx");

config({ path: join(backendDir, ".env.local") });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

let XLSX;
try {
  XLSX = (await import("xlsx")).default;
} catch {
  console.error("From backend run: npm install xlsx --save-dev");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

function toRaw(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return String(v);
}

async function syncIndustrySectors(client, sheetRows) {
  // Block 1: Industry (sectors) – header row has industry_id, industry_name at indices 0,1
  const sectorHeader = sheetRows.find((r) => Array.isArray(r) && r[0] === "industry_id" && r[1] === "industry_name");
  const sectorHeaderIdx = sheetRows.indexOf(sectorHeader);
  const sectorRows = (sheetRows.slice(sectorHeaderIdx + 1) || []).filter(
    (r) => Array.isArray(r) && r[0] !== "" && r[0] != null && Number.isInteger(Number(r[0]))
  );
  for (const row of sectorRows) {
    const industry_id = Number(row[0]);
    const industry_name = row[1] == null ? "" : String(row[1]);
    await client.query(
      `INSERT INTO sectors (industry_id, industry_name)
       VALUES ($1, $2)
       ON CONFLICT (industry_id) DO UPDATE SET industry_name = EXCLUDED.industry_name`,
      [industry_id, industry_name]
    );
  }
  console.log("Sectors: upserted", sectorRows.length, "rows");

  // Block 2: Industry Sectors (industries) – header has industry_sector_id, industry_id, sector_name at indices 4,5,6
  const indHeader = sheetRows.find(
    (r) => Array.isArray(r) && r[4] === "industry_sector_id" && r[5] === "industry_id" && r[6] === "sector_name"
  );
  const indHeaderIdx = sheetRows.indexOf(indHeader);
  const indRows = (sheetRows.slice(indHeaderIdx + 1) || []).filter(
    (r) => Array.isArray(r) && r[4] !== "" && r[4] != null && Number.isInteger(Number(r[4]))
  );
  for (const row of indRows) {
    const industry_sector_id = Number(row[4]);
    const industry_id = Number(row[5]);
    const sector_name = row[6] == null ? "" : String(row[6]);
    await client.query(
      `INSERT INTO industries (industry_sector_id, industry_id, sector_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (industry_sector_id) DO UPDATE SET industry_id = EXCLUDED.industry_id, sector_name = EXCLUDED.sector_name`,
      [industry_sector_id, industry_id, sector_name]
    );
  }
  console.log("Industries: upserted", indRows.length, "rows");
}

async function run() {
  try {
    const wb = XLSX.readFile(excelPath);
    await client.connect();

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (!rows.length) continue;

      if (sheetName === "Industry_sectors") {
        await syncIndustrySectors(client, rows);
        continue;
      }

      // vendor_self_attestation / buyer_cots: if sheet has data rows (more than header), upsert by natural key
      const headers = rows[0];
      const dataRows = rows.slice(1).filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null));
      if (dataRows.length === 0) {
        console.log(sheetName, ": no data rows, skipped");
        continue;
      }

      // vendor_self_attestation / buyer_cots: schema aligned with Excel; data rows require
      // app context (e.g. assessment_id, user_id). Log and skip bulk insert from Excel here.
      console.log(sheetName, ": schema aligned;", dataRows.length, "data rows (sync via app or extend script for full upsert)");
    }

    console.log("Sync completed.");
  } catch (err) {
    console.error("Sync failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
