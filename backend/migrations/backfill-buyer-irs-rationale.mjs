/**
 * Backfill IRS rationale for buyer COTS assessments:
 * 1) Copy scoreRationale from report JSON when present
 * 2) Otherwise rebuild IMPLEMENTATION READINESS SCORE (Type 3) - EXPLAINED from stored report + buyer answers
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

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return null;
}

function boolYes(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return (
    s.startsWith("yes") ||
    s === "true" ||
    s === "available" ||
    s === "exists" ||
    s === "defined"
  );
}

function readinessProfileFromScore(score) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (s >= 76) return "Strong readiness for implementation";
  if (s >= 51) return "Some gaps exist; manageable with planning";
  if (s >= 26) return "Significant gaps; plan mitigations before rollout";
  return "Major readiness gaps; defer or re-scope";
}

function buildIrsRationaleFromReport(report, buyerRow) {
  if (report == null || typeof report !== "object") return null;

  const readiness = Number(report.implementationRiskScore);
  if (!Number.isFinite(readiness)) return null;

  const gradeLetter = firstNonEmpty(report.implementationReadinessGrade);
  const classification = firstNonEmpty(report.implementationRiskClassification);
  const grade =
    gradeLetter && classification
      ? `${gradeLetter} - ${classification}`
      : gradeLetter ?? classification;

  const decision = firstNonEmpty(report.implementationRiskDecision);
  const profile = firstNonEmpty(
    report.readinessProfile,
    report.readiness_profile,
    readinessProfileFromScore(readiness),
  );
  const nextStep = firstNonEmpty(report.implementationRiskRecommendedAction);

  const ranked = Array.isArray(report.rankedEligibleVendors)
    ? report.rankedEligibleVendors
    : [];
  const topVendor = ranked[0] && typeof ranked[0] === "object" ? ranked[0] : null;
  const vendorName = firstNonEmpty(
    report.vendorName,
    buyerRow?.vendor_name,
    topVendor?.vendorName,
  );
  const productName = firstNonEmpty(
    report.productName,
    buyerRow?.specific_product,
    topVendor?.productName,
  );
  const vendorLabel =
    vendorName && productName
      ? `${vendorName} / ${productName}`
      : vendorName ?? productName ?? "Vendor / Product";

  const breakdown =
    report.implementationRiskBreakdown &&
    typeof report.implementationRiskBreakdown === "object"
      ? report.implementationRiskBreakdown
      : {};
  const vendorRisk = Number(breakdown.vendorRisk ?? breakdown.vendor_risk);
  const orgGap = Number(
    breakdown.organizationalReadinessGap ?? breakdown.organizational_readiness_gap,
  );
  const integ = Number(breakdown.integrationRisk ?? breakdown.integration_risk);
  const vts = Number(breakdown.vendorTrustScore ?? breakdown.vendor_trust_score);

  const source =
    report.implementationRiskSource && typeof report.implementationRiskSource === "object"
      ? report.implementationRiskSource
      : {};
  const usedAttestation =
    source.usedAttestation === true ||
    source.used_attestation === true ||
    (Number.isFinite(vts) && vts >= 58);

  const drivers = [
    {
      name: "Integration risk",
      risk: integ,
      weight: 0.3,
      tip: "Reduce system integrations, close requirement gaps, add rollback/monitoring/testing",
    },
    {
      name: "Org readiness gap",
      risk: orgGap,
      weight: 0.35,
      tip: "Raise digital/governance maturity, AI board/policy, and implementation team coverage",
    },
    {
      name: "Vendor risk",
      risk: vendorRisk,
      weight: 0.35,
      tip: "Choose a higher-trust vendor product, or improve vendor attestation evidence",
    },
  ]
    .filter((d) => Number.isFinite(d.risk))
    .sort((a, b) => b.risk * b.weight - a.risk * b.weight);

  const concrete = [];
  if (buyerRow) {
    if (!boolYes(buyerRow.ai_governance_board)) {
      concrete.push("Stand up / confirm an AI governance board");
    }
    if (!boolYes(buyerRow.ai_ethics_policy)) {
      concrete.push("Publish an AI ethics / responsible-AI policy");
    }
    const team = buyerRow.team_composition;
    const teamN = Array.isArray(team) ? team.length : String(team ?? "").trim() ? 1 : 0;
    if (teamN <= 1) {
      concrete.push("Expand the implementation team (roles / ownership)");
    }
    const systems = buyerRow.integrate_system;
    const sysN = Array.isArray(systems) ? systems.length : 0;
    if (sysN >= 3) {
      concrete.push(`Simplify or phase integrations (${sysN} systems listed)`);
    }
    if (String(buyerRow.gap_requirement_product ?? "").trim()) {
      concrete.push("Close documented requirement gaps before full rollout");
    }
    if (String(buyerRow.rollback_capability ?? "").trim().toLowerCase().includes("no")) {
      concrete.push("Define a rollback plan");
    }
    if (!boolYes(buyerRow.vendor_usage_data)) {
      concrete.push("Ensure monitoring data will be available");
    }
    if (!boolYes(buyerRow.testing_results)) {
      concrete.push("Capture / share testing results");
    }
  }

  const bar = "=".repeat(72);
  const lines = [
    "IMPLEMENTATION READINESS SCORE (Type 3) - EXPLAINED",
    bar,
    "",
    "RESULT",
    `  Readiness:   ${Math.round(readiness)} / 100   (higher = more ready to implement)`,
  ];
  if (grade) lines.push(`  Grade:       ${grade}`);
  if (decision) lines.push(`  Decision:    ${decision}`);
  if (profile) lines.push(`  Profile:     ${profile}`);
  if (nextStep) lines.push(`  Next step:   ${nextStep}`);
  lines.push(`  Vendor:      ${vendorLabel}`);
  lines.push(
    "",
    "HOW WE GOT HERE",
    "  Method:   Deterministic readiness formula from buyer answers + vendor trust",
    "  Idea:     Readiness = 100 minus weighted Vendor risk, Org gap, and Integration risk",
    "  Weights:  Vendor risk 35%  |  Org readiness gap 35%  |  Integration risk 30%",
    "",
    "  Risk drivers (higher risk lowers readiness):",
  );
  drivers.forEach((d, idx) => {
    const biggest = idx === 0 ? "  << biggest drag" : "";
    lines.push(
      `    ${idx + 1}. ${d.name.padEnd(22)} ${d.risk.toFixed(2)}  (weight ${Math.round(d.weight * 100)}%)${biggest}`,
    );
  });
  if (Number.isFinite(vts)) {
    lines.push(
      `  Vendor trust used: ${Math.round(vts)}/100  (${usedAttestation ? "from selected product attestation" : "default / limited attestation"})`,
    );
  }
  lines.push("", "WHAT TO IMPROVE (to raise readiness)");
  if (drivers.length > 0) {
    const top = drivers[0];
    lines.push(`  1. Biggest drag: ${top.name} (${top.risk.toFixed(1)}) - ${top.tip}`);
    if (drivers.length > 1) {
      const second = drivers[1];
      lines.push(`  2. ${second.name} (${second.risk.toFixed(1)}) - ${second.tip}`);
    }
  }
  if (concrete.length > 0) {
    lines.push("  3. From your answers, prioritize:");
    for (const item of concrete.slice(0, 8)) {
      lines.push(`       - ${item}`);
    }
  } else if (drivers.length > 2) {
    const third = drivers[2];
    lines.push(`  3. ${third.name} (${third.risk.toFixed(1)}) - ${third.tip}`);
  }
  lines.push("");
  return lines.join("\n");
}

const pool = new pg.Pool({ connectionString });

try {
  const rows = await pool.query(`
    SELECT
      assessment_id,
      vendor_name,
      specific_product,
      ai_governance_board,
      ai_ethics_policy,
      team_composition,
      integrate_system,
      gap_requirement_product,
      rollback_capability,
      vendor_usage_data,
      testing_results,
      vendor_risk_assessment_report
    FROM cots_buyer_assessments
    WHERE vendor_risk_assessment_report IS NOT NULL
  `);

  let copied = 0;
  let rebuilt = 0;

  for (const row of rows.rows) {
    const report = row.vendor_risk_assessment_report;
    const existingJson =
      typeof report?.scoreRationale === "string" ? report.scoreRationale.trim() : "";

    let rationale = existingJson;
    if (!rationale) {
      rationale = buildIrsRationaleFromReport(report, row) ?? "";
    }

    if (!rationale) continue;

    const reportPatched = {
      ...report,
      scoreRationale: rationale,
      scoreRationaleType: "IRS",
    };

    await pool.query(
      `
      UPDATE cots_buyer_assessments
      SET
        score_rationale = $1,
        score_rationale_type = 'IRS',
        vendor_risk_assessment_report = $2::jsonb,
        updated_at = NOW()
      WHERE assessment_id = $3
        AND (
          score_rationale IS NULL
          OR TRIM(score_rationale) = ''
        )
      `,
      [rationale, JSON.stringify(reportPatched), row.assessment_id],
    );

    if (existingJson) copied += 1;
    else rebuilt += 1;
  }

  const after = await pool.query(`
    SELECT COUNT(*)::int AS col_filled
    FROM cots_buyer_assessments
    WHERE score_rationale IS NOT NULL AND TRIM(score_rationale) <> ''
  `);
  console.log(`Backfill complete: ${copied} copied from JSON, ${rebuilt} rebuilt from report data.`);
  console.log(`Rows with score_rationale: ${after.rows[0].col_filled}`);
} catch (err) {
  console.error("Backfill failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
