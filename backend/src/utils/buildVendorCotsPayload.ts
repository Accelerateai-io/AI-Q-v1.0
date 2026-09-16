/** Map API (camelCase or snake_case) to cots_vendor_assessments columns. */

const INTEGRATION_BANDS = [
  "Standalone - No Integrations Required",
  "Simple - Single System Integration (e.g., SSO only)",
  "Moderate - 2-3 System Integrations",
  "Complex - 4-6 System Integrations",
  "Very Complex - 7+ System Integrations or Legacy Systems",
] as const;

function get(body: Record<string, unknown>, camel: string, snake: string): unknown {
  if (body[camel] !== undefined) return body[camel];
  if (body[snake] !== undefined) return body[snake];
  return undefined;
}

function asString(v: unknown, max?: number): string | null {
  if (v == null) return null;
  const s = String(v);
  if (!s.trim()) return null;
  return max != null ? s.slice(0, max) : s;
}

function parseJson(v: unknown): unknown {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return v;
    }
  }
  return v;
}

function stringList(v: unknown): string[] | null {
  const parsed = parseJson(v);
  if (parsed == null) return null;
  if (Array.isArray(parsed)) return parsed.map((x) => String(x));
  if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
  return null;
}

function isNoneChip(value: string): boolean {
  return /^(none(\b|\/)|no public evidence|no signal)/i.test(value.trim());
}

function deriveIntegrationComplexity(systems: string[] | null, fallback: string | null): string | null {
  if (!systems || systems.length === 0) return fallback;
  const named = systems.filter((s) => s.trim() && !isNoneChip(s));
  const n = named.length;
  if (n === 0) return INTEGRATION_BANDS[0];
  if (n === 1) return INTEGRATION_BANDS[1];
  if (n <= 3) return INTEGRATION_BANDS[2];
  if (n <= 6) return INTEGRATION_BANDS[3];
  return INTEGRATION_BANDS[4];
}

function competitorsToLegacyText(rows: unknown): string | null {
  if (!Array.isArray(rows)) return null;
  const names = rows
    .map((row) => {
      if (row && typeof row === "object" && "name" in row) {
        return String((row as { name?: unknown }).name ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
  return names.length ? names.join("; ") : null;
}

function advantagesToLegacyText(rows: unknown): string | null {
  if (!Array.isArray(rows)) return null;
  const phrases = rows
    .map((row) => {
      if (row && typeof row === "object") {
        const r = row as { advantage?: unknown; text?: unknown };
        return String(r.advantage ?? r.text ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
  return phrases.length ? phrases.join(", ") : null;
}

export function buildVendorCotsPayload(body: Record<string, unknown>) {
  const selectedProduct = get(body, "selectedProductId", "selected_product_id");
  const vendorAttestationAlt = get(body, "vendorAttestationId", "vendor_attestation_id");
  const resolvedAttestationId = (() => {
    const a = selectedProduct != null ? String(selectedProduct).trim() : "";
    if (a) return a;
    const b = vendorAttestationAlt != null ? String(vendorAttestationAlt).trim() : "";
    return b || null;
  })();

  const likelySystems = stringList(
    get(body, "likelyIntegrationSystems", "likely_integration_systems"),
  );
  const competitors = parseJson(get(body, "competitors", "competitors"));
  const keyAdvantagesRows = parseJson(get(body, "keyAdvantagesRows", "key_advantages_rows"));
  const fallbackComplexity = asString(
    get(body, "integrationComplexity", "integration_complexity"),
    100,
  );
  const legacyAlts = asString(get(body, "alternativesConsidered", "alternatives_considered"));
  const legacyAdv = asString(get(body, "keyAdvantages", "key_advantages"));

  return {
    vendor_attestation_id: resolvedAttestationId,
    customer_organization_name: asString(
      get(body, "customerOrganizationName", "customer_organization_name"),
      200,
    ),
    customer_sector: asString(get(body, "customerSector", "customer_sector"), 200),
    primary_pain_point: asString(get(body, "primaryPainPoint", "primary_pain_point")),
    expected_outcomes: asString(get(body, "expectedOutcomes", "expected_outcomes")),
    customer_budget_range: asString(get(body, "customerBudgetRange", "customer_budget_range"), 100),
    implementation_timeline: asString(
      get(body, "implementationTimeline", "implementation_timeline"),
      100,
    ),
    product_features: parseJson(get(body, "productFeatures", "product_features")),
    implementation_approach: asString(
      get(body, "implementationApproach", "implementation_approach"),
      100,
    ),
    customization_level: asString(get(body, "customizationLevel", "customization_level"), 100),
    integration_complexity: deriveIntegrationComplexity(likelySystems, fallbackComplexity),
    regulatory_requirements: parseJson(
      get(body, "regulatoryRequirements", "regulatory_requirements"),
    ),
    regulatory_requirements_other: asString(
      get(body, "regulatoryRequirementsOther", "regulatory_requirements_other"),
      300,
    ),
    data_sensitivity: asString(get(body, "dataSensitivity", "data_sensitivity"), 100),
    customer_risk_tolerance: asString(
      get(body, "customerRiskTolerance", "customer_risk_tolerance"),
      100,
    ),
    alternatives_considered: competitorsToLegacyText(competitors) ?? legacyAlts,
    key_advantages: advantagesToLegacyText(keyAdvantagesRows) ?? legacyAdv,
    customer_specific_risks: parseJson(
      get(body, "customerSpecificRisks", "customer_specific_risks"),
    ),
    customer_specific_risks_other: asString(
      get(body, "customerSpecificRisksOther", "customer_specific_risks_other"),
      300,
    ),
    identified_risks: asString(get(body, "identifiedRisks", "identified_risks")),
    risk_domain_scores: asString(get(body, "riskDomainScores", "risk_domain_scores")),
    contextual_multipliers: asString(
      get(body, "contextualMultipliers", "contextual_multipliers"),
    ),
    risk_mitigation: asString(get(body, "riskMitigation", "risk_mitigation")),
    customer_employee_count: asString(
      get(body, "customerEmployeeCount", "customer_employee_count"),
      20,
    ),
    customer_eng_headcount: asString(
      get(body, "customerEngHeadcount", "customer_eng_headcount"),
      20,
    ),
    customer_annual_revenue: asString(
      get(body, "customerAnnualRevenue", "customer_annual_revenue"),
      20,
    ),
    customer_ownership: asString(get(body, "customerOwnership", "customer_ownership"), 30),
    customer_hq_country: asString(get(body, "customerHqCountry", "customer_hq_country"), 60),
    customer_operating_regions: parseJson(
      get(body, "customerOperatingRegions", "customer_operating_regions"),
    ),
    customer_certifications: parseJson(
      get(body, "customerCertifications", "customer_certifications"),
    ),
    customer_regulators: parseJson(get(body, "customerRegulators", "customer_regulators")),
    customer_public_incident: asString(
      get(body, "customerPublicIncident", "customer_public_incident"),
      30,
    ),
    customer_cloud_provider: asString(
      get(body, "customerCloudProvider", "customer_cloud_provider"),
      30,
    ),
    customer_identity_provider: asString(
      get(body, "customerIdentityProvider", "customer_identity_provider"),
      30,
    ),
    customer_scm_platform: asString(get(body, "customerScmPlatform", "customer_scm_platform"), 30),
    customer_incumbent_ai_tooling: parseJson(
      get(body, "customerIncumbentAiTooling", "customer_incumbent_ai_tooling"),
    ),
    likely_integration_systems: likelySystems,
    customer_ai_maturity_evidence: parseJson(
      get(body, "customerAiMaturityEvidence", "customer_ai_maturity_evidence"),
    ),
    customer_ai_leadership: asString(
      get(body, "customerAiLeadership", "customer_ai_leadership"),
      40,
    ),
    customer_public_ai_policy: asString(
      get(body, "customerPublicAiPolicy", "customer_public_ai_policy"),
      40,
    ),
    opportunity_type: asString(get(body, "opportunityType", "opportunity_type"), 40),
    target_user_function: parseJson(get(body, "targetUserFunction", "target_user_function")),
    estimated_users_in_scope: asString(
      get(body, "estimatedUsersInScope", "estimated_users_in_scope"),
      20,
    ),
    competitors,
    build_vs_buy_signal: asString(get(body, "buildVsBuySignal", "build_vs_buy_signal"), 80),
    key_advantages_rows: keyAdvantagesRows,
    information_basis: parseJson(get(body, "informationBasis", "information_basis")),
    answer_confidence: asString(get(body, "answerConfidence", "answer_confidence"), 80),
    research_date: asString(get(body, "researchDate", "research_date"), 10),
  };
}
