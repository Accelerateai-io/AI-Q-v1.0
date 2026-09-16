/**
 * VTS Factor Explanations
 *
 * Builds factor-level explanations from calculateVendorTrustScore output.
 * Stored in generated_profile_reports.report.trustScore.factorExplanations.
 *
 * IMPORTANT:
 * - Does NOT change any scoring math — reads formula output only.
 * - internalOnly: false → safe to return to vendors.
 * - internalOnly: true  → internal operators only.
 */

export interface FactorExplanation {
  category: "Product" | "Governance" | "Operational";
  factor: string;
  status: "present" | "missing" | "weak" | "strong";
  maxPoints: number;
  awardedPoints: number;
  deduction: number;
  vendorAnswer: string;
  reason: string;
  improvement: string;
  estimatedLift: number;
  evidenceSource: "Vendor Attestation";
  internalOnly: boolean;
}

// ─── Shapes that mirror calculateVendorTrustScore return (relevant fields only) ─

interface CertScore {
  soc2_points: number;
  hipaa_points: number;
  iso_27001_points: number;
  iso_42001_points: number;
  value: number;
  certifications_cap: number;
}
interface AqScore    { method_base: number; frequency_bonus: number; value: number }
interface PolicyScore {
  data_retention_points: number;
  incident_response_points: number;
  privacy_policy_points: number;
  ai_ethics_points: number;
  value: number;
}
interface DataProtectionScore {
  encryption_points: number;
  tls_points: number;
  data_subject_rights_points: number;
  value: number;
}
interface SupplyChainScore { named_count?: number; detailed_count?: number; value: number }
interface AdversarialDisclosureScore { vdp_points: number; bug_bounty_points: number; value: number }
interface DpaScore { dpa_status?: string | null; value: number }
interface OpsCtrlScore { rollback_points: number; oversight_points: number; monitoring_points: number; version_control_points: number; value: number }
interface MatScore     { company_age_years: number; value: number }
interface SlaScore     { uptime_points: number; response_time_points: number; resolution_time_points: number; value: number }
interface IncidentScore { plan_points: number; automation_points: number; communication_points: number; value: number }
interface DeployScore  { scale_points: number; production_readiness_points: number; multi_tenancy_points: number; value: number }
interface StabilityScore { company_age_years: number; company_age_points: number; financial_health_points: number; customer_retention_points: number; value: number }
interface SupportScore { support_tier_points: number; coverage_points: number; expertise_points: number; value: number }
interface GrDetail {
  certifications_score: CertScore;
  assessment_quality_score: AqScore;
  policy_score: PolicyScore;
  operational_controls_score: OpsCtrlScore;
  vendor_maturity_adjustment: MatScore;
  data_protection_score?: DataProtectionScore;
  supply_chain_score?: SupplyChainScore;
  adversarial_disclosure_score?: AdversarialDisclosureScore;
  dpa_score?: DpaScore;
  governance_score: number;
}
interface OrDetail {
  sla_score: SlaScore;
  incident_management_score: IncidentScore;
  deployment_maturity_score: DeployScore;
  stability_score: StabilityScore;
  support_score: SupportScore;
  operational_score: number;
}
interface WithValue { value: number }

export interface VtsFormulaResult {
  vendor_trust_score: number;
  product_risk: number;
  governance_risk: number;
  operational_risk: number;
  detail: {
    governance_risk: GrDetail;
    operational_risk: OrDetail;
    product_risk: {
      confidence_factor: WithValue;
      mitigation_effectiveness: WithValue;
    };
  };
}

/**
 * Rebuild factor explanations from stored formula_detail (or scoringResult.detail).
 * Used when report.trustScore.factorExplanations was never persisted (older reports,
 * CSV import path, or buildFactorExplanations failed at generation time).
 */
export function rebuildFactorExplanationsFromStoredDetail(opts: {
  storedTrustScore: number;
  productRisk: number | null;
  governanceRisk: number | null;
  operationalRisk: number | null;
  formulaDetail: unknown;
  formulaInput?: Record<string, unknown>;
}): FactorExplanation[] {
  const detail =
    opts.formulaDetail != null &&
    typeof opts.formulaDetail === "object" &&
    !Array.isArray(opts.formulaDetail)
      ? (opts.formulaDetail as Record<string, unknown>)
      : null;
  if (!detail) return [];

  const gr = detail.governance_risk;
  const or = detail.operational_risk;
  const pr = detail.product_risk;
  if (!gr || typeof gr !== "object" || !or || typeof or !== "object" || !pr || typeof pr !== "object") {
    return [];
  }

  const productRisk =
    opts.productRisk != null && Number.isFinite(opts.productRisk)
      ? opts.productRisk
      : Number(
          (pr as Record<string, unknown>).value ??
            ((pr as Record<string, unknown>).product_risk as Record<string, unknown> | undefined)?.value ??
            0,
        );
  const governanceRisk =
    opts.governanceRisk != null && Number.isFinite(opts.governanceRisk)
      ? opts.governanceRisk
      : Number((gr as Record<string, unknown>).value ?? 0);
  const operationalRisk =
    opts.operationalRisk != null && Number.isFinite(opts.operationalRisk)
      ? opts.operationalRisk
      : Number((or as Record<string, unknown>).value ?? 0);

  try {
    return buildFactorExplanations(
      {
        vendor_trust_score: opts.storedTrustScore,
        product_risk: productRisk,
        governance_risk: governanceRisk,
        operational_risk: operationalRisk,
        detail: {
          governance_risk: gr as GrDetail,
          operational_risk: or as OrDetail,
          product_risk: pr as VtsFormulaResult["detail"]["product_risk"],
        },
      },
      opts.formulaInput ?? {},
    );
  } catch {
    return [];
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mkFactor(
  category: FactorExplanation["category"],
  factorName: string,
  maxPoints: number,
  awardedPoints: number,
  vendorAnswer: string,
  reason: string,
  improvement: string,
  internalOnly: boolean,
): FactorExplanation {
  const awarded = Math.max(0, Math.round(awardedPoints * 100) / 100);
  const deduction = Math.max(0, maxPoints - awarded);
  const status: FactorExplanation["status"] =
    awarded === 0 ? "missing"
    : awarded >= maxPoints ? "strong"
    : awarded >= maxPoints * 0.6 ? "present"
    : "weak";
  return {
    category, factor: factorName, status,
    maxPoints, awardedPoints: awarded, deduction,
    vendorAnswer: vendorAnswer || "Not specified",
    reason, improvement,
    estimatedLift: deduction,
    evidenceSource: "Vendor Attestation",
    internalOnly,
  };
}

function strGet(input: Record<string, unknown>, key: string): string {
  return String(input[key] ?? "").trim() || "Not specified";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildFactorExplanations(
  formula: VtsFormulaResult,
  input: Record<string, unknown>,
): FactorExplanation[] {
  const explanations: FactorExplanation[] = [];

  const GR       = formula.detail?.governance_risk;
  const OR       = formula.detail?.operational_risk;
  const PR       = formula.detail?.product_risk;
  if (!GR || !OR || !PR) return explanations;

  const cert     = GR.certifications_score;
  const aq       = GR.assessment_quality_score;
  const policy   = GR.policy_score;
  const opsCtrl  = GR.operational_controls_score;
  const mat      = GR.vendor_maturity_adjustment;
  const sla      = OR.sla_score;
  const incident = OR.incident_management_score;
  const deploy   = OR.deployment_maturity_score;
  const stab     = OR.stability_score;
  const support  = OR.support_score;
  if (!cert || !aq || !policy || !opsCtrl || !mat || !sla || !incident || !deploy || !stab || !support) {
    return explanations;
  }

  // ── Governance: Certifications ─────────────────────────────────────────────

  explanations.push(mkFactor("Governance", "SOC 2 Certification", 15, cert.soc2_points,
    cert.soc2_points === 15 ? "SOC 2 Type 2 (certified)"
      : cert.soc2_points === 8 ? "SOC 2 Type 1 (certified)"
      : "Not provided",
    cert.soc2_points === 15 ? "SOC 2 Type 2 certification confirmed — maximum points awarded."
      : cert.soc2_points === 8 ? "SOC 2 Type 1 detected. Type 2 provides stronger assurance and scores higher."
      : "No SOC 2 certification was detected in attestation data.",
    cert.soc2_points >= 15 ? "No action needed."
      : cert.soc2_points === 8 ? "Upgrade to SOC 2 Type 2 to gain additional points. Upload the audit report."
      : "Obtain SOC 2 Type 2 certification and upload the audit report.",
    false,
  ));

  explanations.push(mkFactor("Governance", "ISO 27001 Information Security", 10, cert.iso_27001_points,
    cert.iso_27001_points === 10 ? "ISO 27001:2022 certified (third-party verified)"
      : cert.iso_27001_points === 5 ? "ISO 27001:2022 self-attested"
      : "Not provided",
    cert.iso_27001_points === 10 ? "ISO 27001:2022 certified — maximum points."
      : cert.iso_27001_points === 5 ? "ISO 27001:2022 self-attested. Upload a certificate for full credit."
      : "No ISO 27001 certification detected.",
    cert.iso_27001_points >= 10 ? "No action needed."
      : cert.iso_27001_points === 5 ? "Upload your ISO 27001 certificate to move from self-attested (5 pts) to certified (10 pts)."
      : "Obtain ISO 27001:2022 certification and upload the certificate.",
    false,
  ));

  explanations.push(mkFactor("Governance", "ISO 42001 AI Management System", 8, cert.iso_42001_points,
    cert.iso_42001_points === 8 ? "ISO 42001 certified (third-party verified)"
      : cert.iso_42001_points === 4 ? "ISO 42001 self-attested"
      : "Not provided",
    cert.iso_42001_points === 8 ? "ISO 42001 AI management system certified — maximum points."
      : cert.iso_42001_points === 4 ? "ISO 42001 self-attested. Upload a certificate for full credit."
      : "No ISO 42001 AI management certification detected.",
    cert.iso_42001_points >= 8 ? "No action needed."
      : cert.iso_42001_points === 4 ? "Upload ISO 42001 certificate for full credit."
      : "Pursue ISO 42001 certification — the AI-specific management system standard.",
    false,
  ));

  if (cert.hipaa_points > 0) {
    explanations.push(mkFactor("Governance", "HIPAA Compliance", 15, cert.hipaa_points,
      cert.hipaa_points === 15 ? "HIPAA BAA + HITRUST certified" : "HIPAA BAA only",
      cert.hipaa_points === 15 ? "HIPAA BAA with HITRUST certification — maximum points."
        : "HIPAA BAA in place. Adding HITRUST certification would further improve this factor.",
      cert.hipaa_points >= 15 ? "No action needed." : "Pursue HITRUST certification alongside your HIPAA BAA for full credit.",
      false,
    ));
  }

  // ── Governance: Policy ────────────────────────────────────────────────────

  const irLabels: Record<number, string> = { 15: "Tested annually or with drills", 10: "Documented but not tested", 5: "Basic runbook only" };
  explanations.push(mkFactor("Governance", "Incident Response Plan", 15, policy.incident_response_points,
    policy.incident_response_points > 0 ? (irLabels[policy.incident_response_points] ?? `${policy.incident_response_points}/15 pts`) : "Not provided",
    policy.incident_response_points === 15 ? "Incident response plan is documented and regularly tested — maximum points."
      : policy.incident_response_points === 10 ? "Plan documented but not yet tested. Annual exercises would improve this."
      : policy.incident_response_points === 5 ? "Basic runbook only — limited maturity."
      : "No incident response plan was detected.",
    policy.incident_response_points >= 15 ? "No action needed."
      : policy.incident_response_points === 10 ? "Conduct annual incident response exercises to earn full points."
      : policy.incident_response_points > 0 ? "Develop a full incident response plan with documented procedures and regular testing."
      : "Create and document an incident response plan. Upload it to earn up to 15 points.",
    false,
  ));

  const drLabels: Record<number, string> = { 12: "Documented and enforced", 8: "Documented but not enforced", 3: "Informal / ad hoc" };
  explanations.push(mkFactor("Governance", "Data Retention Policy", 12, policy.data_retention_points,
    policy.data_retention_points > 0 ? (drLabels[policy.data_retention_points] ?? `${policy.data_retention_points}/12 pts`) : "Not provided",
    policy.data_retention_points === 12 ? "Data retention policy documented and enforced — maximum points."
      : policy.data_retention_points === 8 ? "Policy documented but not consistently enforced."
      : policy.data_retention_points === 3 ? "Informal data retention practices only."
      : "No data retention policy detected.",
    policy.data_retention_points >= 12 ? "No action needed."
      : policy.data_retention_points > 0 ? "Operationalize your data retention policy with enforceable procedures."
      : "Create a data retention policy specifying retention periods and deletion procedures.",
    false,
  ));

  const privLabels: Record<number, string> = { 10: "Comprehensive (GDPR/CCPA)", 6: "Standard coverage", 3: "Basic" };
  explanations.push(mkFactor("Governance", "Privacy Policy", 10, policy.privacy_policy_points,
    policy.privacy_policy_points > 0 ? (privLabels[policy.privacy_policy_points] ?? `${policy.privacy_policy_points}/10 pts`) : "Not provided",
    policy.privacy_policy_points === 10 ? "Comprehensive privacy policy covering GDPR/CCPA — maximum points."
      : policy.privacy_policy_points === 6 ? "Standard privacy policy in place."
      : policy.privacy_policy_points === 3 ? "Basic privacy policy only."
      : "No privacy policy detected.",
    policy.privacy_policy_points >= 10 ? "No action needed."
      : policy.privacy_policy_points > 0 ? "Expand privacy policy to cover GDPR and CCPA requirements comprehensively."
      : "Publish a comprehensive privacy policy.",
    false,
  ));

  const ethicsLabels: Record<number, string> = { 8: "Board-approved and operationalized", 5: "Documented (not fully operationalized)", 2: "Draft stage" };
  explanations.push(mkFactor("Governance", "AI Ethics Policy", 8, policy.ai_ethics_points,
    policy.ai_ethics_points > 0 ? (ethicsLabels[policy.ai_ethics_points] ?? `${policy.ai_ethics_points}/8 pts`) : "Not provided",
    policy.ai_ethics_points === 8 ? "Board-approved AI ethics policy operationalized — maximum points."
      : policy.ai_ethics_points === 5 ? "AI ethics policy documented but not fully operationalized."
      : policy.ai_ethics_points === 2 ? "AI ethics policy in draft stage."
      : "No AI ethics policy detected.",
    policy.ai_ethics_points >= 8 ? "No action needed."
      : policy.ai_ethics_points > 0 ? "Seek board approval and fully operationalize your AI ethics policy."
      : "Develop an AI ethics policy covering fairness, transparency, and accountability.",
    false,
  ));

  const dp = GR.data_protection_score;
  if (dp) {
    const encRaw = strGet(input, "encryptionAtRest");
    explanations.push(mkFactor("Governance", "Encryption at Rest", 10, dp.encryption_points,
      encRaw !== "Not specified" ? encRaw : "Not disclosed",
      dp.encryption_points >= 10 ? "Strong encryption at rest with customer-managed keys — maximum points."
        : dp.encryption_points >= 8 ? "AES-256 at rest. Customer-managed keys score higher."
        : dp.encryption_points > 0 ? "Encryption at rest is present but not at the strongest level."
        : "No encryption-at-rest control disclosed.",
      dp.encryption_points >= 10 ? "No action needed."
        : dp.encryption_points > 0 ? "Move to AES-256 with customer-managed keys and attach evidence."
        : "Disclose encryption at rest (AES-256 or customer-managed keys) and attach evidence.",
      false,
    ));
    explanations.push(mkFactor("Governance", "TLS in Transit", 8, dp.tls_points,
      strGet(input, "tlsInTransit"),
      dp.tls_points >= 8 ? "TLS 1.3 in transit — maximum points."
        : dp.tls_points > 0 ? "TLS is enforced; TLS 1.3 scores highest."
        : "No TLS-in-transit version disclosed.",
      dp.tls_points >= 8 ? "No action needed."
        : "Enforce TLS 1.3 (or 1.2+) in transit.",
      false,
    ));
    explanations.push(mkFactor("Governance", "Data Subject Rights", 6, dp.data_subject_rights_points,
      dp.data_subject_rights_points > 0 ? `${dp.data_subject_rights_points}/6 rights coverage` : "Not specified",
      dp.data_subject_rights_points >= 6 ? "Full data-subject rights as processor — maximum points."
        : dp.data_subject_rights_points > 0 ? "Some data-subject rights disclosed. Processor role scores higher than controller-only."
        : "No data-subject rights disclosed.",
      dp.data_subject_rights_points >= 6 ? "No action needed."
        : "Document the rights you support and whether you act as processor, controller, or both.",
      false,
    ));
  }

  const sc = GR.supply_chain_score;
  if (sc) {
    explanations.push(mkFactor("Governance", "Sub-processors", 8, sc.value,
      sc.named_count ? `${sc.named_count} named sub-processor${sc.named_count === 1 ? "" : "s"}` : "Not specified",
      sc.value >= 8 ? "Named sub-processors with purpose and region — maximum points."
        : sc.value > 0 ? "Some sub-processors listed. Adding purpose and region for each scores higher."
        : "No sub-processors listed.",
      sc.value >= 8 ? "No action needed."
        : "Publish a sub-processor list with name, purpose, and region.",
      false,
    ));
  }

  const adv = GR.adversarial_disclosure_score;
  if (adv) {
    explanations.push(mkFactor("Governance", "Vulnerability Disclosure Policy", 6, adv.vdp_points,
      adv.vdp_points === 6 ? "Published VDP with URL"
        : adv.vdp_points === 4 ? "Published VDP"
        : adv.vdp_points === 3 ? "VDP on request"
        : "None",
      adv.vdp_points >= 6 ? "Published vulnerability disclosure policy with URL — maximum points."
        : adv.vdp_points > 0 ? "A VDP exists. Publishing a URL scores higher."
        : "No vulnerability disclosure policy published.",
      adv.vdp_points >= 6 ? "No action needed."
        : "Publish a VDP with a public URL and acknowledgement SLA.",
      false,
    ));
    explanations.push(mkFactor("Governance", "Bug Bounty", 4, adv.bug_bounty_points,
      adv.bug_bounty_points === 4 ? "Public bug bounty with URL"
        : adv.bug_bounty_points === 3 ? "Public bug bounty"
        : adv.bug_bounty_points === 2 ? "Private bug bounty"
        : "None",
      adv.bug_bounty_points >= 4 ? "Public bug bounty with URL — maximum points."
        : adv.bug_bounty_points > 0 ? "A bug bounty exists. A public program with URL scores higher."
        : "No bug bounty program disclosed.",
      adv.bug_bounty_points >= 4 ? "No action needed."
        : "Run a public bug bounty and publish the program URL.",
      false,
    ));
  }

  const dpa = GR.dpa_score;
  if (dpa) {
    const dpaLabels: Record<number, string> = { 4: "Publicly available", 2: "On request", 0: "None" };
    explanations.push(mkFactor("Governance", "DPA Available", 4, dpa.value,
      dpaLabels[dpa.value] ?? strGet(input, "dpaAvailable"),
      dpa.value >= 4 ? "DPA is publicly available — maximum points."
        : dpa.value === 2 ? "DPA available on request."
        : "No DPA disclosed.",
      dpa.value >= 4 ? "No action needed."
        : "Make a Data Processing Agreement publicly available.",
      false,
    ));
  }

  // ── Governance: Assessment Quality ────────────────────────────────────────

  const aqMethodLabels: Record<number, string> = {
    20: "Third-party independent audit", 15: "Third-party review", 10: "Internal audit",
    8: "Internal review", 5: "Self-reported (verified)", 3: "Self-assessment", 0: "No formal assessment",
  };
  explanations.push(mkFactor("Governance", "Security Assessment Method", 25, aq.value,
    aqMethodLabels[aq.method_base] ?? strGet(input, "assessmentMethod"),
    aq.method_base >= 20 ? `Third-party independent audit in place${aq.frequency_bonus > 0 ? " with regular frequency" : ""}.`
      : aq.method_base >= 8 ? "Internal or third-party review used — independent audits score higher."
      : aq.method_base > 0 ? "Self-assessment only — external validation scores significantly higher."
      : "No formal security assessment method reported.",
    aq.value >= 25 ? "No action needed."
      : aq.method_base < 20 ? "Engage an independent third-party auditor for your security assessment."
      : "Increase audit frequency (annual scores +5 over ad hoc).",
    false,
  ));

  // ── Governance: Operational Controls ──────────────────────────────────────

  const rbLabels: Record<number, string> = { 15: "Automated instant", 12: "Automated with manual trigger", 8: "Manual, documented", 3: "Manual, undocumented", 0: "None" };
  explanations.push(mkFactor("Governance", "Rollback Procedures", 15, opsCtrl.rollback_points,
    rbLabels[opsCtrl.rollback_points] ?? strGet(input, "rollbackProcedures"),
    opsCtrl.rollback_points === 15 ? "Automated instant rollback — maximum points."
      : opsCtrl.rollback_points >= 8 ? "Rollback procedures in place — automation would improve this."
      : opsCtrl.rollback_points > 0 ? "Manual rollback exists but lacks documentation or automation."
      : "No rollback capability reported.",
    opsCtrl.rollback_points >= 15 ? "No action needed."
      : opsCtrl.rollback_points > 0 ? "Automate rollback procedures to reduce mean time to recovery."
      : "Implement and document rollback procedures for AI model updates.",
    false,
  ));

  const hoLabels: Record<number, string> = { 12: "Always in the loop", 10: "Monitoring with intervention", 6: "Monitoring only", 3: "Minimal", 0: "None" };
  explanations.push(mkFactor("Governance", "Human Oversight Capabilities", 12, opsCtrl.oversight_points,
    hoLabels[opsCtrl.oversight_points] ?? strGet(input, "humanOversightCapabilities"),
    opsCtrl.oversight_points === 12 ? "Human always in the loop for AI decisions — maximum points."
      : opsCtrl.oversight_points >= 6 ? "Human monitoring with intervention capability available."
      : opsCtrl.oversight_points > 0 ? "Minimal human oversight in place."
      : "No human oversight capability reported.",
    opsCtrl.oversight_points >= 12 ? "No action needed."
      : opsCtrl.oversight_points > 0 ? "Implement human-in-the-loop capabilities for high-stakes AI decisions."
      : "Establish human oversight processes, especially for consequential AI outputs.",
    false,
  ));

  const monLabels: Record<number, string> = { 10: "Real-time alerting", 7: "Daily dashboards", 4: "Weekly reports", 2: "Monthly reviews", 0: "None" };
  explanations.push(mkFactor("Governance", "Continuous Monitoring", 10, opsCtrl.monitoring_points,
    monLabels[opsCtrl.monitoring_points] ?? strGet(input, "continuousMonitoring"),
    opsCtrl.monitoring_points === 10 ? "Real-time monitoring and alerting — maximum points."
      : opsCtrl.monitoring_points >= 4 ? "Regular monitoring in place — real-time alerting would score higher."
      : opsCtrl.monitoring_points > 0 ? "Infrequent monitoring only."
      : "No continuous monitoring reported.",
    opsCtrl.monitoring_points >= 10 ? "No action needed."
      : "Implement real-time monitoring and alerting for AI system performance and anomalies.",
    false,
  ));

  const vcLabels: Record<number, string> = { 8: "Automated MLOps pipeline", 5: "Manual with documentation", 2: "Basic tracking", 0: "None" };
  explanations.push(mkFactor("Governance", "Model Version Control", 8, opsCtrl.version_control_points,
    vcLabels[opsCtrl.version_control_points] ?? (Boolean(input.modelVersionControl) ? "Enabled" : "Not provided"),
    opsCtrl.version_control_points === 8 ? "Automated MLOps pipeline for version control — maximum points."
      : opsCtrl.version_control_points === 5 ? "Manual model versioning with documentation."
      : opsCtrl.version_control_points === 2 ? "Basic version tracking only."
      : "No model version control reported.",
    opsCtrl.version_control_points >= 8 ? "No action needed."
      : "Implement automated MLOps pipelines for model versioning and deployment tracking.",
    false,
  ));

  // ── Governance: Vendor Maturity (internal — scoring of age/size is internal detail) ──

  explanations.push(mkFactor("Governance", "Vendor Maturity (Internal)", 25, Math.max(0, Math.min(25, mat.value + 10)),
    `Company age: ${mat.company_age_years} year${mat.company_age_years !== 1 ? "s" : ""}`,
    `Vendor maturity adjustment = ${mat.value > 0 ? "+" : ""}${mat.value.toFixed(1)} pts. ` +
      `Factors: company age (${mat.company_age_years} yrs), size, funding stability, enterprise customer base.`,
    mat.value >= 15 ? "No action needed." : "Maturity improves over time with company growth, stable funding, and growing enterprise customer base.",
    true, // internalOnly — scoring of age/size/funding is internal
  ));

  // ── Operational: SLA ──────────────────────────────────────────────────────

  explanations.push(mkFactor("Operational", "SLA Uptime Commitment", 25, sla.uptime_points,
    strGet(input, "slaUptime"),
    sla.uptime_points === 25 ? "99.99%+ uptime SLA — maximum points."
      : sla.uptime_points >= 20 ? "High uptime SLA in place."
      : sla.uptime_points >= 12 ? "Moderate uptime SLA — higher availability commitment would score better."
      : sla.uptime_points > 0 ? "Low uptime SLA detected."
      : "No SLA uptime commitment provided.",
    sla.uptime_points >= 25 ? "No action needed."
      : sla.uptime_points > 0 ? "Increase your uptime SLA commitment with infrastructure redundancy."
      : "Publish a formal uptime SLA. Enterprise buyers expect 99.9%+ availability.",
    false,
  ));

  explanations.push(mkFactor("Operational", "Critical Incident Response SLA", 8, sla.response_time_points,
    strGet(input, "criticalIncidentResponse"),
    sla.response_time_points === 8 ? "Critical incident response < 15 minutes — maximum points."
      : sla.response_time_points >= 4 ? "Response SLA of up to 4 hours committed."
      : sla.response_time_points > 0 ? "Incident response exceeds 4 hours."
      : "No incident response time SLA provided.",
    sla.response_time_points >= 8 ? "No action needed."
      : "Commit to a critical incident response SLA under 1 hour.",
    false,
  ));

  explanations.push(mkFactor("Operational", "Critical Incident Resolution SLA", 7, sla.resolution_time_points,
    strGet(input, "criticalIncidentResolution"),
    sla.resolution_time_points === 7 ? "Critical resolution within 4 hours — maximum points."
      : sla.resolution_time_points >= 3 ? "Resolution SLA of up to 72 hours committed."
      : sla.resolution_time_points > 0 ? "Resolution exceeds 72 hours."
      : "No incident resolution SLA provided.",
    sla.resolution_time_points >= 7 ? "No action needed."
      : "Commit to a critical incident resolution SLA under 24 hours.",
    false,
  ));

  // ── Operational: Incident Management ─────────────────────────────────────

  const planLabels: Record<number, string> = { 12: "Quarterly drills", 10: "Annual testing", 6: "Documented but untested" };
  explanations.push(mkFactor("Operational", "Incident Response Plan Testing", 12, incident.plan_points,
    incident.plan_points > 0 ? (planLabels[incident.plan_points] ?? `${incident.plan_points}/12 pts`) : "Not tested or no plan",
    incident.plan_points === 12 ? "Incident plan tested quarterly — maximum points."
      : incident.plan_points === 10 ? "Annual testing in place."
      : incident.plan_points === 6 ? "Plan exists but has not been tested."
      : "No incident response plan testing reported.",
    incident.plan_points >= 12 ? "No action needed."
      : incident.plan_points > 0 ? "Increase incident response testing frequency (quarterly earns maximum points)."
      : "Develop and regularly test your incident response plan.",
    false,
  ));

  const autoLabels: Record<number, string> = {
    10: "Fully automated", 7: "Semi-automated", 3: "Manual (documented)",
    1: "Manual (undocumented)", 0: "None",
  };
  explanations.push(mkFactor("Operational", "Incident Response Automation", 10, incident.automation_points,
    autoLabels[incident.automation_points] ?? strGet(input, "rollbackProcedures"),
    incident.automation_points === 10 ? "Fully automated incident response — maximum points."
      : incident.automation_points === 7 ? "Semi-automated incident response in place."
      : incident.automation_points === 3 ? "Manual incident response only."
      : "No incident response automation reported.",
    incident.automation_points >= 10 ? "No action needed."
      : "Implement automated incident detection and response tooling.",
    false,
  ));

  const commLabels: Record<number, string> = { 8: "Proactive status page", 5: "Email notifications", 2: "Reactive only", 0: "None" };
  explanations.push(mkFactor("Operational", "Incident Communication", 8, incident.communication_points,
    commLabels[incident.communication_points] ?? strGet(input, "incidentCommunication"),
    incident.communication_points === 8 ? "Proactive status page with real-time updates — maximum points."
      : incident.communication_points === 5 ? "Email notification system in place."
      : incident.communication_points === 2 ? "Reactive communication only."
      : "No customer incident communication process reported.",
    incident.communication_points >= 8 ? "No action needed."
      : "Implement a public status page with proactive incident notifications.",
    false,
  ));

  // ── Operational: Deployment ───────────────────────────────────────────────

  const scaleLabels: Record<number, string> = { 12: "Enterprise multi-tenant", 10: "Enterprise single-tenant", 7: "Mid-market", 4: "Small business", 2: "Pilot stage" };
  explanations.push(mkFactor("Operational", "Deployment Scale", 12, deploy.scale_points,
    scaleLabels[deploy.scale_points] ?? strGet(input, "deploymentScale"),
    deploy.scale_points === 12 ? "Enterprise multi-tenant deployment at scale — maximum points."
      : deploy.scale_points >= 7 ? "Mid-market to enterprise deployment scale."
      : deploy.scale_points > 0 ? "Early-stage or limited deployment scale."
      : "Deployment scale not reported.",
    deploy.scale_points >= 12 ? "No action needed."
      : "Demonstrate enterprise-scale deployments and multi-tenant architecture.",
    false,
  ));

  const readLabels: Record<number, string> = { 10: "Production mature (>1 yr)", 8: "Production (new)", 4: "Staging / testing", 1: "Development" };
  explanations.push(mkFactor("Operational", "Production Readiness", 10, deploy.production_readiness_points,
    readLabels[deploy.production_readiness_points] ?? strGet(input, "devStage"),
    deploy.production_readiness_points === 10 ? "Mature production deployment with proven track record."
      : deploy.production_readiness_points === 8 ? "In production — building track record."
      : deploy.production_readiness_points === 4 ? "In staging or testing — not yet production-ready."
      : deploy.production_readiness_points === 1 ? "Development stage."
      : "Production readiness not reported.",
    deploy.production_readiness_points >= 10 ? "No action needed."
      : "Move to production and build a track record with real enterprise customers.",
    false,
  ));

  const isoLabels: Record<number, string> = { 8: "Full instance isolation", 6: "Schema isolation", 4: "Row-level security" };
  explanations.push(mkFactor("Operational", "Multi-tenancy & Data Isolation", 8, deploy.multi_tenancy_points,
    deploy.multi_tenancy_points > 0 ? (isoLabels[deploy.multi_tenancy_points] ?? `${deploy.multi_tenancy_points}/8 pts`) : "Not supported or not provided",
    deploy.multi_tenancy_points === 8 ? "Full customer instance isolation — maximum data security."
      : deploy.multi_tenancy_points === 6 ? "Schema-level data isolation in place."
      : deploy.multi_tenancy_points === 4 ? "Row-level security for tenant separation."
      : "Multi-tenancy not supported or data isolation method not specified.",
    deploy.multi_tenancy_points >= 8 ? "No action needed."
      : deploy.multi_tenancy_points > 0 ? "Implement stronger data isolation (full instance isolation scores maximum)."
      : "Implement multi-tenancy with strong data isolation between customers.",
    false,
  ));

  // ── Operational: Stability ─────────────────────────────────────────────────

  explanations.push(mkFactor("Operational", "Company Longevity", 12, stab.company_age_points,
    stab.company_age_years > 0 ? `${stab.company_age_years} year${stab.company_age_years !== 1 ? "s" : ""} in operation` : "Not provided",
    stab.company_age_points === 12 ? `${stab.company_age_years}+ years in operation — well-established.`
      : stab.company_age_points >= 6 ? `${stab.company_age_years} years in operation — growing track record.`
      : stab.company_age_points > 0 ? `${stab.company_age_years} year${stab.company_age_years !== 1 ? "s" : ""} in operation — early-stage.`
      : "Company age not provided.",
    stab.company_age_points >= 12 ? "No action needed." : "Continue building your operational history.",
    false,
  ));

  const finLabels: Record<number, string> = {
    10: "Profitable for 3+ years", 7: "Profitable for 1 year", 5: "Break-even",
    4: "Funded (2+ yr runway)", 2: "Funded (1 yr runway)", 0: "Uncertain",
  };
  explanations.push(mkFactor("Operational", "Financial Health", 10, stab.financial_health_points,
    finLabels[stab.financial_health_points] ?? strGet(input, "financialStatus"),
    stab.financial_health_points >= 10 ? "Company profitable for 3+ years — strong financial stability."
      : stab.financial_health_points >= 5 ? "Adequate financial stability demonstrated."
      : stab.financial_health_points > 0 ? "Limited financial runway — viability risk."
      : "Financial health not reported.",
    stab.financial_health_points >= 10 ? "No action needed."
      : "Demonstrate financial stability through profitability or multi-year funding runway.",
    false,
  ));

  const retLabels: Record<number, string> = {
    8: "95%+ retention", 6: "90–95% retention", 4: "80–90% retention",
    3: "Not reported (default applied)", 2: "70–80% retention",
  };
  explanations.push(mkFactor("Operational", "Customer Retention Rate", 8, stab.customer_retention_points,
    retLabels[stab.customer_retention_points] ?? "Not provided",
    stab.customer_retention_points >= 8 ? "Excellent customer retention (95%+) — maximum points."
      : stab.customer_retention_points >= 4 ? "Good customer retention rate."
      : stab.customer_retention_points === 3 ? "Retention rate not reported — default score applied."
      : "Low retention or data not provided.",
    stab.customer_retention_points >= 8 ? "No action needed."
      : "Report your customer retention rate. 95%+ earns maximum points.",
    false,
  ));

  // ── Operational: Support ───────────────────────────────────────────────────

  const tierLabels: Record<number, string> = { 10: "24/7 phone, chat & email", 7: "Business hours phone & chat", 4: "Business hours email", 2: "Email only" };
  explanations.push(mkFactor("Operational", "Support Tier", 10, support.support_tier_points,
    tierLabels[support.support_tier_points] ?? strGet(input, "supportTiers"),
    support.support_tier_points === 10 ? "24/7 support via phone, chat, and email — maximum points."
      : support.support_tier_points >= 4 ? "Business hours support in place."
      : support.support_tier_points > 0 ? "Email-only support."
      : "Support tier not specified.",
    support.support_tier_points >= 10 ? "No action needed."
      : "Offer 24/7 support (phone + chat + email) for enterprise clients.",
    false,
  ));

  explanations.push(mkFactor("Operational", "Healthcare Workflow Support", 5, support.coverage_points,
    support.coverage_points === 5 ? "HIPAA-compliant workflows supported" : "Not provided",
    support.coverage_points === 5 ? "HIPAA-compliant workflow support confirmed."
      : "No HIPAA workflow support was reported.",
    support.coverage_points >= 5 ? "No action needed."
      : "If serving healthcare customers, document HIPAA-compliant workflow support.",
    false,
  ));

  const tamLabels: Record<number, string> = { 5: "Dedicated TAM", 3: "Shared TAM", 1: "Standard support" };
  explanations.push(mkFactor("Operational", "Technical Account Management", 5, support.expertise_points,
    tamLabels[support.expertise_points] ?? strGet(input, "technicalAccountManager"),
    support.expertise_points === 5 ? "Dedicated Technical Account Manager — maximum points."
      : support.expertise_points === 3 ? "Shared Technical Account Manager available."
      : support.expertise_points === 1 ? "Standard support only."
      : "Technical account management not specified.",
    support.expertise_points >= 5 ? "No action needed."
      : "Offer dedicated Technical Account Management for enterprise accounts.",
    false,
  ));

  // ── Product: Evidence Quality (vendor-safe) ───────────────────────────────

  const penCadence = String(input.independentPenTestFrequency ?? "").trim().toLowerCase();
  const penTest =
    ["continuous", "quarterly", "annually", "ad_hoc"].includes(penCadence) ||
    input.penetrationTestReportAvailable === true;
  const soc2T2Current = input.soc2Type2Current === true;
  const complianceDocs = input.complianceDocumentationComplete === true;
  const evidencePts = (penTest ? 8 : 0) + (soc2T2Current ? 10 : 0) + (complianceDocs ? 7 : 0);

  explanations.push(mkFactor("Product", "Risk Mitigation Evidence", 25, evidencePts,
    [penTest && "Penetration test report", soc2T2Current && "SOC 2 Type 2", complianceDocs && "Compliance documentation"].filter(Boolean).join("; ") || "None uploaded",
    evidencePts === 25 ? "All key evidence documents uploaded — maximum points."
      : evidencePts > 0 ? "Some evidence uploaded. Additional documentation would further improve this factor."
      : "No risk mitigation evidence documents detected.",
    evidencePts >= 25 ? "No action needed."
      : [
          !penTest && "Upload penetration test report (+8 pts)",
          !soc2T2Current && "Confirm SOC 2 Type 2 certification (+10 pts)",
          !complianceDocs && "Upload compliance documentation (+7 pts)",
        ].filter(Boolean).join(". ") + ".",
    false,
  ));

  // ── Product: Internal AI Risk Detail ─────────────────────────────────────

  const productScore = Math.round(Math.max(0, Math.min(100, 100 - formula.product_risk)));
  const meVal = Number(PR.mitigation_effectiveness?.value ?? 0);
  const cfVal = Number(PR.confidence_factor?.value ?? 0);
  explanations.push(mkFactor("Product", "AI Product Risk Profile (Internal)", 100, productScore,
    `Product Risk: ${formula.product_risk.toFixed(2)} risk units. Weighted deduction: ${(formula.product_risk * 0.40).toFixed(2)} pts from VTS.`,
    `Product Score = ${productScore}/100 (= 100 − ${formula.product_risk.toFixed(2)} product risk). ` +
      `Calculated as: Inherent Risk × (1 − Mitigation Effectiveness) × Confidence Factor. ` +
      `Mitigation Effectiveness = ${(meVal * 100).toFixed(1)}%. ` +
      `Confidence Factor = ${cfVal.toFixed(3)}.`,
    "Improve mitigation controls, provide stronger evidence, and reduce AI deployment scope/criticality.",
    true,
  ));

  return explanations;
}