import { mapExtendedFieldsToApi } from "./attestationExtendedFields.js";

/**
 * Build certificates array from document_uploads for dashboard display.
 * Slot "2" holds Regulatory and Compliance Certification Material: { categories, byCategory }.
 * Each file is tagged with certificateType from its byCategory key (e.g. ISO 27001), matching the attestation UI.
 */
function buildCertificatesFromDocumentUploads(
  docUploads: unknown,
): Array<{ name: string; expiryDate: string | null; certificateType: string | null }> {
  if (docUploads == null || typeof docUploads !== "object") return [];
  const o = docUploads as Record<string, unknown>;
  const list: Array<{ name: string; expiryDate: string | null; certificateType: string | null }> = [];
  const pushNames = (
    names: unknown[],
    expiryDate: string | null = null,
    certificateType: string | null = null,
  ) => {
    if (!Array.isArray(names)) return;
    const ct = certificateType?.trim() || null;
    for (const n of names) {
      if (typeof n === "object" && n !== null && "name" in n && typeof (n as { name: unknown }).name === "string") {
        const entry = n as {
          name: string;
          expiryDate?: string | null;
          certificateType?: string | null;
          certificate_type?: string | null;
          complianceType?: string | null;
          documentType?: string | null;
        };
        const rowType = (
          entry.certificateType ??
          entry.certificate_type ??
          entry.complianceType ??
          entry.documentType ??
          ct
        )
          ?.trim() || null;
        list.push({
          name: entry.name,
          expiryDate: entry.expiryDate ?? null,
          certificateType: rowType,
        });
      } else if (typeof n === "string" && n.trim()) {
        list.push({ name: n.trim(), expiryDate, certificateType: ct });
      }
    }
  };

  const slot2 = o["2"];
  if (Array.isArray(slot2)) {
    pushNames(slot2, null, null);
    return list;
  }
  if (slot2 == null || typeof slot2 !== "object") return list;

  const s = slot2 as Record<string, unknown>;
  const categoriesList = Array.isArray(s.categories)
    ? (s.categories as unknown[]).filter((c): c is string => typeof c === "string" && c.trim() !== "")
    : [];
  const byCat =
    s.byCategory != null && typeof s.byCategory === "object" && !Array.isArray(s.byCategory)
      ? (s.byCategory as Record<string, unknown>)
      : {};

  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  for (const c of categoriesList) {
    if (!seen.has(c)) {
      seen.add(c);
      orderedKeys.push(c);
    }
  }
  for (const k of Object.keys(byCat)) {
    if (!seen.has(k)) {
      seen.add(k);
      orderedKeys.push(k);
    }
  }
  for (const catKey of orderedKeys) {
    const raw = byCat[catKey];
    const arr = Array.isArray(raw) ? raw : [];
    pushNames(arr, null, catKey.trim() || null);
  }
  return list;
}

function mergeCertificateExpiries(
  certificates: Array<{ name: string; expiryDate: string | null; certificateType: string | null }>,
  expiries: unknown,
): Array<{
  name: string;
  expiryDate: string | null;
  certificateType: string | null;
  documentClass?: string;
  frameworkMapping?: unknown;
  validation?: unknown;
}> {
  if (!expiries || typeof expiries !== "object" || Array.isArray(expiries)) return certificates;
  const map = expiries as Record<string, {
    expiryAt?: string | null;
    documentClass?: string;
    frameworkMapping?: unknown;
    validation?: unknown;
  }>;
  return certificates.map((c) => {
    const key = String(c.name ?? "").trim();
    if (!key) return c;
    const base = /[/\\]/.test(key) ? (key.split(/[/\\]/).pop() ?? key) : key;
    const meta = map[key] ?? map[base];
    const exp = meta?.expiryAt;
    return {
      ...c,
      expiryDate: exp != null && String(exp).trim() !== "" ? String(exp).trim() : "Expiry date not specified",
      documentClass: meta?.documentClass,
      frameworkMapping: meta?.frameworkMapping,
      validation: meta?.validation,
    };
  });
}

/** Expiry is 3 months from created date. Returns ISO string or undefined. */
function expiryFromCreatedAt(createdAt: unknown): string | undefined {
  if (createdAt == null) return undefined;
  const d = createdAt instanceof Date ? createdAt : new Date(String(createdAt));
  if (Number.isNaN(d.getTime())) return undefined;
  const expiry = new Date(d);
  expiry.setMonth(expiry.getMonth() + 3);
  return expiry.toISOString();
}

function parseSectorFromRow(row: Record<string, unknown>): Record<string, unknown> | null {
  const sectorRaw = row.target_industries;
  if (sectorRaw == null) return null;
  if (typeof sectorRaw === "object" && !Array.isArray(sectorRaw)) return sectorRaw as Record<string, unknown>;
  if (typeof sectorRaw === "string" && sectorRaw.trim()) {
    try {
      const p = JSON.parse(sectorRaw) as Record<string, unknown>;
      return typeof p === "object" && p !== null ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Map one attestation row to API shape used by preview and vendor self-attestation fetch. */
export function mapAttestationRow(
  attestRow: Record<string, unknown>,
  completedByName?: string,
): Record<string, unknown> {
  const raw = String(attestRow.status ?? "").toUpperCase();
  const rowStatus = raw === "DRAFT" ? "DRAFT" : raw === "EXPIRED" ? "EXPIRED" : "COMPLETED";
  const document_uploads = attestRow.document_uploads;
  const certificatesMerged = mergeCertificateExpiries(
    buildCertificatesFromDocumentUploads(document_uploads),
    attestRow.compliance_document_expiries,
  );
  const certificates = certificatesMerged.map((c) => ({
    name: c.name,
    expiryDate: c.expiryDate,
    certificateType: c.certificateType,
    complianceType: c.certificateType,
    documentClass: c.documentClass,
    frameworkMapping: c.frameworkMapping,
    validation: c.validation,
  }));
  const sector = parseSectorFromRow(attestRow);
  const base: Record<string, unknown> = {
    id: attestRow.id,
    user_id: attestRow.user_id ?? undefined,
    organization_id: attestRow.organization_id ?? undefined,
    vendor_self_attestation_id: attestRow.vendor_self_attestation_id ?? undefined,
    status: rowStatus,
    created_at: attestRow.created_at ?? undefined,
    updated_at: attestRow.updated_at ?? undefined,
    submitted_at: attestRow.submitted_at ?? undefined,
    expiry_at: attestRow.expiry_at != null
      ? (typeof attestRow.expiry_at === "string"
        ? attestRow.expiry_at
        : (attestRow.expiry_at instanceof Date
          ? attestRow.expiry_at.toISOString()
          : String(attestRow.expiry_at)))
      : expiryFromCreatedAt(attestRow.created_at),
    product_name: attestRow.product_name ?? undefined,
    sector: sector ?? undefined,
    visible_to_buyer: attestRow.visible_to_buyer === true || attestRow.visible_to_buyer === 1,
    visible_ai_governance: attestRow.visible_ai_governance === true,
    visible_security_posture: attestRow.visible_security_posture === true,
    visible_data_privacy: attestRow.visible_data_privacy === true,
    visible_compliance: attestRow.visible_compliance === true,
    visible_model_risk: attestRow.visible_model_risk === true,
    visible_data_practices: attestRow.visible_data_practices === true,
    visible_compliance_certifications: attestRow.visible_compliance_certifications === true,
    visible_operations_support: attestRow.visible_operations_support === true,
    visible_vendor_management: attestRow.visible_vendor_management === true,
    visible_company_identity: attestRow.visible_company_identity === true,
    visible_company_reach: attestRow.visible_company_reach === true,
    purchase_decision_makers: attestRow.purchase_decisions_by ?? undefined,
    pain_points_solved: attestRow.pain_points ?? undefined,
    alternatives_considered: attestRow.alternatives_consider ?? undefined,
    unique_value_proposition: attestRow.unique_solution ?? undefined,
    typical_customer_roi: attestRow.roi_value_metrics ?? undefined,
    ai_capabilities: attestRow.product_capabilities ?? undefined,
    ai_model_types: attestRow.ai_models_usage ?? undefined,
    model_transparency: attestRow.ai_model_transparency ?? undefined,
    decision_autonomy: attestRow.ai_autonomy_level ?? undefined,
    documented_ai_governance_policy: attestRow.documented_ai_governance_policy ?? undefined,
    security_certifications: attestRow.security_compliance_certificates ?? undefined,
    assessment_completion_level: attestRow.assessment_feedback ?? undefined,
    audit_frequency: attestRow.audit_frequency ?? undefined,
    hipaa_baa: attestRow.hipaa_baa ?? undefined,
    fedramp_authorization: attestRow.fedramp_authorization ?? undefined,
    ...mapExtendedFieldsToApi(attestRow),
    trust_centre_url: attestRow.trust_centre_url ?? undefined,
    has_public_security_incident: attestRow.has_public_security_incident ?? undefined,
    security_incidents: Array.isArray(attestRow.security_incidents)
      ? attestRow.security_incidents
      : [],
    pii_handling: attestRow.pii_information ?? undefined,
    data_residency_options: attestRow.data_residency_options ?? undefined,
    data_retention_policy: attestRow.data_retention_policy ?? undefined,
    bias_testing_approach: attestRow.bias_ai ?? undefined,
    adversarial_security_testing: attestRow.security_testing ?? undefined,
    human_oversight: attestRow.human_oversight ?? undefined,
    training_data_documentation: attestRow.training_data_document ?? undefined,
    uptime_sla: attestRow.sla_guarantee ?? undefined,
    support_slas: attestRow.support_slas ?? undefined,
    change_management: attestRow.change_management ?? undefined,
    incident_response_plan: attestRow.incident_response_plan ?? undefined,
    rollback_capability: attestRow.rollback_deployment_issues ?? undefined,
    hosting_deployment: attestRow.solution_hosted ?? undefined,
    deployment_scale: attestRow.deployment_scale ?? undefined,
    product_stage: attestRow.stage_product ?? undefined,
    interaction_data_available: attestRow.available_usage_data ?? undefined,
    audit_logs_available: attestRow.audit_logs ?? undefined,
    testing_results_available: attestRow.test_results ?? undefined,
    document_uploads: attestRow.document_uploads ?? undefined,
    certificates,
    compliance_document_expiries: attestRow.compliance_document_expiries ?? undefined,
    framework_mapping_rows: attestRow.framework_mapping_rows ?? undefined,
    generated_profile_report: attestRow.generated_profile_report ?? undefined,
    latest_trust_score:
      attestRow.latest_trust_score != null && Number.isFinite(Number(attestRow.latest_trust_score))
        ? Number(attestRow.latest_trust_score)
        : undefined,
    latest_trust_grade:
      typeof attestRow.latest_trust_grade === "string" && attestRow.latest_trust_grade.trim()
        ? attestRow.latest_trust_grade.trim()
        : undefined,
    userArchivedAt:
      attestRow.user_archived_at != null
        ? attestRow.user_archived_at instanceof Date
          ? attestRow.user_archived_at.toISOString()
          : String(attestRow.user_archived_at)
        : null,
  };
  if (completedByName != null && completedByName !== "") {
    base.completedBy = { name: completedByName };
  }
  return base;
}

/** Build companyProfile from attestation row (saved company profile on the attestation). */
export function companyProfileFromAttestationRow(row: Record<string, unknown>): Record<string, unknown> {
  const sectorRaw = row.target_industries;
  let sector: Record<string, unknown> = {};
  if (sectorRaw != null && typeof sectorRaw === "object" && !Array.isArray(sectorRaw)) {
    sector = sectorRaw as Record<string, unknown>;
  } else if (typeof sectorRaw === "string" && sectorRaw.trim()) {
    try {
      const p = JSON.parse(sectorRaw);
      sector = typeof p === "object" && p !== null ? p : {};
    } catch {
      sector = {};
    }
  }
  const opReg = row.operate_regions;
  const operatingRegions = Array.isArray(opReg)
    ? opReg
    : (opReg != null && typeof opReg === "object" ? (opReg as string[]) : []);
  return {
    vendorType: row.vendor_type ?? "",
    sector,
    vendorMaturity: row.company_stage ?? "",
    companyWebsite: row.company_website ?? "",
    companyDescription: row.company_description ?? "",
    employeeCount: row.no_of_employees ?? "",
    yearFounded: row.year_founded ?? null,
    headquartersLocation: row.headquarter_location ?? "",
    operatingRegions,
    fundingStatus: row.funding_status ?? "",
    financialPosition: row.financial_position ?? "",
    enterpriseCustomers: row.enterprise_customers ?? "",
    customerRetentionRate: row.customer_retention_rate ?? "",
  };
}

/** True if attestation row has any saved company profile data (so we prefer it over onboarding). */
export function attestationHasCompanyProfile(row: Record<string, unknown>): boolean {
  return (
    (row.vendor_type != null && String(row.vendor_type).trim() !== "") ||
    (row.company_website != null && String(row.company_website).trim() !== "") ||
    (row.company_description != null && String(row.company_description).trim() !== "") ||
    (row.company_stage != null && String(row.company_stage).trim() !== "")
  );
}
