/**
 * Backfill VTS rationale for generated profile reports:
 * Rebuild VENDOR TRUST SCORE (Type 1) - EXPLAINED from stored report + VTS columns.
 */
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
const DATABASE_HOST = process.env.DATABASE_HOST ?? "localhost";
const DATABASE_PORT = process.env.DATABASE_PORT ?? "5432";
const DATABASE_NAME = process.env.DATABASE_NAME ?? "ai_eval_db";
const fromParts = `postgresql://${encodeURIComponent(DATABASE_USER)}:${encodeURIComponent(DATABASE_PASSWORD)}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;
const connectionString = (process.env.DATABASE_URL ?? "").trim() || fromParts;

function tryNum(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return null;
}

function isExplained(text) {
  return typeof text === "string" && /VENDOR TRUST SCORE \(Type 1\) - EXPLAINED/i.test(text);
}

function vtsMethodLine(scoringSource) {
  const src = String(scoringSource ?? "").toLowerCase();
  if (src.includes("vector")) {
    return (
      "AI overall trust score from the product profile, " +
      "guided by scoring formula documents from the knowledge base"
    );
  }
  if (src.startsWith("llm")) {
    return "AI overall trust score from attestation / vendor product profile data";
  }
  return "Deterministic trust formula from vendor self-attestation answers";
}

function trustScoreFromReport(report) {
  if (report == null || typeof report !== "object") return null;
  const ts = report.trustScore;
  if (ts != null && typeof ts === "object") {
    const overall = tryNum(ts.overallScore);
    if (overall != null) return Math.max(0, Math.min(100, Math.round(overall)));
  }
  return tryNum(report.trust_score);
}

function scoreByCategoryFromReport(report) {
  if (report == null || typeof report !== "object") return null;
  const ts = report.trustScore;
  if (ts != null && typeof ts === "object" && ts.scoreByCategory != null) {
    return ts.scoreByCategory;
  }
  return null;
}

function buildVtsRationaleFromRow(row) {
  const report = row.report;
  const trustScore = tryNum(row.trust_score) ?? trustScoreFromReport(report);
  const productRisk = tryNum(row.product_risk);
  const governanceRisk = tryNum(row.governance_risk);
  const operationalRisk = tryNum(row.operational_risk);
  if (trustScore == null) return null;
  if (productRisk == null && governanceRisk == null && operationalRisk == null) return null;

  const pr = productRisk ?? 0;
  const gr = governanceRisk ?? 0;
  const opr = operationalRisk ?? 0;
  const grade = firstNonEmpty(row.grade, report?.trustScore?.grade) ?? "?";
  const classification =
    firstNonEmpty(row.classification, report?.trustScore?.label) ?? "-";
  const scoringSource = "llm";

  const drivers = [
    { name: "Product risk", risk: pr, weight: 0.4, tip: "mitigations, domain coverage, evidence quality" },
    { name: "Governance risk", risk: gr, weight: 0.3, tip: "certs, policies, assessment quality, maturity" },
    { name: "Operational risk", risk: opr, weight: 0.3, tip: "SLA, incident management, deployment maturity, support" },
  ].sort((a, b) => b.risk * b.weight - a.risk * a.weight);

  const categories = scoreByCategoryFromReport(report);
  const concrete = [];
  if (categories && typeof categories === "object") {
    const weak = [];
    for (const [name, raw] of Object.entries(categories)) {
      if (typeof raw === "string" && /not enough/i.test(raw)) {
        weak.push({ name, val: raw });
        continue;
      }
      const n = tryNum(raw);
      if (n != null && n < 80) weak.push({ name, val: n });
    }
    weak.sort((a, b) => {
      const av = typeof a.val === "number" ? a.val : 999;
      const bv = typeof b.val === "number" ? b.val : 999;
      return av - bv;
    });
    for (const { name, val } of weak.slice(0, 4)) {
      if (typeof val === "string") {
        concrete.push(`Strengthen ${name}: add concrete evidence in attestation`);
      } else {
        const tip = val >= 70 ? "strengthen controls & proof" : "document policies, certs, testing, or SLAs";
        concrete.push(`Raise ${name} (${val}/100) - ${tip}`);
      }
    }
  }

  const lines = [
    "VENDOR TRUST SCORE (Type 1) - EXPLAINED",
    "=".repeat(72),
    "",
    "RESULT",
    `  Trust score:   ${Math.round(trustScore)} / 100   (higher = more trustworthy)`,
    `  Grade:         ${grade} - ${classification}`,
    `  Next step:     Proceed with standard due diligence`,
    `  Source:        ${scoringSource}`,
    "",
    "HOW WE GOT HERE",
    `  Method:   ${vtsMethodLine(scoringSource)}`,
    "  Idea:     Trust = 100 minus weighted Product, Governance, and Operational risk",
    "  Weights:  Product risk 40%  |  Governance risk 30%  |  Operational risk 30%",
    "",
    "  Risk drivers (higher risk lowers trust):",
  ];
  drivers.forEach((d, idx) => {
    const biggest = idx === 0 ? "  << biggest drag" : "";
    lines.push(
      `    ${idx + 1}. ${d.name.padEnd(22)} ${Number(d.risk).toFixed(2)}  (weight ${Math.round(d.weight * 100)}%)${biggest}`,
    );
  });
  lines.push("", "WHAT TO IMPROVE (to raise trust score)");
  if (drivers.length > 0) {
    lines.push(`  1. Biggest drag: ${drivers[0].name} (${drivers[0].risk.toFixed(1)}) - ${drivers[0].tip}`);
    if (drivers.length > 1) {
      lines.push(`  2. ${drivers[1].name} (${drivers[1].risk.toFixed(1)}) - ${drivers[1].tip}`);
    }
  }
  if (concrete.length > 0) {
    lines.push("  3. From attestation evidence, prioritize:");
    for (const item of concrete.slice(0, 8)) lines.push(`       - ${item}`);
  } else if (drivers.length > 2) {
    lines.push(`  3. ${drivers[2].name} (${drivers[2].risk.toFixed(1)}) - ${drivers[2].tip}`);
  } else {
    lines.push("  Trust signals look solid - keep evidence current and renew certifications on schedule.");
  }
  lines.push("");
  return lines.join("\n");
}

const pool = new pg.Pool({ connectionString });

try {
  const rows = await pool.query(`
    SELECT
      id,
      trust_score,
      product_risk,
      governance_risk,
      operational_risk,
      grade,
      classification,
      report,
      score_rationale
    FROM generated_profile_reports
    WHERE report IS NOT NULL
  `);

  let rebuilt = 0;
  let skipped = 0;

  for (const row of rows.rows) {
    const existing =
      typeof row.score_rationale === "string" ? row.score_rationale.trim() : "";
    if (isExplained(existing)) {
      skipped += 1;
      continue;
    }

    const rationale = buildVtsRationaleFromRow(row);
    if (!rationale) continue;

    const report = row.report ?? {};
    const reportPatched = {
      ...report,
      scoreRationale: rationale,
      scoreRationaleType: "VTS",
      trustScore:
        report.trustScore != null && typeof report.trustScore === "object"
          ? { ...report.trustScore, scoreRationale: rationale }
          : report.trustScore,
    };

    await pool.query(
      `
      UPDATE generated_profile_reports
      SET
        score_rationale = $1,
        score_rationale_type = 'VTS',
        report = $2::jsonb
      WHERE id = $3
      `,
      [rationale, JSON.stringify(reportPatched), row.id],
    );
    rebuilt += 1;
  }

  const after = await pool.query(`
    SELECT COUNT(*)::int AS col_filled
    FROM generated_profile_reports
    WHERE score_rationale IS NOT NULL AND TRIM(score_rationale) <> ''
  `);
  console.log(`Backfill complete: ${rebuilt} rebuilt, ${skipped} already EXPLAINED format.`);
  console.log(`Rows with score_rationale: ${after.rows[0].col_filled}`);
} catch (err) {
  console.error("Backfill failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
