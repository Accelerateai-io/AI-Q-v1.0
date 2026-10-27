/**
 * PROMPT 5 — fix(scoring-integrity): no fake or silent scores.
 * Run: npx tsx --test backend/test/scoringIntegrity.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ScoringUnavailableError,
  isScoringUnavailableError,
} from "../src/utils/scoringUnavailable.js";
import { buildScsScoreTrace } from "../src/services/scsScoreTrace.js";
import { SCORING_VERSION as DISPLAY_SCORING_VERSION } from "../src/lib/scoringVersion.js";

const here = dirname(fileURLToPath(import.meta.url));
const src = (p: string) => readFileSync(join(here, "..", "src", p), "utf8");

test("scorer failure surfaces as unavailable (never a 50/B neutral fallback)", () => {
  const err = new ScoringUnavailableError("Python buyer IRS formula failed", "scorer_failed");
  assert.equal(isScoringUnavailableError(err), true);
  assert.equal(err.reason, "scorer_failed");
  assert.equal(isScoringUnavailableError(new Error("x")), false);

  // The fabricated fallbacks must be gone from both agents.
  const buyer = src("controllers/agents/buyerVendorRiskReportAgent.ts");
  const vendor = src("controllers/agents/vendorCotsReportAgent.ts");
  // Match the fallback ASSIGNMENTS (not explanatory comments that name them).
  assert.ok(!/scoring_version:\s*"irs-node-1\.0"/.test(buyer), "buyer Node IRS fallback removed");
  assert.ok(!/scoring_version:\s*"irs-fallback"/.test(buyer), "buyer neutral IRS fallback removed");
  assert.ok(!/implementationRiskScore:\s*50\b/.test(buyer), "no fixed 50 IRS fallback");
  assert.ok(!/scoring_version:\s*"srs-node-1\.0"/.test(vendor), "vendor Node SRS fallback removed");
  // Both agents route unavailability through the shared error type.
  assert.ok(buyer.includes("ScoringUnavailableError"));
  assert.ok(vendor.includes("ScoringUnavailableError"));
});

test("score trace reads the STORED formula version, not the 1.2.0 constant", () => {
  const base = {
    storedSalesRisk: 40,
    customerFrictionRisk: 30,
    implementationRisk: 40,
    competitiveRisk: 50,
    assessmentId: "test-assessment",
  };
  const withStored = buildScsScoreTrace({ ...base, scoringVersion: "scs-2.0" });
  assert.equal(withStored.scoringVersion, "scs-2.0");

  // When no stored version is supplied it falls back to the display constant.
  const withoutStored = buildScsScoreTrace(base);
  assert.equal(withoutStored.scoringVersion, DISPLAY_SCORING_VERSION);
  assert.equal(DISPLAY_SCORING_VERSION, "1.2.0");
});

test("a failed report can be regenerated (authenticated, org-scoped endpoint is wired)", async () => {
  const vendorMod = await import("../src/controllers/vendorcots/submitVendorCots.controller.js");
  const buyerMod = await import("../src/controllers/buyercots/submitBuyerCots.controller.js");
  assert.equal(typeof vendorMod.regenerateVendorCotsReport, "function");
  assert.equal(typeof buyerMod.regenerateBuyerVendorRiskReport, "function");

  const routes = src("routes/assessment.routes.ts");
  assert.ok(routes.includes('/vendorCotsAssessment/:id/regenerate'));
  assert.ok(routes.includes('/buyerCotsAssessment/:id/regenerate'));
  // Both regenerate routes are behind auth.
  assert.ok(/\/vendorCotsAssessment\/:id\/regenerate",\s*authenticateToken/.test(routes));
  assert.ok(/\/buyerCotsAssessment\/:id\/regenerate",\s*authenticateToken/.test(routes));
});

test("insufficient_data is a distinct, non-retryable reason (carries which areas are missing)", () => {
  const err = new ScoringUnavailableError(
    "insufficient",
    "insufficient_data",
    undefined,
    {
      classification: "Insufficient data — 1 of 3 areas answered",
      pillarsMeasured: 1,
      pillarsTotal: 3,
      unmeasuredAreas: ["Customer friction", "Implementation"],
    },
  );
  assert.equal(err.reason, "insufficient_data");
  assert.deepEqual(err.details?.unmeasuredAreas, ["Customer friction", "Implementation"]);

  // Controllers branch on the reason: insufficient_data => report_status
  // "insufficient_data" (not "failed"), so the UI offers "complete answers", not Retry.
  const vendorCtl = src("controllers/vendorcots/submitVendorCots.controller.ts");
  const buyerCtl = src("controllers/buyercots/submitBuyerCots.controller.ts");
  assert.ok(/reason === "insufficient_data"/.test(vendorCtl));
  assert.ok(vendorCtl.includes('reportStatus = "insufficient_data"'));
  assert.ok(vendorCtl.includes('reportStatus = "failed"'));
  assert.ok(/reason === "insufficient_data"/.test(buyerCtl));

  // The pillar client maps Python's insufficient_data into the typed error.
  const client = src("services/pythonScoringClient.ts");
  assert.ok(client.includes('"insufficient_data"'));
  assert.ok(client.includes("unmeasuredAreas"));
});

test("insufficient-data report can be completed via reopen-for-edit (auth, org-scoped, audit-logged)", async () => {
  const vendorMod = await import("../src/controllers/vendorcots/submitVendorCots.controller.js");
  const buyerMod = await import("../src/controllers/buyercots/submitBuyerCots.controller.js");
  assert.equal(typeof vendorMod.reopenVendorCotsForEdit, "function");
  assert.equal(typeof buyerMod.reopenBuyerCotsForEdit, "function");

  const routes = src("routes/assessment.routes.ts");
  assert.ok(/\/vendorCotsAssessment\/:id\/reopen-for-edit",\s*authenticateToken/.test(routes));
  assert.ok(/\/buyerCotsAssessment\/:id\/reopen-for-edit",\s*authenticateToken/.test(routes));

  // Reopen sets the assessment back to draft and writes an audit-log row.
  const vendorCtl = src("controllers/vendorcots/submitVendorCots.controller.ts");
  assert.ok(vendorCtl.includes('status: "draft"'));
  assert.ok(vendorCtl.includes("assessmentUserArchiveLog"));
  assert.ok(vendorCtl.includes('action: "reopen_for_edit"'));
  // Org-scoped: the reopen verifies organization_id before mutating.
  assert.ok(/reopenVendorCotsForEdit[\s\S]*organization_id/.test(vendorCtl));
});
