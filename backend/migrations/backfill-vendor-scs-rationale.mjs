/**
 * Backfill SCS (Sales Confidence / sales risk) rationale for vendor COTS reports:
 * 1) Copy scoreRationale from report JSON when present
 * 2) Otherwise rebuild SALES RISK SCORE (Type 2) - EXPLAINED from stored report JSON
 * 3) Normalize legacy score_rationale_type SRS -> SCS
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

function tryRiskScoreNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function appendixSalesRiskBreakdown(report) {
  const gen = report.generatedAnalysis ?? report.generated_analysis;
  if (gen == null || typeof gen !== "object" || Array.isArray(gen)) return null;
  const full = gen.fullReport ?? gen.full_report;
  if (full == null || typeof full !== "object" || Array.isArray(full)) return null;
  const appendix = full.appendix;
  if (appendix == null || typeof appendix !== "object" || Array.isArray(appendix)) return null;
  return appendix.salesRiskBreakdown ?? appendix.sales_risk_breakdown ?? null;
}

function extractOverallRiskScoreFromReport(report) {
  if (report == null || typeof report !== "object" || Array.isArray(report)) return null;
  const gen = report.generatedAnalysis ?? report.generated_analysis;
  if (gen != null && typeof gen === "object" && !Array.isArray(gen)) {
    const fromGen = tryRiskScoreNumber(gen.overallRiskScore ?? gen.overall_risk_score);
    if (fromGen != null) return fromGen;
  }
  const fromTop = tryRiskScoreNumber(report.overallRiskScore ?? report.overall_risk_score);
  if (fromTop != null) return fromTop;
  const breakdown = appendixSalesRiskBreakdown(report);
  if (breakdown != null) {
    const fromAppendix = tryRiskScoreNumber(
      breakdown.sales_risk_score ?? breakdown.salesRiskScore,
    );
    if (fromAppendix != null) return fromAppendix;
  }
  return null;
}

function buildScsRationaleFromReport(report) {
  if (report == null || typeof report !== "object") return null;
  const breakdown = appendixSalesRiskBreakdown(report);
  const srs =
    extractOverallRiskScoreFromReport(report) ??
    (breakdown != null ? Number(breakdown.sales_risk_score ?? breakdown.salesRiskScore) : NaN);
  if (!Number.isFinite(srs) && breakdown == null) return null;

  const scoreNum = Number.isFinite(srs) ? Math.max(0, Math.min(100, Number(srs))) : null;
  const scoreLabel =
    scoreNum != null
      ? Number.isInteger(scoreNum)
        ? String(scoreNum)
        : scoreNum.toFixed(2)
      : null;
  const cfr =
    breakdown != null
      ? Number(breakdown.customer_friction_risk ?? breakdown.customerFrictionRisk)
      : NaN;
  const ir =
    breakdown != null
      ? Number(breakdown.implementation_risk ?? breakdown.implementationRisk)
      : NaN;
  const cr =
    breakdown != null ? Number(breakdown.competitive_risk ?? breakdown.competitiveRisk) : NaN;
  const deal =
    breakdown != null &&
    Number.isFinite(Number(breakdown.deal_probability_pct ?? breakdown.dealProbabilityPct))
      ? Math.round(Number(breakdown.deal_probability_pct ?? breakdown.dealProbabilityPct))
      : scoreNum != null
        ? Math.max(0, Math.min(100, Math.round(100 - scoreNum)))
        : null;
  const grade = breakdown != null ? String(breakdown.grade ?? "").trim() : "";
  const classification = breakdown != null ? String(breakdown.classification ?? "").trim() : "";
  const dealChars =
    breakdown != null
      ? String(breakdown.deal_characteristics ?? breakdown.dealCharacteristics ?? "").trim()
      : "";
  const recommended =
    breakdown != null
      ? String(breakdown.recommended_actions ?? breakdown.recommendedActions ?? "").trim()
      : "";

  const drivers = [
    {
      name: "Customer friction",
      risk: cfr,
      weight: 0.35,
      tip: "Address data sensitivity / compliance documentation",
    },
    {
      name: "Implementation",
      risk: ir,
      weight: 0.35,
      tip: "Add concrete risk mitigations per customer concern",
    },
    {
      name: "Competitive",
      risk: cr,
      weight: 0.3,
      tip: "Differentiate vs alternatives / build-vs-buy",
    },
  ]
    .filter((d) => Number.isFinite(d.risk))
    .sort((a, b) => b.risk * b.weight - a.risk * a.weight);

  const lines = [
    "SALES RISK SCORE (Type 2) - EXPLAINED",
    "=".repeat(72),
    "",
    "RESULT",
    scoreLabel != null
      ? `  Sales risk:         ${scoreLabel} / 100   (higher = harder deal)`
      : "  Sales risk:         — / 100   (higher = harder deal)",
  ];
  if (deal != null) lines.push(`  Deal probability:   ~${deal}%     (roughly 100 - sales risk)`);
  if (grade || classification) {
    lines.push(`  Grade:              ${[grade, classification].filter(Boolean).join(" - ")}`);
  }
  if (dealChars) lines.push(`  Deal picture:       ${dealChars}`);
  if (recommended) lines.push(`  Recommended move:   ${recommended}`);
  lines.push(
    "",
    "HOW WE GOT HERE",
    "  Method:   Deterministic sales-risk formula from the Vendor COTS answers",
    "  Idea:     Sales risk blends three weighted risks (then deal odds ~= 100 - risk)",
    "  Weights:  Customer friction 35%  |  Implementation 35%  |  Competitive 30%",
  );
  if (drivers.length > 0) {
    lines.push("", "  Risk drivers (higher = more sales risk):");
    drivers.forEach((d, idx) => {
      const biggest = idx === 0 ? "  << biggest drag" : "";
      lines.push(
        `    ${idx + 1}. ${d.name.padEnd(22)} ${Number(d.risk).toFixed(2)}  (weight ${Math.round(d.weight * 100)}%)${biggest}`,
      );
    });
  }
  lines.push("", "WHAT TO IMPROVE (to lower sales risk / raise deal odds)");
  if (drivers.length > 0) {
    drivers.slice(0, 3).forEach((d, idx) => {
      lines.push(`  ${idx + 1}. ${d.name} (${Number(d.risk).toFixed(1)}) - ${d.tip}`);
    });
  } else {
    lines.push("  Risks look low - keep the standard sales path and reinforce value proof.");
  }
  return lines.join("\n");
}

const pool = new pg.Pool({ connectionString });

try {
  const rows = await pool.query(`
    SELECT id, assessment_id, report, score_rationale, score_rationale_type
    FROM customer_risk_assessment_reports
    WHERE report IS NOT NULL
  `);

  let copied = 0;
  let rebuilt = 0;
  let typeNormalized = 0;

  for (const row of rows.rows) {
    const report = row.report;
    const gen = report?.generatedAnalysis ?? report?.generated_analysis;
    const existingJson = [
      typeof report?.scoreRationale === "string" ? report.scoreRationale.trim() : "",
      gen && typeof gen.scoreRationale === "string" ? gen.scoreRationale.trim() : "",
      typeof row.score_rationale === "string" ? row.score_rationale.trim() : "",
    ].find((s) => s.length > 0);

    let rationale = existingJson ?? "";
    if (!rationale) {
      rationale = buildScsRationaleFromReport(report) ?? "";
    }

    const hadRationale = Boolean(existingJson);
    const needsRationale =
      !row.score_rationale || String(row.score_rationale).trim() === "";
    const needsTypeNormalize =
      String(row.score_rationale_type ?? "").trim().toUpperCase() === "SRS";

    if (!rationale && !needsTypeNormalize) continue;

    const reportPatched = {
      ...report,
      scoreRationale: rationale || report?.scoreRationale,
      scoreRationaleType: "SCS",
      generatedAnalysis:
        gen != null && typeof gen === "object"
          ? {
              ...gen,
              ...(rationale
                ? { scoreRationale: rationale, scoreRationaleType: "SCS" }
                : { scoreRationaleType: "SCS" }),
            }
          : gen,
    };

    await pool.query(
      `
      UPDATE customer_risk_assessment_reports
      SET
        score_rationale = COALESCE(NULLIF(TRIM($1), ''), score_rationale),
        score_rationale_type = 'SCS',
        report = $2::jsonb
      WHERE id = $3
        AND (
          score_rationale IS NULL
          OR TRIM(score_rationale) = ''
          OR UPPER(TRIM(COALESCE(score_rationale_type, ''))) = 'SRS'
        )
      `,
      [rationale, JSON.stringify(reportPatched), row.id],
    );

    if (needsTypeNormalize && !needsRationale) typeNormalized += 1;
    else if (hadRationale) copied += 1;
    else if (rationale) rebuilt += 1;
  }

  const after = await pool.query(`
    SELECT COUNT(*)::int AS col_filled
    FROM customer_risk_assessment_reports
    WHERE score_rationale IS NOT NULL AND TRIM(score_rationale) <> ''
  `);
  console.log(
    `Backfill complete: ${copied} copied from JSON, ${rebuilt} rebuilt, ${typeNormalized} type-only SRS->SCS.`,
  );
  console.log(`Rows with score_rationale: ${after.rows[0].col_filled}`);
} catch (err) {
  console.error("Backfill failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
