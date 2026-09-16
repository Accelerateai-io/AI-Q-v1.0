/**
 * Map stored vendor-attestation answers onto VTS formula lookup keys.
 *
 * The questionnaire stores two value styles: newer questions store the formula key
 * directly ("daily_dashboard"), older ones store the display label
 * ("99.9% (8.8 hrs/year)"). Formula lookups are exact-match, so labels have to be
 * translated here or the answer silently scores zero.
 *
 * Keep in sync with python/services/attestation_answer_map.py.
 */

/** Older questions: display label -> formula key. */
export const UPTIME_SLA: Record<string, string> = {
  "99.99% (52 min/year downtime)": "99.99%+",
  "99.95% (4.4 hrs/year)": "99.95-99.99%",
  "99.9% (8.8 hrs/year)": "99.9-99.95%",
  "99.5% (1.8 days/year)": "99.5-99.9%",
  "99.0% (3.7 days/year)": "99.0-99.5%",
  "95.0% (18 days/year)": "95.0-99.0%",
  "< 95% or No SLA": "< 95%",
};

export const DEPLOYMENT_SCALE: Record<string, string> = {
  "Pilot/POC (<100 users)": "pilot",
  "Small Business (<1,000 users)": "small_business",
  "Mid-Market (1,000-10,000 users)": "mid_market",
  "Enterprise single-tenant": "enterprise_single_tenant",
  "Enterprise multi-tenant (10,000+ users)": "enterprise_multi_tenant",
};

export const PRODUCT_STAGE: Record<string, string> = {
  "Design/Planning": "design",
  "Development/Alpha": "development",
  "Beta Testing": "testing",
  "Production (< 1 year)": "production_new",
  "Production Mature (1+ years)": "production_mature",
};

export const ROLLBACK_CAPABILITY: Record<string, string> = {
  "Automated instant rollback": "automated_instant",
  "Automated with manual trigger": "automated_manual_trigger",
  "Manual with documented procedures": "manual_documented",
  "Manual without documentation": "manual_undocumented",
  "No rollback capability": "none",
};

/** Ordered strongest -> weakest; human_oversight is multi-select, take the strongest. */
const HUMAN_OVERSIGHT_RANKED: [string, string][] = [
  ["Human-in-the-loop for all decisions", "always_in_loop"],
  ["Human monitoring with intervention", "monitoring_with_intervention"],
  ["Alert system for edge cases", "monitoring_only"],
  ["Audit logs for review", "monitoring_only"],
  ["Feedback mechanisms for users", "monitoring_only"],
  ["No specific oversight mechanisms", "none"],
];

/** Canonical vocabulary is calculateConfidenceFactor's (it throws on unknown values). */
export const ASSESSMENT_METHOD: Record<string, string> = {
  "Third-party independent audit": "third_party_audit",
  "Third-party review (not full audit)": "third_party_review",
  "Internal audit by compliance team": "internal_audit",
  "Self-reported with verification": "self_reported_verified",
  "Self-reported without verification": "self_reported_unverified",
};

export const AUDIT_FREQUENCY: Record<string, string> = {
  Quarterly: "annual",
  "Bi-annually": "annual",
  Annually: "annual",
  "Every 2 years": "bi_annual",
  "As required by regulators/customers": "ad_hoc",
  "Not independently audited": "ad_hoc",
};

export const INCIDENT_RESPONSE_PLAN_MATURITY: Record<string, string> = {
  "Yes, tested quarterly": "tested_annually",
  "Yes, tested annually": "tested_annually",
  "Yes, documented but not tested": "documented_not_tested",
  "In development": "basic_runbook",
};

export const PII_STAKE_LEVEL: Record<string, string> = {
  "No PII (Anonymous data only)": "Low",
  "Minimal (Non-sensitive identifiers)": "Low",
  "Moderate (Names, emails, addresses)": "Moderate",
  "Extensive (Financial data, SSN, health info)": "High",
  "Critical (PHI, biometric data, children's data)": "Critical",
};

export const PII_HANDLING: Record<string, string> = {
  "No PII (Anonymous data only)": "none",
  "Minimal (Non-sensitive identifiers)": "minimal",
  "Moderate (Names, emails, addresses)": "moderate",
  "Extensive (Financial data, SSN, health info)": "extensive",
  "Critical (PHI, biometric data, children's data)": "critical",
};

/**
 * Newer questions store snake_case keys already, but on a different scale than the
 * formula's; both lists are ordinal so they map position-for-position.
 */
export const DEPLOYMENT_CUSTOMIZATION: Record<string, string> = {
  none: "off_the_shelf",
  configuration_only: "lightly_customized",
  light_customization: "moderately_customized",
  significant_customization: "heavily_customized",
  heavy_custom_development: "fully_custom",
};

export const INTEGRATION_COMPLEXITY: Record<string, string> = {
  none: "standalone",
  simple: "simple_api",
  standard: "moderate_integration",
  complex: "complex_integration",
  highly_complex: "legacy_systems",
};

export function asAnswer(value: unknown): string {
  return String(value ?? "").trim();
}

/** Exact match, then case-insensitive, then the key itself if already canonical. */
export function lookup(table: Record<string, string>, value: unknown, fallback: string): string {
  const answer = asAnswer(value);
  if (!answer) return fallback;
  if (table[answer]) return table[answer];
  const lowered = answer.toLowerCase();
  for (const [key, mapped] of Object.entries(table)) {
    if (key.toLowerCase() === lowered) return mapped;
  }
  const values = Object.values(table);
  if (values.includes(answer)) return answer;
  if (values.includes(lowered)) return lowered;
  return fallback;
}

/** For questions whose stored values are already formula keys. */
export function passthrough(value: unknown, allowed: string[], fallback: string): string {
  const answer = asAnswer(value).toLowerCase();
  return allowed.includes(answer) ? answer : fallback;
}

export function strongestHumanOversight(value: unknown): string {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const chosen = new Set(selected.map(asAnswer).filter(Boolean));
  if (chosen.size === 0) return "none";
  for (const [label, key] of HUMAN_OVERSIGHT_RANKED) {
    if (chosen.has(label)) return key;
  }
  return "none";
}

export function yesNo(value: unknown, fallback: boolean | null = null): boolean | null {
  const answer = asAnswer(value).toLowerCase();
  if (["yes", "true", "y"].includes(answer)) return true;
  if (["no", "false", "n"].includes(answer)) return false;
  return fallback;
}

export function decisionAutonomyLevel(value: unknown): string {
  const answer = asAnswer(value).toLowerCase();
  if (answer.includes("fully") && answer.includes("autonom")) return "fully_autonomous";
  if (answer.includes("autonom")) return "autonomous";
  if (answer.includes("assist")) return "assisted";
  if (answer.includes("advis")) return "advisory";
  return "supervised";
}

export function toNumber(value: unknown, fallback: number | null = null): number | null {
  const n = Number(asAnswer(value));
  return Number.isFinite(n) ? n : fallback;
}

// --- Cross-field guards (AIQ-078, interim) ---------------------------------------
// Two question pairs overlap: the incident_response_plan ladder already encodes the
// test cadence that ir_plan_test_frequency asks again, and adversarial_security_testing
// already claims what independent_pen_test_frequency asks again. Both halves of each
// pair now feed the score, so contradictory answers must resolve to the weaker claim
// instead of earning points from both sides. A blank answer is not a claim and never
// downgrades the other half.

const IR_TESTING_CLAIMS = new Set(["quarterly_drills", "annual_test"]);

/** Returns [incidentResponsePlanMaturity, planTesting], contradictions downgraded. */
export function reconcileIrPlan(
  planAnswer: unknown,
  frequencyAnswer: unknown,
): [string | null, string] {
  let maturity: string | null =
    lookup(INCIDENT_RESPONSE_PLAN_MATURITY, planAnswer, "") || null;
  let testing = passthrough(
    frequencyAnswer,
    ["quarterly_drills", "annual_test", "documented_untested"],
    "",
  );
  const planClaimsTested = maturity === "tested_annually";
  if (planClaimsTested && testing === "documented_untested") {
    maturity = "documented_not_tested";
  }
  if (IR_TESTING_CLAIMS.has(testing) && asAnswer(planAnswer) && !planClaimsTested) {
    testing = "documented_untested";
  }
  return [maturity, testing || "documented_untested"];
}

const PEN_TEST_CADENCE_CLAIMS = new Set(["continuous", "quarterly", "annually", "ad_hoc"]);
const SECURITY_TESTING_DENIALS = new Set(["no testing conducted", "planned but not completed"]);

/**
 * Returns [penetrationTestReportAvailable, independentPenTestFrequency].
 *
 * Only a "Yes, ..." security-testing answer counts as a completed test — bare text
 * is not evidence — and an explicit denial cancels any pen-test cadence credit.
 */
export function reconcilePenTesting(
  securityTestingAnswer: unknown,
  cadenceAnswer: unknown,
): [boolean, string] {
  const testing = asAnswer(securityTestingAnswer).toLowerCase();
  let cadence = asAnswer(cadenceAnswer).toLowerCase();
  if (SECURITY_TESTING_DENIALS.has(testing) && PEN_TEST_CADENCE_CLAIMS.has(cadence)) {
    cadence = "none";
  }
  const reportAvailable = testing.startsWith("yes") || PEN_TEST_CADENCE_CLAIMS.has(cadence);
  return [reportAvailable, cadence];
}