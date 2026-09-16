/**
 * Company profile section in Vendor Self Attestation (prefilled from vendor onboarding).
 * Matches backend vendor_onboarding / GET companyProfile shape.
 */
export interface AttestationSubProcessor {
  name: string;
  purpose: string;
  region: string;
  source_url: string;
}

export interface VulnerabilityDisclosurePolicy {
  status: string;
  url: string;
  ack_sla_hours: string;
}

export interface BugBountyProgram {
  status: string;
  url: string;
  scope: string;
}

export interface FedrampAuthorization {
  status: string;
  level: string;
  boundary: string;
  marketplace_id: string;
  authorized_at: string;
}

export interface AttestationCompanyProfile {
  vendorName?: string;
  vendorType: string;
  sector: Record<string, string[]> | Record<string, unknown>;
  vendorMaturity: string;
  companyWebsite: string;
  companyDescription: string;
  employeeCount: string;
  yearFounded: number | string;
  headquartersLocation: string;
  operatingRegions: string[];
  fundingStatus?: string;
  financialPosition?: string;
  enterpriseCustomers?: string;
  customerRetentionRate?: string;
}

/**
 * Payload sent to POST /vendorSelfAttestation (vendor_self_attestations table).
 * Snake_case to align with backend; frontend can use camelCase and map on submit.
 */
export interface VendorSelfAttestationPayload {
  product_name?: string | null;
  purchase_decision_makers?: string[] | null;
  pain_points_solved?: string | null;
  alternatives_considered?: string | null;
  unique_value_proposition?: string | null;
  typical_customer_roi?: string | null;
  ai_capabilities?: string[] | null;
  ai_model_types?: string[] | null;
  model_transparency?: string | null;
  decision_autonomy?: string | null;
  /** Yes / No — documented AI governance policy; if Yes, upload file(s) to documentUpload.aiGovernancePolicy */
  documented_ai_governance_policy?: string | null;
  ai_ethics_governance_maturity?: string | null;
  versions_models?: string | null;
  model_versioning_method?: string | null;
  security_certifications?: string[] | null;
  assessment_completion_level?: string | null;
  audit_frequency?: string | null;
  /** HIPAA BAA / GDPR / CCPA (multi-select); legacy yes/no strings still accepted */
  hipaa_baa?: string | string[] | null;
  fedramp_authorization?: FedrampAuthorization | null;
  pii_handling?: string | null;
  data_residency_options?: string[] | null;
  data_retention_policy?: string | null;
  privacy_programme_scope?: string | null;
  typical_data_volume?: string | null;
  encryption_at_rest?: string | null;
  encryption_at_rest_evidence_id?: string | null;
  tls_in_transit?: string | null;
  data_subject_rights?: string[] | null;
  controller_or_processor?: string | null;
  sub_processors?: AttestationSubProcessor[] | null;
  vulnerability_disclosure_policy?: VulnerabilityDisclosurePolicy | null;
  bug_bounty?: BugBountyProgram | null;
  independent_pen_test_frequency?: string | null;
  dpa_available?: string | null;
  dpa_url?: string | null;
  bias_testing_approach?: string[] | null;
  adversarial_security_testing?: string | null;
  human_oversight?: string[] | null;
  training_data_documentation?: string | null;
  uptime_sla?: string | null;
  support_slas?: string | null;
  change_management?: string | null;
  incident_response_plan?: string | null;
  production_model_monitoring?: string | null;
  critical_incident_response_target?: string | null;
  critical_incident_resolution_target?: string | null;
  ir_plan_test_frequency?: string | null;
  incident_customer_communication?: string | null;
  support_coverage?: string | null;
  account_management?: string | null;
  rollback_capability?: string | null;
  hosting_deployment?: string[] | null;
  deployment_scale?: string | null;
  product_stage?: string | null;
  is_multi_tenant?: string | null;
  tenant_isolation_model?: string | null;
  deployment_customization?: string | null;
  integration_complexity?: string | null;
  interaction_data_available?: string | null;
  audit_logs_available?: string | null;
  testing_results_available?: string | null;
  trust_centre_url?: string | null;
  has_public_security_incident?: string | null;
  security_incidents?: Array<{
    date?: string;
    summary?: string;
    sourceUrl?: string;
    source_url?: string;
    severity?: string;
    resolved?: boolean;
  }> | null;
}

/**
 * Regulatory (section 2) uses multi-select categories; each category has its own file list.
 */
export interface RegulatoryDocumentUpload {
  categories: string[];
  byCategory: Record<string, string[]>;
}

/**
 * Document upload structure stored in backend document_uploads jsonb.
 * - "0": Marketing and Product Material (file names)
 * - "1": Technical Product Specifications Material (file names)
 * - "2": "Which compliance certifications do you hold? (attach evidence for each)" (multi-select categories + files per category)
 * - evidenceTestingPolicy: file names for "Upload Testing and Policy Documentation (Optional)"
 * - aiGovernancePolicy: file names when user answers Yes to documented AI governance policy (AI Technical Capabilities)
 */
export interface DocumentUploadState {
  "0": string[];
  "1": string[];
  "2": RegulatoryDocumentUpload;
  evidenceTestingPolicy: string[];
  aiGovernancePolicy: string[];
}

/**
 * Full form state for Vendor Self Attestation: company profile (step 0) + attestation fields.
 */
export interface VendorSelfAttestationFormState {
  companyProfile: AttestationCompanyProfile;
  attestation: VendorSelfAttestationPayload;
  /** Document uploads: by category + evidence testing policy (persisted in backend document_uploads jsonb). */
  documentUpload?: DocumentUploadState;
}
