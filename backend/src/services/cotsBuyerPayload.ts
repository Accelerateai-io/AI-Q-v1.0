/** Map API (camelCase) to DB columns for buyer COTS assessments. */

function get(body: Record<string, unknown>, k: string): unknown {
  return body[k] ?? body[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
}

function parseJson(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === "string" && v.trim()) {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

function str(v: unknown, max?: number): string | null {
  if (v == null) return null;
  const s = String(v);
  return max != null ? s.slice(0, max) : s;
}

export function buildPayloadCots(body: Record<string, unknown>) {
  const expectedOutcomes =
    get(body, "expectedOutcomes") ??
    [
      get(body, "targetOutcomeMetric"),
      get(body, "targetOutcomeBaseline") && `today: ${get(body, "targetOutcomeBaseline")}`,
      get(body, "targetOutcomeTarget") && `year one: ${get(body, "targetOutcomeTarget")}`,
    ]
      .filter(Boolean)
      .join(" | ");

  const reviewDue = get(body, "reviewDueDate");
  let reviewDueDate: Date | null = null;
  if (reviewDue != null && String(reviewDue).trim()) {
    const d = new Date(String(reviewDue));
    if (!Number.isNaN(d.getTime())) reviewDueDate = d;
  }

  return {
    user_id: get(body, "userId") != null ? Number(get(body, "userId")) || null : null,
    organization_id: get(body, "organizationId") != null ? str(get(body, "organizationId"), 255) : null,
    organization_name: get(body, "organizationName") != null ? str(get(body, "organizationName"), 255) : null,
    industry: get(body, "industry") != null ? str(get(body, "industry"), 200) : null,
    industry_sector: (() => {
      const raw = get(body, "industrySector");
      if (raw == null) return null;
      if (Array.isArray(raw)) return raw.map(String).filter(Boolean).join(", ").slice(0, 200);
      const s = String(raw).trim();
      if (!s) return null;
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map(String).filter(Boolean).join(", ").slice(0, 200);
        }
      } catch {
        /* plain string */
      }
      return s.slice(0, 200);
    })(),
    employee_count: get(body, "employeeCount") != null ? str(get(body, "employeeCount"), 100) : null,
    geographic_regions: parseJson(get(body, "geographicRegions") ?? get(body, "operatingRegions")),
    pain_point: get(body, "businessPainPoint") != null ? String(get(body, "businessPainPoint")) : null,
    business_outcomes: expectedOutcomes ? String(expectedOutcomes) : null,
    business_unit: get(body, "owningDepartment") != null ? str(get(body, "owningDepartment"), 100) : null,
    budget_range: get(body, "budgetRange") != null ? str(get(body, "budgetRange"), 100) : null,
    target_timeline: get(body, "targetTimeline") != null ? str(get(body, "targetTimeline"), 100) : null,
    critical_of_ai_solution: str(
      get(body, "criticality") ?? get(body, "unavailabilityImpact"),
      100,
    ),
    vendor_name: get(body, "vendorName") != null ? str(get(body, "vendorName"), 200) : null,
    specific_product: get(body, "productName") != null ? str(get(body, "productName"), 200) : null,
    gap_requirement_product: str(
      get(body, "requirementGaps") ?? get(body, "currentUsageState"),
    ),
    integrate_system: parseJson(get(body, "integrationSystems")),
    integrate_system_other:
      get(body, "integrationSystemsOther") != null ? str(get(body, "integrationSystemsOther"), 300) : null,
    current_tech_stack: parseJson(get(body, "techStack") ?? get(body, "cloudProvider")),
    digital_maturity: get(body, "digitalMaturityLevel") != null ? str(get(body, "digitalMaturityLevel"), 100) : null,
    governance_maturity:
      get(body, "dataGovernanceMaturity") != null ? str(get(body, "dataGovernanceMaturity"), 100) : null,
    ai_governance_board: get(body, "aiGovernanceBoard") != null ? str(get(body, "aiGovernanceBoard"), 100) : null,
    ai_ethics_policy: get(body, "aiEthicsPolicy") != null ? str(get(body, "aiEthicsPolicy"), 100) : null,
    team_composition: parseJson(
      get(body, "implementationTeamComposition") ?? get(body, "implementationCapacity"),
    ),
    data_sensitivity_level: get(body, "dataSensitivity") != null ? str(get(body, "dataSensitivity"), 100) : null,
    regulatory_requirments: parseJson(get(body, "regulatoryRequirements")),
    risk_appetite: get(body, "riskAppetite") != null ? str(get(body, "riskAppetite"), 100) : null,
    statke_at_ai_decisions: get(body, "decisionStakes") != null ? str(get(body, "decisionStakes"), 100) : null,
    impact_by_ai: parseJson(get(body, "impactedStakeholders") ?? get(body, "decisionDomains")),
    vendor_capabilities:
      get(body, "vendorValidationApproach") != null ? str(get(body, "vendorValidationApproach"), 100) : null,
    vendor_security_posture:
      get(body, "vendorSecurityPosture") != null ? str(get(body, "vendorSecurityPosture"), 100) : null,
    vendor_compliance_certifications: parseJson(
      get(body, "vendorCertifications") ?? get(body, "vendorEvidenceReceived"),
    ),
    phased_rollout_plan: str(get(body, "pilotRolloutPlan") ?? get(body, "pilotStatus"), 100),
    rollback_capability: get(body, "rollbackCapability") != null ? str(get(body, "rollbackCapability"), 100) : null,
    management_plan: get(body, "changeManagementPlan") != null ? str(get(body, "changeManagementPlan"), 100) : null,
    compliance_document: (() => {
      const raw = get(body, "vendorComplianceDocumentation") ?? get(body, "complianceDocument");
      if (raw == null) return null;
      if (Array.isArray(raw)) return raw.map(String).filter(Boolean).join(", ") || null;
      const s = String(raw).trim();
      if (!s) return null;
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean).join(", ") || null;
      } catch {
        /* plain string */
      }
      return s;
    })(),
    vendor_usage_data:
      get(body, "monitoringDataAvailable") != null ? str(get(body, "monitoringDataAvailable"), 100) : null,
    audit_logs: get(body, "auditLogsAvailable") != null ? str(get(body, "auditLogsAvailable"), 100) : null,
    testing_results: get(body, "testingResultsAvailable") != null ? str(get(body, "testingResultsAvailable"), 100) : null,
    identified_risks: get(body, "identifiedRisks") != null ? String(get(body, "identifiedRisks")) : null,
    risk_domain_scores: get(body, "riskDomainScores") != null ? String(get(body, "riskDomainScores")) : null,
    contextual_multipliers:
      get(body, "contextualMultipliers") != null ? String(get(body, "contextualMultipliers")) : null,
    buyer_risk_mitigation: get(body, "riskMitigation") != null ? String(get(body, "riskMitigation")) : null,
    risk_mitigation_mapping_ids: parseJson(get(body, "riskMitigationMappingIds")),
    use_case_types: parseJson(get(body, "useCaseTypes")),
    users_in_scope: get(body, "usersInScope") != null ? str(get(body, "usersInScope"), 20) : null,
    current_usage_state: get(body, "currentUsageState") != null ? str(get(body, "currentUsageState"), 80) : null,
    pilot_status: get(body, "pilotStatus") != null ? str(get(body, "pilotStatus"), 80) : null,
    accountable_owner_name:
      get(body, "accountableOwnerName") != null ? str(get(body, "accountableOwnerName"), 200) : null,
    accountable_owner_role:
      get(body, "accountableOwnerRole") != null ? str(get(body, "accountableOwnerRole"), 40) : null,
    data_classes: parseJson(get(body, "dataClasses")),
    data_subject_jurisdictions: parseJson(get(body, "dataSubjectJurisdictions")),
    decision_domains: parseJson(get(body, "decisionDomains")),
    output_exposure: get(body, "outputExposure") != null ? str(get(body, "outputExposure"), 80) : null,
    regulatory_requirements_derived: parseJson(get(body, "regulatoryRequirementsDerived")),
    regulatory_requirements_added: parseJson(get(body, "regulatoryRequirementsAdded")),
    regulatory_requirements_removed: parseJson(get(body, "regulatoryRequirementsRemoved")),
    retention_requirement:
      get(body, "retentionRequirement") != null ? str(get(body, "retentionRequirement"), 30) : null,
    training_use_of_data: get(body, "trainingUseOfData") != null ? str(get(body, "trainingUseOfData"), 80) : null,
    training_use_of_data_stance:
      get(body, "trainingUseOfDataStance") != null ? str(get(body, "trainingUseOfDataStance"), 20) : null,
    training_use_of_data_dispute_note:
      get(body, "trainingUseOfDataDisputeNote") != null
        ? String(get(body, "trainingUseOfDataDisputeNote"))
        : null,
    human_review_level: get(body, "humanReviewLevel") != null ? str(get(body, "humanReviewLevel"), 80) : null,
    ai_disclosure: get(body, "aiDisclosure") != null ? str(get(body, "aiDisclosure"), 40) : null,
    deployment_model: get(body, "deploymentModel") != null ? str(get(body, "deploymentModel"), 80) : null,
    cloud_provider: parseJson(get(body, "cloudProvider")),
    integration_access_levels: parseJson(get(body, "integrationAccessLevels")),
    implementation_capacity:
      get(body, "implementationCapacity") != null ? str(get(body, "implementationCapacity"), 80) : null,
    training_effort: get(body, "trainingEffort") != null ? str(get(body, "trainingEffort"), 80) : null,
    vendor_evidence_received: parseJson(get(body, "vendorEvidenceReceived")),
    monitoring_data_stance:
      get(body, "monitoringDataStance") != null ? str(get(body, "monitoringDataStance"), 20) : null,
    monitoring_data_dispute_note:
      get(body, "monitoringDataDisputeNote") != null ? String(get(body, "monitoringDataDisputeNote")) : null,
    audit_logs_stance: get(body, "auditLogsStance") != null ? str(get(body, "auditLogsStance"), 20) : null,
    audit_logs_dispute_note:
      get(body, "auditLogsDisputeNote") != null ? String(get(body, "auditLogsDisputeNote")) : null,
    data_export_capability:
      get(body, "dataExportCapability") != null ? str(get(body, "dataExportCapability"), 80) : null,
    data_export_stance: get(body, "dataExportStance") != null ? str(get(body, "dataExportStance"), 20) : null,
    data_export_dispute_note:
      get(body, "dataExportDisputeNote") != null ? String(get(body, "dataExportDisputeNote")) : null,
    unavailability_impact:
      get(body, "unavailabilityImpact") != null ? str(get(body, "unavailabilityImpact"), 80) : null,
    contracts_in_place: parseJson(get(body, "contractsInPlace")),
    contract_notice_period:
      get(body, "contractNoticePeriod") != null ? str(get(body, "contractNoticePeriod"), 30) : null,
    assessor_name: get(body, "assessorName") != null ? str(get(body, "assessorName"), 200) : null,
    assessor_role: get(body, "assessorRole") != null ? str(get(body, "assessorRole"), 40) : null,
    answer_confidence: get(body, "answerConfidence") != null ? str(get(body, "answerConfidence"), 80) : null,
    review_due_date: reviewDueDate,
    unlinked_vendor: get(body, "unlinkedVendor") != null ? str(get(body, "unlinkedVendor"), 10) : null,
    target_outcome_metric:
      get(body, "targetOutcomeMetric") != null ? str(get(body, "targetOutcomeMetric"), 120) : null,
    target_outcome_baseline:
      get(body, "targetOutcomeBaseline") != null ? str(get(body, "targetOutcomeBaseline"), 80) : null,
    target_outcome_target:
      get(body, "targetOutcomeTarget") != null ? str(get(body, "targetOutcomeTarget"), 80) : null,
  };
}
