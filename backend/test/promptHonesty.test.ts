/**
 * PROMPT 6 — report honesty rules. One or more assertions per rule; each would
 * fail if the rule regressed. Run: npm run test:honesty (node --import tsx --test).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateRoiFromAssessment, parseDollarAmount } from "../src/services/roiCalculator.js";
import {
  storedIrsFromReport,
  recommendationFromStoredIrs,
} from "../src/controllers/agents/implementationRiskAssessmentReportAgent.js";
import { fallbackPayload } from "../src/controllers/agents/complianceRiskSummaryReportAgent.js";
import { fallbackFromCompleteReport } from "../src/controllers/agents/mitigationActionPlanReportAgent.js";
import {
  parseReportSections,
  buildSummaryFromAssessmentData,
} from "../src/controllers/agents/vendorAttestation.js";
import { VENDOR_COTS_REPORT_PROMPT } from "../src/controllers/agents/vendorCotsReportAgent.js";
import { canAccessOrgAttestation } from "../src/utils/attestationAccess.js";

// --- Rule 1a: ROI section is hidden (null) when the customer supplied no inputs ---
test("ROI is null without customer inputs", () => {
  assert.equal(calculateRoiFromAssessment({}), null);
  assert.equal(
    calculateRoiFromAssessment({ customer_budget_range: "$1m" }),
    null,
    "a budget alone is not enough to show ROI",
  );
});

// --- Rule 1b: no "PA pilot" fabrication anywhere in ROI output ---
test("ROI output contains no PA pilot defaults", () => {
  const roi = calculateRoiFromAssessment({
    time_saved_per_employee_minutes: 60,
    target_users: 1000,
    average_hourly_cost_dollars: 50,
    customer_budget_range: "$100k - $250k",
  });
  assert.ok(roi, "ROI should compute when all inputs are present");
  const blob = JSON.stringify(roi).toLowerCase();
  assert.ok(!blob.includes("pa pilot"), "no PA pilot text");
  assert.ok(!blob.includes("pilot program"), "no pilot program text");
  assert.equal(roi!.timeSavedSource, "Source: customer-provided inputs");
});

// --- Rule 1c: dollar-range parser cases ---
test("parseDollarAmount handles ranges and suffixes", () => {
  assert.equal(parseDollarAmount("$100k - $250k"), 175_000);
  assert.equal(parseDollarAmount("$500k - $1m"), 750_000);
  assert.equal(parseDollarAmount("$13.2M"), 13_200_000);
  assert.equal(parseDollarAmount("$13,200,000"), 13_200_000);
  assert.equal(parseDollarAmount("$500k"), 500_000);
  assert.equal(parseDollarAmount(""), null);
});

// --- Rule 3a: IRS report headline comes from the stored IRS, not a fabricated base ---
test("IRS headline equals the stored IRS and maps the decision deterministically", () => {
  assert.equal(storedIrsFromReport({ overallRiskScore: 42 }), 42);
  assert.ok(Number.isNaN(storedIrsFromReport({})), "missing stored score is NaN, not a fabricated default");
  assert.equal(recommendationFromStoredIrs(80), "Proceed");
  assert.equal(recommendationFromStoredIrs(60), "Proceed with conditions");
  assert.equal(recommendationFromStoredIrs(30), "Defer");
  assert.equal(recommendationFromStoredIrs(Number.NaN), "Defer");
});

// --- Rule 3b: compliance fallback carries isFallback and no fabricated rows ---
test("compliance fallback is marked and carries no generic risk/mapping rows", () => {
  const fb = fallbackPayload({ overallRiskScore: 50, executiveSummary: "x" }, "");
  assert.equal(fb.isFallback, true);
  assert.equal(fb.topRisks.length, 0);
  assert.equal(fb.complianceMapping.length, 0);
});

// --- Rule 3c: mitigation fallback is marked and has no "Control strengthening" filler ---
test("mitigation fallback is marked and never pads with filler rows", () => {
  const fb = fallbackFromCompleteReport({ recommendations: [{ title: "Do X", description: "y" }] });
  assert.equal(fb.isFallback, true);
  for (const a of fb.actions) {
    assert.ok(!/control strengthening/i.test(a.title), `no filler row: ${a.title}`);
  }
  const empty = fallbackFromCompleteReport({ recommendations: [] });
  assert.equal(empty.actions.length, 0, "no recommendations => no fabricated actions");
});

// --- Rule 5a: section id<->title alignment (certs do NOT land under Operations & Support) ---
test("attestation parser keeps certifications under Compliance & Certifications", () => {
  const reply = [
    "## 8. Compliance & Certifications",
    "- **Certifications:** SOC 2 Type 2, ISO 27001",
    "",
    "## 9. Operations & Support",
    "- **Uptime SLA:** 99.9%",
  ].join("\n");
  const { sections } = parseReportSections(reply);
  const s8 = sections.find((s) => s.id === 8);
  const s9 = sections.find((s) => s.id === 9);
  assert.equal(s8?.title, "Compliance & Certifications");
  assert.equal(s9?.title, "Operations & Support");
});

// --- Rule 5b: fallback vendor summary is score-based or "Summary unavailable", never canned ---
test("vendor fallback summary is score-based, not a canned moderate posture", () => {
  const none = buildSummaryFromAssessmentData({}, 0);
  assert.ok(none.includes("Summary unavailable"));
  const strong = buildSummaryFromAssessmentData({ vendor_name: "Acme" }, 85);
  assert.ok(strong.includes("85/100"));
  assert.ok(strong.includes("strong"));
  assert.ok(!/moderate overall trust posture/i.test(strong), "no canned moderate posture");
});

// --- Rule 2 + 4: branding + seeded-conclusion removed from the COTS report prompt ---
test("COTS report prompt is rebranded and no longer seeds a score or conclusion", () => {
  assert.ok(!/AI EVAL/.test(VENDOR_COTS_REPORT_PROMPT), "no AI EVAL branding");
  // The old prompt INSTRUCTED the model to include a seeded "low risk / proceed"
  // conclusion; that instruction must be gone. (The phrases may still appear as
  // explicit negative examples of what NOT to write.)
  assert.ok(
    !/risk conclusion \(e\.g\. low overall risk/i.test(VENDOR_COTS_REPORT_PROMPT),
    "seeded risk-conclusion instruction removed",
  );
  assert.ok(
    !/brief recommendation \(e\.g\. recommend proceeding/i.test(VENDOR_COTS_REPORT_PROMPT),
    "seeded recommendation instruction removed",
  );
  assert.ok(/do not pre-judge the outcome/i.test(VENDOR_COTS_REPORT_PROMPT), "narrative guard present");
  assert.ok(/do not output a numeric overall risk score/i.test(VENDOR_COTS_REPORT_PROMPT));
});

// --- Rule 8: a teammate in the owning org can act on the attestation ---
test("org members (not just the author) may access an attestation", () => {
  // same org, different user => teammate allowed
  assert.equal(canAccessOrgAttestation("5", 999, "5", 1), true);
  // original author always allowed
  assert.equal(canAccessOrgAttestation("5", 1, "6", 1), true);
  // different org and not the author => denied
  assert.equal(canAccessOrgAttestation("5", 999, "6", 1), false);
  // no org on the attestation and not the author => denied
  assert.equal(canAccessOrgAttestation(null, 999, "5", 1), false);
});
