import { vendorSelfAttestations } from "../schema/assessments/vendorSelfAttestations.js";

function asOptionalVarchar(value: unknown, max: number): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

function asOptionalBool(value: unknown): boolean | null {
  if (value === true || value === "true" || value === "yes") return true;
  if (value === false || value === "false" || value === "no") return false;
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

const TLS_CANONICAL = new Set(["TLS 1.2", "1.2+", "1.3", "Other"]);
const CONTROLLER_OR_PROCESSOR = new Set(["controller", "processor", "both"]);
const PEN_TEST_FREQUENCY = new Set(["continuous", "quarterly", "annually", "ad_hoc", "none"]);
const DPA_AVAILABLE = new Set(["publicly_available", "on_request", "none"]);
const ENCRYPTION_AT_REST_VALUES = new Set([
  "aes_256",
  "aes_128",
  "customer_managed_keys",
  "platform_managed_keys",
  "not_disclosed",
]);

function oneOf(value: unknown, allowed: Set<string>, max: number): string | null {
  const text = asOptionalVarchar(value, max);
  if (!text) return null;
  return allowed.has(text) ? text : null;
}

/** Persist the selected option as-is, including "not_disclosed" so drafts round-trip. */
function normalizeEncryptionAtRest(value: unknown): string | null {
  const text = asOptionalVarchar(value, 50);
  if (!text) return null;
  if (ENCRYPTION_AT_REST_VALUES.has(text)) return text;
  const compact = text.toLowerCase().replace(/[\s-]+/g, "_");
  if (compact === "aes256" || compact === "aes_256") return "aes_256";
  if (compact === "aes128" || compact === "aes_128") return "aes_128";
  if (compact === "customer_managed_keys") return "customer_managed_keys";
  if (compact === "platform_managed_keys") return "platform_managed_keys";
  if (compact === "not_disclosed" || compact === "notdisclosed") return "not_disclosed";
  return ENCRYPTION_AT_REST_VALUES.has(compact) ? compact : null;
}

/** Canonicalize TLS answers to TLS 1.2 / 1.2+ / 1.3 / Other. */
function normalizeTlsInTransit(value: unknown): string | null {
  const text = asOptionalVarchar(value, 50);
  if (!text) return null;
  if (TLS_CANONICAL.has(text)) return text;
  const compact = text.toLowerCase().replace(/\s+/g, "").replace(/^tls/i, "");
  if (compact.includes("1.2+")) return "1.2+";
  if (compact === "1.3" || compact.startsWith("1.3")) return "1.3";
  if (compact === "1.2" || compact.startsWith("1.2")) return "TLS 1.2";
  return "Other";
}

function normalizeSubProcessors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item == null || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const name = asOptionalVarchar(row.name, 255);
      if (!name) return null;
      return {
        name,
        purpose: asOptionalVarchar(row.purpose, 255) ?? "",
        region: asOptionalVarchar(row.region, 100) ?? "",
        source_url: asOptionalVarchar(row.source_url ?? row.sourceUrl, 500) ?? "",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
}

function normalizeVdp(value: unknown) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const status = asOptionalVarchar(row.status, 30);
  if (!status) return null;
  const includeDetails = status !== "none";
  return {
    status,
    url: includeDetails ? asOptionalVarchar(row.url, 500) ?? "" : "",
    ack_sla_hours: includeDetails ? asOptionalVarchar(row.ack_sla_hours ?? row.ackSlaHours, 10) ?? "" : "",
  };
}

function normalizeBugBounty(value: unknown) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const status = asOptionalVarchar(row.status, 30);
  if (!status) return null;
  const includeDetails = status !== "none";
  return {
    status,
    url: includeDetails ? asOptionalVarchar(row.url, 500) ?? "" : "",
    scope: includeDetails ? asOptionalVarchar(row.scope, 255) ?? "" : "",
  };
}

function boolToYesNo(value: unknown): string | undefined {
  if (value === true) return "yes";
  if (value === false) return "no";
  return undefined;
}

export const attestationExtendedColumnSelect = {
  production_model_monitoring: vendorSelfAttestations.production_model_monitoring,
  critical_incident_response_target: vendorSelfAttestations.critical_incident_response_target,
  critical_incident_resolution_target: vendorSelfAttestations.critical_incident_resolution_target,
  ir_plan_test_frequency: vendorSelfAttestations.ir_plan_test_frequency,
  incident_customer_communication: vendorSelfAttestations.incident_customer_communication,
  support_coverage: vendorSelfAttestations.support_coverage,
  account_management: vendorSelfAttestations.account_management,
  versions_models: vendorSelfAttestations.versions_models,
  model_versioning_method: vendorSelfAttestations.model_versioning_method,
  privacy_programme_scope: vendorSelfAttestations.privacy_programme_scope,
  typical_data_volume: vendorSelfAttestations.typical_data_volume,
  ai_ethics_governance_maturity: vendorSelfAttestations.ai_ethics_governance_maturity,
  is_multi_tenant: vendorSelfAttestations.is_multi_tenant,
  tenant_isolation_model: vendorSelfAttestations.tenant_isolation_model,
  deployment_customization: vendorSelfAttestations.deployment_customization,
  integration_complexity: vendorSelfAttestations.integration_complexity,
  encryption_at_rest: vendorSelfAttestations.encryption_at_rest,
  encryption_at_rest_evidence_id: vendorSelfAttestations.encryption_at_rest_evidence_id,
  tls_in_transit: vendorSelfAttestations.tls_in_transit,
  data_subject_rights: vendorSelfAttestations.data_subject_rights,
  controller_or_processor: vendorSelfAttestations.controller_or_processor,
  sub_processors: vendorSelfAttestations.sub_processors,
  vulnerability_disclosure_policy: vendorSelfAttestations.vulnerability_disclosure_policy,
  bug_bounty: vendorSelfAttestations.bug_bounty,
  independent_pen_test_frequency: vendorSelfAttestations.independent_pen_test_frequency,
  dpa_available: vendorSelfAttestations.dpa_available,
  dpa_url: vendorSelfAttestations.dpa_url,
};

export function parseAttestationExtendedFields(get: (key: string) => unknown) {
  const versionsModels = asOptionalBool(get("versions_models"));
  const isMultiTenant = asOptionalBool(get("is_multi_tenant"));
  const encryptionAtRest = normalizeEncryptionAtRest(get("encryption_at_rest"));
  return {
    production_model_monitoring: asOptionalVarchar(get("production_model_monitoring"), 50),
    critical_incident_response_target: asOptionalVarchar(
      get("critical_incident_response_target"),
      30,
    ),
    critical_incident_resolution_target: asOptionalVarchar(
      get("critical_incident_resolution_target"),
      30,
    ),
    ir_plan_test_frequency: asOptionalVarchar(get("ir_plan_test_frequency"), 30),
    incident_customer_communication: asOptionalVarchar(
      get("incident_customer_communication"),
      30,
    ),
    support_coverage: asOptionalVarchar(get("support_coverage"), 40),
    account_management: asOptionalVarchar(get("account_management"), 40),
    versions_models: versionsModels,
    model_versioning_method:
      versionsModels === true ? asOptionalVarchar(get("model_versioning_method"), 50) : null,
    privacy_programme_scope: asOptionalVarchar(get("privacy_programme_scope"), 50),
    typical_data_volume: asOptionalVarchar(get("typical_data_volume"), 30),
    ai_ethics_governance_maturity: asOptionalVarchar(
      get("ai_ethics_governance_maturity"),
      50,
    ),
    is_multi_tenant: isMultiTenant,
    tenant_isolation_model:
      isMultiTenant === true ? asOptionalVarchar(get("tenant_isolation_model"), 50) : null,
    deployment_customization: asOptionalVarchar(get("deployment_customization"), 40),
    integration_complexity: asOptionalVarchar(get("integration_complexity"), 40),
    encryption_at_rest: encryptionAtRest,
    encryption_at_rest_evidence_id:
      encryptionAtRest == null || encryptionAtRest === "not_disclosed"
        ? null
        : asOptionalVarchar(get("encryption_at_rest_evidence_id"), 255),
    tls_in_transit: normalizeTlsInTransit(get("tls_in_transit")),
    data_subject_rights: asStringArray(get("data_subject_rights")),
    controller_or_processor: oneOf(get("controller_or_processor"), CONTROLLER_OR_PROCESSOR, 20),
    sub_processors: normalizeSubProcessors(get("sub_processors")),
    vulnerability_disclosure_policy: normalizeVdp(get("vulnerability_disclosure_policy")),
    bug_bounty: normalizeBugBounty(get("bug_bounty")),
    independent_pen_test_frequency: oneOf(
      get("independent_pen_test_frequency"),
      PEN_TEST_FREQUENCY,
      30,
    ),
    dpa_available: oneOf(get("dpa_available"), DPA_AVAILABLE, 30),
    dpa_url:
      oneOf(get("dpa_available"), DPA_AVAILABLE, 30) === "publicly_available"
        ? asOptionalVarchar(get("dpa_url"), 500)
        : null,
  };
}

export function mapExtendedFieldsToApi(row: Record<string, unknown>) {
  return {
    production_model_monitoring: row.production_model_monitoring ?? undefined,
    critical_incident_response_target: row.critical_incident_response_target ?? undefined,
    critical_incident_resolution_target: row.critical_incident_resolution_target ?? undefined,
    ir_plan_test_frequency: row.ir_plan_test_frequency ?? undefined,
    incident_customer_communication: row.incident_customer_communication ?? undefined,
    support_coverage: row.support_coverage ?? undefined,
    account_management: row.account_management ?? undefined,
    versions_models: boolToYesNo(row.versions_models),
    model_versioning_method: row.model_versioning_method ?? undefined,
    privacy_programme_scope: row.privacy_programme_scope ?? undefined,
    typical_data_volume: row.typical_data_volume ?? undefined,
    ai_ethics_governance_maturity: row.ai_ethics_governance_maturity ?? undefined,
    is_multi_tenant: boolToYesNo(row.is_multi_tenant),
    tenant_isolation_model: row.tenant_isolation_model ?? undefined,
    deployment_customization: row.deployment_customization ?? undefined,
    integration_complexity: row.integration_complexity ?? undefined,
    encryption_at_rest:
      row.encryption_at_rest ??
      (String(row.status ?? "").toUpperCase() === "COMPLETED" ? "not_disclosed" : undefined),
    encryption_at_rest_evidence_id: row.encryption_at_rest_evidence_id ?? undefined,
    tls_in_transit: row.tls_in_transit ?? undefined,
    data_subject_rights: Array.isArray(row.data_subject_rights)
      ? row.data_subject_rights
      : [],
    controller_or_processor: row.controller_or_processor ?? undefined,
    sub_processors: Array.isArray(row.sub_processors) ? row.sub_processors : [],
    vulnerability_disclosure_policy: row.vulnerability_disclosure_policy ?? undefined,
    bug_bounty: row.bug_bounty ?? undefined,
    independent_pen_test_frequency: row.independent_pen_test_frequency ?? undefined,
    dpa_available: row.dpa_available ?? undefined,
    dpa_url: row.dpa_url ?? undefined,
  };
}
