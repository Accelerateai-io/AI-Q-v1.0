/**
 * Preview step for Vendor Self Attestation: shows Company Profile, Document Uploads, and all attestation data.
 * Uses the same UI as Vendor Onboarding preview (vendor_preview cards). Document rows keep View/Edit actions.
 */
import React from "react";
import { Eye, ShieldCheck, CircleArrowUp, ExternalLink } from "lucide-react";
import type { VendorSelfAttestationFormState } from "../../../types/vendorSelfAttestation";
import { VENDOR_SELF_ATTESTATION } from "../../../constants/vendorAttestionData";
import { ATTESTATION_SECTION_FIELDS } from "../../../constants/vendorAttestationFields";
import { DOCUMENT_CATEGORIES } from "../../../constants/vendorAttestationDocumentConstants";
import {
  BUG_BOUNTY_STATUS_OPTIONS,
  VDP_STATUS_OPTIONS,
  getAttestationFieldOptions,
} from "../../../constants/vendorAttestationOptions";
import {
  FINANCIAL_POSITION_OPTIONS,
  FUNDING_STATUS_OPTIONS,
} from "../../../constants/vendorOnboardingData";
import { formatPreviewValueAsString } from "../../../utils/formatPreviewValue";
import { formatFedrampAuthorization } from "../../../utils/fedrampAuthorization";
import { formatDateDDMMMYYYY } from "../../../utils/formatDate.js";
import { personalizeAttestationFieldLabel } from "../../../utils/attestationFieldLabel";
import "../VendorOnboarding/StepVendorOnboardingPreview.css";
import "./vendor_attestation_preview.css";

/** Step index for Document Upload section; Compliance & Certifications (Regulatory upload); Evidence & Supporting Documentation (Testing and Policy upload). */
const STEP_DOCUMENT_UPLOAD = 1;
const STEP_AI_TECHNICAL = 3;
const STEP_COMPLIANCE_CERTIFICATIONS = 4;
const STEP_EVIDENCE = 10;

export type ComplianceDocumentExpiryMeta = {
  category?: string;
  expiryAt?: string | null;
  error?: string;
  documentClass?: string;
  validation?: {
    isValid?: boolean;
    reason?: string;
    mismatch?: boolean;
    expired?: boolean;
  };
};

interface StepVendorSelfAttestationPrevProps {
  formState: VendorSelfAttestationFormState;
  /** When provided, edit icon navigates to the given step (Document Upload = 1, Evidence = 9). */
  onNavigateToStep?: (step: number) => void;
  /** When provided, document names in Document Uploads are clickable and open the document. */
  attestationId?: string | null;
  /** Called when user clicks a document name; receives file name. Use to fetch with auth and open in new tab. */
  onOpenDocument?: (fileName: string) => void;
  /** Parsed PDF expiry metadata keyed by file name (from compliance_document_expiries). */
  complianceDocumentExpiries?: Record<string, ComplianceDocumentExpiryMeta> | null;
  /** Used when company profile vendorName is empty (organization name). */
  vendorNameFallback?: string | null;
}

function lookupComplianceExpiry(
  fileName: string,
  map: Record<string, ComplianceDocumentExpiryMeta> | undefined | null,
): ComplianceDocumentExpiryMeta | null {
  if (!map || typeof map !== "object" || !fileName?.trim()) return null;
  const key = fileName.trim();
  const base = /[/\\]/.test(key) ? (key.split(/[/\\]/).pop() ?? key) : key;
  const meta = map[key] ?? map[base];
  return meta && typeof meta === "object" ? meta : null;
}

function ComplianceExpiryBesideView({ fileName, expiries }: { fileName: string; expiries?: Record<string, ComplianceDocumentExpiryMeta> | null }) {
  const meta = lookupComplianceExpiry(fileName, expiries);
  if (!meta) return null;
  const exp = meta.expiryAt?.trim();
  if (exp && !Number.isNaN(new Date(exp).getTime())) {
    const d = new Date(exp);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const past = d.getTime() < today.getTime();
    return (
      <span
        className={`preview_regulatory_doc_expiry ${past ? "preview_regulatory_doc_expiry_past" : ""}`}
        title="Certificate expiry from document"
      >
        Expires: {formatDateDDMMMYYYY(exp)}
      </span>
    );
  }
  const err = (meta.error ?? "").trim();
  return (
    <span className="preview_regulatory_doc_expiry preview_regulatory_doc_expiry_na" title={err || undefined}>
      {err.toLowerCase().includes("not detected") ? "Expiry not detected" : err || "—"}
    </span>
  );
}

type VendorAttestationPreviewDocumentRowActionsProps = {
  step: number;
  show: boolean;
  documentNames?: string[];
  showUpdate?: boolean;
  onUpdate?: () => void;
  attestationId?: string | null;
  onOpenDocument?: (fileName: string) => void;
  onNavigateToStep?: (step: number) => void;
};

/** Actions for a document row: View opens document(s) when onOpenDocument is provided (no navigation); otherwise navigates to section. */
function VendorAttestationPreviewDocumentRowActions({
  step,
  show,
  documentNames = [],
  showUpdate = false,
  onUpdate,
  attestationId,
  onOpenDocument,
  onNavigateToStep,
}: VendorAttestationPreviewDocumentRowActionsProps) {
  const canOpenDocs = documentNames.length > 0 && Boolean(attestationId && onOpenDocument);
  const showView = show && (canOpenDocs || onNavigateToStep);
  const showUpdateBtn = showUpdate && onUpdate;
  if (!showView && !showUpdateBtn) return null;
  const handleViewClick = () => {
    if (canOpenDocs) {
      documentNames.forEach((name) => onOpenDocument?.(name));
    } else if (onNavigateToStep) {
      onNavigateToStep(step);
    }
  };
  return (
    <span className="preview-doc-actions">
      {showView && (
        <button
          type="button"
          className="preview-view-btn"
          onClick={handleViewClick}
          title={canOpenDocs ? "Open document" : "View section"}
        >
          <Eye size={14} aria-hidden />
          <span style={{ marginLeft: "0.25rem" }}>View</span>
        </button>
      )}
      {showUpdateBtn && (
        <button
          type="button"
          className="preview-update-btn"
          onClick={onUpdate}
          title="Replace document"
        >
          <CircleArrowUp size={16} aria-hidden />
          <span style={{ marginLeft: "0.25rem" }}>Update</span>
        </button>
      )}
    </span>
  );
}

/** User-friendly preview: multi-select/industry/dependent dropdown as readable text, never raw array or JSON. */
function formatValue(val: unknown, fieldKey?: string): string {
  if (fieldKey && Array.isArray(val)) {
    const options = getAttestationFieldOptions(fieldKey);
    const labels = val.map((item) => {
      const s = String(item);
      return options?.find((option) => option.value === s)?.label ?? s;
    });
    return formatPreviewValueAsString(labels);
  }
  if (fieldKey && typeof val === "string") {
    const match = getAttestationFieldOptions(fieldKey)?.find((option) => option.value === val)
    if (match) return match.label
  }
  return formatPreviewValueAsString(val);
}

function optionLabel(options: { label: string; value: string }[], value?: string | null): string {
  if (!value) return "N/A";
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatVdp(value: VendorSelfAttestationFormState["attestation"]["vulnerability_disclosure_policy"]): string {
  if (!value?.status) return "N/A";
  const parts = [optionLabel(VDP_STATUS_OPTIONS, value.status)];
  if (value.url) parts.push(value.url);
  if (value.ack_sla_hours) parts.push(`Ack SLA: ${value.ack_sla_hours}h`);
  return parts.join(" · ");
}

function formatBugBounty(value: VendorSelfAttestationFormState["attestation"]["bug_bounty"]): string {
  if (!value?.status) return "N/A";
  const parts = [optionLabel(BUG_BOUNTY_STATUS_OPTIONS, value.status)];
  if (value.url) parts.push(value.url);
  if (value.scope) parts.push(`Scope: ${value.scope}`);
  return parts.join(" · ");
}

function formatDataSubjectRights(
  rights?: string[] | null,
  role?: string | null,
): string {
  const rightsText = (rights ?? [])
    .map((right) => formatValue(right, "data_subject_rights"))
    .filter((text) => text && text !== "N/A")
    .join(", ");
  const roleText = formatValue(role, "controller_or_processor");
  if (!rightsText && roleText === "N/A") return "N/A";
  if (!rightsText) return roleText;
  if (roleText === "N/A") return rightsText;
  return `${rightsText} · ${roleText}`;
}

function formatSecurityIncidents(
  answer: VendorSelfAttestationFormState["attestation"]["has_public_security_incident"],
  incidents: VendorSelfAttestationFormState["attestation"]["security_incidents"],
): string {
  const rows = (incidents ?? []).filter((item) => item?.summary?.trim() || item?.date?.trim());
  if (!rows.length) return answer === "no" ? "No" : answer === "yes" ? "Yes" : "N/A";
  const detail = rows
    .map((item) => {
      const date = item.date?.trim() || "Date not provided";
      const severity = item.severity?.trim() || "unspecified severity";
      const status = item.resolved ? "resolved" : "open";
      const summary = item.summary?.trim() || "No summary";
      const source = (item.sourceUrl ?? item.source_url ?? "").trim();
      return `${date} — ${severity} — ${status}: ${summary}${source ? ` (${source})` : ""}`;
    })
    .join("; ");
  return `Yes · ${detail}`;
}

function subProcessorHref(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(url)) return `https://${url}`;
  return "";
}

function SubProcessorsPreview({
  value,
}: {
  value: VendorSelfAttestationFormState["attestation"]["sub_processors"];
}) {
  const rows = (value ?? []).filter((item) => item?.name?.trim());
  if (!rows.length) {
    return <span className="vendor_preview_na">No sub-processors listed</span>;
  }
  return (
    <div className="preview_subprocessor_table_wrap">
      <table className="preview_subprocessor_table">
        <thead>
          <tr>
            <th scope="col" className="preview_subprocessor_col_name">Name</th>
            <th scope="col" className="preview_subprocessor_col_purpose">Purpose</th>
            <th scope="col" className="preview_subprocessor_col_region">Region</th>
            <th scope="col" className="preview_subprocessor_col_source">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => {
            const name = item.name.trim();
            const purpose = item.purpose?.trim() ?? "";
            const region = item.region?.trim() ?? "";
            const source = item.source_url?.trim() ?? "";
            const href = subProcessorHref(source);
            return (
              <tr key={`${name}-${index}`}>
                <td className="preview_subprocessor_col_name">{name}</td>
                <td className="preview_subprocessor_col_purpose">{purpose || "—"}</td>
                <td className="preview_subprocessor_col_region">{region || "—"}</td>
                <td className="preview_subprocessor_col_source">
                  {href ? (
                    <a
                      className="preview_subprocessor_link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={12} aria-hidden />
                      <span>{source}</span>
                    </a>
                  ) : (
                    source || "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StepVendorSelfAttestationPrev({
  formState,
  onNavigateToStep,
  attestationId,
  onOpenDocument,
  complianceDocumentExpiries,
  vendorNameFallback,
}: StepVendorSelfAttestationPrevProps) {
  const { companyProfile, attestation, documentUpload } = formState;

  const canOpenDocument = Boolean(attestationId && onOpenDocument);

  /** Returns display value and whether this row has documents (not N/A). */
  const renderDocumentValue = (names: string[]) => {
    if (!names?.length) return { content: "N/A", isNa: true };
    if (canOpenDocument) {
      return {
        isNa: false,
        content: (
          <>
            <span className="vendor_preview_doc_uploaded_label">Document uploaded: </span>
            {names.map((name, idx) => (
              <span key={`${name}-${idx}`}>
                {idx > 0 && ", "}
                <button
                  type="button"
                  className="preview-doc-link"
                  onClick={() => onOpenDocument?.(name)}
                >
                  {name}
                </button>
              </span>
            ))}
          </>
        ),
      };
    }
    return {
      isNa: false,
      content: (
        <>
          <span className="vendor_preview_doc_uploaded_label">Document uploaded: </span>
          {names.join(", ")}
        </>
      ),
    };
  };

  const vendorNameDisplay = (() => {
    const fromProfile = String(companyProfile.vendorName ?? "").trim();
    if (fromProfile && fromProfile.toLowerCase() !== "n/a" && fromProfile.toLowerCase() !== "na") {
      return fromProfile;
    }
    const fallback = String(vendorNameFallback ?? "").trim();
    return fallback || fromProfile;
  })();

  const companyProfileRows: { label: string; value: string }[] = [
    { label: "Vendor Name", value: formatValue(vendorNameDisplay) },
    { label: "Vendor Type", value: formatValue(companyProfile.vendorType) },
    { label: "Vendor Maturity", value: formatValue(companyProfile.vendorMaturity) },
    { label: "Company Website", value: formatValue(companyProfile.companyWebsite) },
    { label: "Company Description", value: formatValue(companyProfile.companyDescription) },
    { label: "Employee Count", value: formatValue(companyProfile.employeeCount) },
    { label: "Year Founded", value: formatValue(companyProfile.yearFounded) },
    { label: "Headquarters", value: formatValue(companyProfile.headquartersLocation) },
    { label: "Operating Regions", value: formatValue(companyProfile.operatingRegions) },
    { label: "Funding Status", value: optionLabel(FUNDING_STATUS_OPTIONS, companyProfile.fundingStatus) },
    { label: "Financial Position", value: optionLabel(FINANCIAL_POSITION_OPTIONS, companyProfile.financialPosition) },
    { label: "Enterprise Customers", value: formatValue(companyProfile.enterpriseCustomers) },
    {
      label: "Annual Customer Retention Rate",
      value: companyProfile.customerRetentionRate
        ? `${companyProfile.customerRetentionRate}%`
        : formatValue(companyProfile.customerRetentionRate),
    },
  ];

  /** Compliance certifications evidence — one heading, then list: "1. SOC2 Type 2 document uploaded  verified view update" */
  const allowedCertificationValues = new Set<string>(DOCUMENT_CATEGORIES.map((c) => c.value));
  const selectedCertCategories =
    documentUpload?.["2"]?.categories?.filter(
      (category) => allowedCertificationValues.has(category) && category !== "None",
    ) ?? [];
  const regulatoryRows = (
    <div className="vendor_preview_row vendor_preview_row_regulatory">
      <dt className="vendor_preview_label">
        <span className="vendor_preview_doc_label">
          <span>Which compliance certifications do you hold? (attach evidence for each)</span>
          {selectedCertCategories.length === 0 && onNavigateToStep && (
            <span className="preview-doc-actions">
              <button
                type="button"
                className="preview-update-btn"
                onClick={() => onNavigateToStep(STEP_COMPLIANCE_CERTIFICATIONS)}
                title="Add documents"
              >
                <CircleArrowUp size={16} aria-hidden />
                <span style={{ marginLeft: "0.25rem" }}>Update</span>
              </button>
            </span>
          )}
        </span>
      </dt>
      <dd className="vendor_preview_value vendor_preview_value_regulatory_list">
        {selectedCertCategories.length > 0 ? (
          <ol className="preview_regulatory_doc_list">
            {selectedCertCategories.map((category) => {
              const names = documentUpload!["2"]!.byCategory![category] ?? [];
              const fileName = names[0];
              const meta = fileName
                ? lookupComplianceExpiry(fileName, complianceDocumentExpiries)
                : null;
              const expired =
                meta?.validation?.expired === true ||
                Boolean(
                  meta?.expiryAt &&
                    !Number.isNaN(new Date(meta.expiryAt).getTime()) &&
                    new Date(meta.expiryAt).getTime() < Date.now(),
                );
              const mismatch = meta?.validation?.mismatch === true;
              const verified = Boolean(fileName) && meta?.validation?.isValid === true && !expired && !mismatch;
              const badgeLabel = !fileName
                ? "Pending evidence"
                : mismatch
                  ? "Mismatch"
                  : expired
                    ? "Expired"
                    : verified
                      ? "Verified"
                      : "Unverified";
              return (
                <li key={category} className="preview_regulatory_doc_item">
                  <span className="preview_regulatory_doc_line">
                    <span className="preview_regulatory_doc_category">{category}</span>
                    <span className="preview_regulatory_doc_uploaded"> {fileName ?? ""}</span>
                  </span>
                  <span className="preview-doc-actions">
                    <span className="preview-regulatory-verified" title={meta?.validation?.reason || badgeLabel}>
                      <ShieldCheck size={14} aria-hidden />
                      <span>{badgeLabel}</span>
                    </span>
                    {fileName ? (
                      <ComplianceExpiryBesideView fileName={fileName} expiries={complianceDocumentExpiries} />
                    ) : null}
                    {canOpenDocument && fileName && (
                      <button
                        type="button"
                        className="preview-view-btn"
                        onClick={() => onOpenDocument?.(fileName)}
                        aria-label={`View ${fileName}`}
                      >
                        <Eye size={14} aria-hidden />
                        <span style={{ marginLeft: "0.25rem" }}>View</span>
                      </button>
                    )}
                    {onNavigateToStep && (
                      <button
                        type="button"
                        className="preview-update-btn"
                        onClick={() => onNavigateToStep(STEP_COMPLIANCE_CERTIFICATIONS)}
                        title="Upload document"
                      >
                        <CircleArrowUp size={16} aria-hidden />
                        <span style={{ marginLeft: "0.25rem" }}>Update</span>
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <>N/A</>
        )}
      </dd>
    </div>
  );

  return (
    <div className="vendor_preview vendor-attestation-preview">
      <p className="vendor_preview_intro">
        Review your attestation below.
      </p>
      <div className="vendor_preview_sections">
        {/* Company Profile */}
        <section className="vendor_preview_card">
          <h3 className="vendor_preview_card_title">Company Profile</h3>
          <dl className="vendor_preview_list">
            {companyProfileRows.map((row) => (
              <div key={row.label} className="vendor_preview_row">
                <dt className="vendor_preview_label">{row.label}</dt>
                <dd className="vendor_preview_value">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Document Uploads: same UI as Company Profile (dl list) */}
        <section className="vendor_preview_card">
          <h3 className="vendor_preview_card_title">Document Uploads</h3>
          <dl className="vendor_preview_list">
            {(() => {
              const names0 = documentUpload?.["0"] ?? [];
              const doc0 = renderDocumentValue(names0);
              return (
                <div key="doc0" className="vendor_preview_row">
                  <dt className="vendor_preview_label">
                    <span className="vendor_preview_doc_label">
                      <span>{VENDOR_SELF_ATTESTATION.document_upload["0"]?.label ?? "Marketing and Product Material"}</span>
                      <VendorAttestationPreviewDocumentRowActions
                        step={STEP_DOCUMENT_UPLOAD}
                        show={!doc0.isNa}
                        documentNames={names0}
                        attestationId={attestationId}
                        onOpenDocument={onOpenDocument}
                        onNavigateToStep={onNavigateToStep}
                      />
                    </span>
                  </dt>
                  <dd className="vendor_preview_value">{doc0.content}</dd>
                </div>
              );
            })()}
            {(() => {
              const names1 = documentUpload?.["1"] ?? [];
              const doc1 = renderDocumentValue(names1);
              return (
                <div key="doc1" className="vendor_preview_row">
                  <dt className="vendor_preview_label">
                    <span className="vendor_preview_doc_label">
                      <span>{VENDOR_SELF_ATTESTATION.document_upload["1"]?.label ?? "Technical Product Specifications Material"}</span>
                      <VendorAttestationPreviewDocumentRowActions
                        step={STEP_DOCUMENT_UPLOAD}
                        show={!doc1.isNa}
                        documentNames={names1}
                        attestationId={attestationId}
                        onOpenDocument={onOpenDocument}
                        onNavigateToStep={onNavigateToStep}
                      />
                    </span>
                  </dt>
                  <dd className="vendor_preview_value">{doc1.content}</dd>
                </div>
              );
            })()}
            {(() => {
              const evidenceNames = documentUpload?.evidenceTestingPolicy ?? [];
              const evidenceDoc = renderDocumentValue(evidenceNames);
              return (
                <div key="evidence" className="vendor_preview_row">
                  <dt className="vendor_preview_label">
                    <span className="vendor_preview_doc_label">
                      <span>Testing and Policy Documentation</span>
                      <VendorAttestationPreviewDocumentRowActions
                        step={STEP_EVIDENCE}
                        show={!evidenceDoc.isNa}
                        documentNames={evidenceNames}
                        attestationId={attestationId}
                        onOpenDocument={onOpenDocument}
                        onNavigateToStep={onNavigateToStep}
                      />
                    </span>
                  </dt>
                  <dd className="vendor_preview_value">{evidenceDoc.content}</dd>
                </div>
              );
            })()}
          </dl>
        </section>

        {/* Attestation sections (dynamic fields) */}
        {Object.entries(ATTESTATION_SECTION_FIELDS).map(([sectionKey, mappings]) => {
          const sectionData = (VENDOR_SELF_ATTESTATION as Record<string, Record<string, { label: string }>>)[sectionKey];
          if (!sectionData || !mappings.length) return null;
          const title = sectionKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const entries = Object.entries(sectionData)
            .filter(([k]) => k !== "length" && Object.prototype.hasOwnProperty.call(sectionData, k))
            .sort((a, b) => Number(a[0]) - Number(b[0]));
          const isComplianceCertifications = sectionKey === "compliance_certifications";
          return (
            <section key={sectionKey} className="vendor_preview_card">
              <h3 className="vendor_preview_card_title">{title}</h3>
              <dl className="vendor_preview_list">
                {entries.map(([dataIndexStr, fieldConfig]) => {
                  const dataIndex = Number(dataIndexStr);
                  const mapping = mappings[dataIndex];
                  if (!mapping) return null;
                  const val = attestation[mapping.key];
                  const rowLabel = personalizeAttestationFieldLabel(
                    fieldConfig.label,
                    attestation.product_name,
                  );
                  return (
                    <div key={mapping.key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{rowLabel}</dt>
                      <dd className="vendor_preview_value">{formatValue(val, mapping.key)}</dd>
                    </div>
                  );
                })}
                {sectionKey === "ai_technical_capabilities" && (
                  <div key="versions_models" className="vendor_preview_row">
                    <dt className="vendor_preview_label">Do you version models, and how?</dt>
                    <dd className="vendor_preview_value">
                      {attestation.versions_models === "yes"
                        ? `Yes · ${formatValue(attestation.model_versioning_method, "model_versioning_method")}`
                        : attestation.versions_models === "no"
                          ? "No"
                          : "N/A"}
                    </dd>
                  </div>
                )}
                {sectionKey === "deployment_architecture" && (
                  <div key="is_multi_tenant" className="vendor_preview_row">
                    <dt className="vendor_preview_label">
                      Is the product multi-tenant? What isolation model?
                    </dt>
                    <dd className="vendor_preview_value">
                      {attestation.is_multi_tenant === "yes"
                        ? `Yes · ${formatValue(attestation.tenant_isolation_model, "tenant_isolation_model")}`
                        : attestation.is_multi_tenant === "no"
                          ? "No"
                          : "N/A"}
                    </dd>
                  </div>
                )}
                {sectionKey === "ai_technical_capabilities" &&
                  attestation.documented_ai_governance_policy === "Yes" &&
                  (() => {
                    const names = documentUpload?.aiGovernancePolicy ?? [];
                    const doc = renderDocumentValue(names);
                    return (
                      <div key="ai-gov-policy-upload" className="vendor_preview_row">
                        <dt className="vendor_preview_label">
                          <span className="vendor_preview_doc_label">
                            <span>AI Governance policy document</span>
                            <VendorAttestationPreviewDocumentRowActions
                              step={STEP_AI_TECHNICAL}
                              show={!doc.isNa}
                              documentNames={names}
                              attestationId={attestationId}
                              onOpenDocument={onOpenDocument}
                              onNavigateToStep={onNavigateToStep}
                            />
                          </span>
                        </dt>
                        <dd className="vendor_preview_value">{doc.content}</dd>
                      </div>
                    );
                  })()}
                {sectionKey === "data_handling_privacy" && (
                  <>
                    <div key="data_subject_rights" className="vendor_preview_row">
                      <dt className="vendor_preview_label">
                        Which data subject rights do you support, and in what role?
                      </dt>
                      <dd className="vendor_preview_value">
                        {formatDataSubjectRights(
                          attestation.data_subject_rights,
                          attestation.controller_or_processor,
                        )}
                      </dd>
                    </div>
                    <div key="encryption_at_rest" className="vendor_preview_row">
                      <dt className="vendor_preview_label">What encryption do you apply at rest?</dt>
                      <dd className="vendor_preview_value">
                        {formatValue(attestation.encryption_at_rest, "encryption_at_rest")}
                        {attestation.encryption_at_rest_evidence_id
                          ? ` · Evidence: ${attestation.encryption_at_rest_evidence_id}`
                          : ""}
                      </dd>
                    </div>
                  </>
                )}
                {sectionKey === "ai_safety_testing" && (
                  <>
                    <div key="vdp" className="vendor_preview_row">
                      <dt className="vendor_preview_label">Do you publish a VDP?</dt>
                      <dd className="vendor_preview_value">
                        {formatVdp(attestation.vulnerability_disclosure_policy)}
                      </dd>
                    </div>
                    <div key="bug_bounty" className="vendor_preview_row">
                      <dt className="vendor_preview_label">Do you run a bug bounty?</dt>
                      <dd className="vendor_preview_value">
                        {formatBugBounty(attestation.bug_bounty)}
                      </dd>
                    </div>
                  </>
                )}
                {sectionKey === "operations_reliability" && (
                  <div key="security_incidents" className="vendor_preview_row">
                    <dt className="vendor_preview_label">
                      Have you had a publicly disclosed security incident in the last 24 months?
                    </dt>
                    <dd className="vendor_preview_value">
                      {formatSecurityIncidents(
                        attestation.has_public_security_incident,
                        attestation.security_incidents,
                      )}
                    </dd>
                  </div>
                )}
                {sectionKey === "vendor_management" && (
                  <div key="sub_processors" className="vendor_preview_row vendor_preview_row_stack">
                    <dt className="vendor_preview_label">List your sub-processors</dt>
                    <dd className="vendor_preview_value preview_subprocessor_value">
                      <SubProcessorsPreview value={attestation.sub_processors} />
                    </dd>
                  </div>
                )}
                {isComplianceCertifications && (
                  <div key="fedramp_authorization" className="vendor_preview_row">
                    <dt className="vendor_preview_label">
                      Do you hold a FedRAMP authorization? Level and boundary
                    </dt>
                    <dd className="vendor_preview_value">
                      {formatFedrampAuthorization(attestation.fedramp_authorization)}
                    </dd>
                  </div>
                )}
                {isComplianceCertifications && regulatoryRows}
              </dl>
            </section>
          );
        })}

      </div>
    </div>
  );
}

export default StepVendorSelfAttestationPrev;