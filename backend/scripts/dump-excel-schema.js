/**
 * Dump all sheets from "DB Schema Mapping.xlsx" (project root) to JSON under docs/db-schema-mapping-export/.
 * Use to align Excel columns with DB tables (sectors, industries, vendor self attestation, buyer COTS).
 *
 * Prerequisite: in backend folder: npm install xlsx --save-dev
 * Run from backend folder: node scripts/dump-excel-schema.js
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, "..");
const rootDir = join(backendDir, "..");
const excelPath = join(rootDir, "DB Schema Mapping.xlsx");
const outDir = join(rootDir, "docs", "db-schema-mapping-export");

let XLSX;
try {
  XLSX = (await import("xlsx")).default;
} catch {
  console.error("Missing dependency. From backend folder run: npm install xlsx --save-dev");
  process.exit(1);
}

try {
  const wb = XLSX.readFile(excelPath);
  mkdirSync(outDir, { recursive: true });

  console.log("Sheet names:", wb.SheetNames);

  wb.SheetNames.forEach((name) => {
    const sheet = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const outPath = join(outDir, `${safeName}.json`);
    writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
    console.log("Wrote", outPath, "(" + data.length + " rows)");
  });

  const index = {
    description: "Exported from DB Schema Mapping.xlsx - use to align Excel columns with DB tables",
    sheets: wb.SheetNames,
    exportedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
  console.log("Done. See docs/db-schema-mapping-export/");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
