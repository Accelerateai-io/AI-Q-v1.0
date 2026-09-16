/**
 * Vendor Self Attestation – Compliance & Certifications tab content.
 * Includes "Which compliance certifications do you hold? (attach evidence for each)" upload (moved from Document Upload).
 * Uses standard FileUpload UI per certification (one file, max 10MB).
 */
import type { ReactNode } from "react";
import { toast } from "react-toastify";
import AttestationDynamicStep from "../AttestationDynamicStep";
import FormField from "../../../UI/FormField";
import FileUpload from "../../../UI/FileUpload";
import ChipMultiSelect from "../../../UI/ChipMultiSelect";
import Select from "../../../UI/Select";
import Input from "../../../UI/Input";
import {
  DOCUMENT_CATEGORIES,
  MAX_FILE_SIZE_BYTES,
} from "../../../../constants/vendorAttestationDocumentConstants";
import {
  FEDRAMP_LEVEL_OPTIONS,
  FEDRAMP_STATUS_OPTIONS,
} from "../../../../constants/vendorAttestationOptions";
import type {
  VendorSelfAttestationPayload,
  DocumentUploadState,
  FedrampAuthorization,
} from "../../../../types/vendorSelfAttestation";
import {
  EMPTY_FEDRAMP_AUTHORIZATION,
  needsFedrampDetails,
  normalizeFedrampAuthorization,
} from "../../../../utils/fedrampAuthorization";

export interface TabComplianceCertificationsProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
  documentUpload?: DocumentUploadState;
  setDocumentUpload?: React.Dispatch<React.SetStateAction<DocumentUploadState>>;
  attestationId?: string | null;
  onUploadDocument?: (attestationId: string, file: File) => Promise<string>;
  onStorePendingFiles?: (
    slot: "0" | "1" | "2" | "evidenceTestingPolicy" | "aiGovernancePolicy",
    files: File[],
    category?: string,
  ) => void;
  onOpenDocument?: (fileName: string) => void;
}

const REGULATORY_LABEL = "Which compliance certifications do you hold? (attach evidence for each)";
const REGULATORY_PLACEHOLDER =
  "Select certification types; for each certificate you can upload one file (max 10MB). Documents are parsed for assessment information.";
const NONE_CERTIFICATION_VALUE = "None";

function TabComplianceCertifications({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "Compliance & Certifications",
  subTitle,
  icon,
  documentUpload,
  setDocumentUpload,
  attestationId,
  onUploadDocument,
  onStorePendingFiles,
  onOpenDocument,
}: TabComplianceCertificationsProps) {
  const regulatory = documentUpload?.["2"] ?? { categories: [], byCategory: {} };
  const categories = regulatory.categories ?? [];
  const byCategory = regulatory.byCategory ?? {};
  const allowedCertificationValues = new Set<string>(DOCUMENT_CATEGORIES.map((c) => c.value));
  const selectedUploadCategories = categories.filter(
    (category) =>
      category !== NONE_CERTIFICATION_VALUE && allowedCertificationValues.has(category),
  );
  const hasNoCertificationsSelected = categories.includes(NONE_CERTIFICATION_VALUE);

  const setRegulatoryCategories = (selected: string[]) => {
    setDocumentUpload?.((prev) => {
      const prev2 = prev["2"] ?? { categories: [], byCategory: {} };
      return {
        ...prev,
        "2": {
          categories: selected,
          byCategory: selected.reduce(
            (acc, cat) => ({ ...acc, [cat]: prev2.byCategory?.[cat] ?? [] }),
            {} as Record<string, string[]>
          ),
        },
      };
    });
  };

  const setFilesForCategory = (category: string, fileNames: string[]) => {
    setDocumentUpload?.((prev) => {
      const prev2 = prev["2"] ?? { categories: [], byCategory: {} };
      return {
        ...prev,
        "2": {
          ...prev2,
          byCategory: { ...(prev2.byCategory ?? {}), [category]: fileNames },
        },
      };
    });
  };

  const handleFilesChangeForCategory = async (
    category: string,
    fileNames: string[],
    selectedFiles?: File[],
  ) => {
    const current = byCategory[category] ?? [];
    if (attestationId && onUploadDocument && selectedFiles?.length) {
      const uploaded: string[] = [];
      for (const file of selectedFiles) {
        try {
          uploaded.push(await onUploadDocument(attestationId, file));
        } catch {
          uploaded.push(file.name);
        }
      }
      setFilesForCategory(category, [...current, ...uploaded]);
    } else {
      if (!attestationId && selectedFiles?.length && onStorePendingFiles) {
        onStorePendingFiles("2", selectedFiles, category);
      }
      setFilesForCategory(category, fileNames);
    }
  };

  const fedramp = normalizeFedrampAuthorization(attestation.fedramp_authorization);
  const showFedrampDetails = needsFedrampDetails(fedramp.status);

  function updateFedramp(patch: Partial<FedrampAuthorization>) {
    const nextStatus = patch.status ?? fedramp.status;
    const next = needsFedrampDetails(nextStatus)
      ? { ...fedramp, ...patch }
      : { ...EMPTY_FEDRAMP_AUTHORIZATION, status: nextStatus };
    setAttestation((prev) => ({ ...prev, fedramp_authorization: next }));
  }

  return (
    <>
      <AttestationDynamicStep
        title={title}
        subTitle={subTitle}
        icon={icon}
        sectionKey="compliance_certifications"
        data={data}
        attestation={attestation}
        setAttestation={setAttestation}
        fieldErrors={fieldErrors}
      />

      {attestation.dpa_available === "publicly_available" && (
        <div className="form_fields_vendor">
          <FormField
            label="DPA URL"
            mandatory={true}
            tooltipText="Public URL for the Data Processing Agreement."
            errorText={fieldErrors?.dpa_url}
          >
            <Input
              labelName=""
              type="url"
              id="dpa_url"
              name="dpa_url"
              value={attestation.dpa_url ?? ""}
              onChange={(e) =>
                setAttestation((prev) => ({ ...prev, dpa_url: e.target.value }))
              }
            />
          </FormField>
        </div>
      )}

      <div className="form_fields_vendor">
        <FormField
          label="Do you hold a FedRAMP authorization? Level and boundary"
          mandatory={true}
          tooltipText="Select authorization status. If authorized or in process, provide level, boundary, marketplace ID, and authorization date."
          errorText={fieldErrors?.fedramp_authorization}
        >
          <Select
            labelName=""
            id="fedramp_authorization_status"
            name="fedramp_authorization_status"
            value={fedramp.status}
            onChange={(e) => updateFedramp({ status: e.target.value })}
            default_option="Select authorization status"
            options={FEDRAMP_STATUS_OPTIONS}
            required
          />
        </FormField>
      </div>

      {showFedrampDetails && (
        <>
          <div className="form_fields_vendor">
            <FormField
              label="FedRAMP level"
              mandatory={true}
              tooltipText="Authorization impact level."
              errorText={fieldErrors?.fedramp_level}
            >
              <Select
                labelName=""
                id="fedramp_authorization_level"
                name="fedramp_authorization_level"
                value={fedramp.level}
                onChange={(e) => updateFedramp({ level: e.target.value })}
                default_option="Select level"
                options={FEDRAMP_LEVEL_OPTIONS}
                required
              />
            </FormField>
          </div>
          <div className="form_fields_vendor">
            <FormField
              label="Authorization boundary"
              mandatory={true}
              tooltipText="Describe the system or offering covered by the authorization."
              errorText={fieldErrors?.fedramp_boundary}
            >
              <Input
                labelName=""
                type="text"
                id="fedramp_authorization_boundary"
                name="fedramp_authorization_boundary"
                value={fedramp.boundary}
                onChange={(e) => updateFedramp({ boundary: e.target.value })}
              />
            </FormField>
          </div>
          <div className="form_fields_vendor">
            <FormField
              label="FedRAMP Marketplace ID"
              mandatory={false}
              tooltipText="Marketplace listing ID, if published."
            >
              <Input
                labelName=""
                type="text"
                id="fedramp_authorization_marketplace_id"
                name="fedramp_authorization_marketplace_id"
                value={fedramp.marketplace_id}
                onChange={(e) => updateFedramp({ marketplace_id: e.target.value })}
              />
            </FormField>
          </div>
          <div className="form_fields_vendor">
            <FormField
              label="Authorized date"
              mandatory={false}
              tooltipText="Date the authorization was granted."
            >
              <Input
                labelName=""
                type="date"
                id="fedramp_authorization_authorized_at"
                name="fedramp_authorization_authorized_at"
                value={fedramp.authorized_at}
                onChange={(e) => updateFedramp({ authorized_at: e.target.value })}
              />
            </FormField>
          </div>
        </>
      )}

      {/* Which compliance certifications do you hold? (attach evidence for each) */}
      {documentUpload != null && setDocumentUpload != null && (
        <div className="form_fields_vendor" style={{ marginTop: "1.5rem" }}>
          {fieldErrors?.regulatoryCertificationMaterial && (
            <p className="orgError" style={{ marginBottom: "0.5rem" }} role="alert">
              {fieldErrors.regulatoryCertificationMaterial}
            </p>
          )}
          <FormField
            label={REGULATORY_LABEL}
            mandatory={true}
            tooltipText={REGULATORY_PLACEHOLDER}
          >
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
              Select certification types and upload one file per certification. Max 10MB per file.
            </p>
            <ChipMultiSelect
              id="regulatory-document-categories-compliance"
              labelName=""
              options={DOCUMENT_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
              value={categories.filter((category) => allowedCertificationValues.has(category))}
              onChange={setRegulatoryCategories}
              globalExclusiveValue={NONE_CERTIFICATION_VALUE}
            />
          </FormField>
          {hasNoCertificationsSelected && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
              No certification selected. File upload is not required.
            </p>
          )}
          {selectedUploadCategories.length > 0 && (
            <div style={{ marginTop: "1rem" }} className="compliance_cert_categories">
              {selectedUploadCategories.map((category) => {
                const docs = byCategory[category] ?? [];
                return (
                  <div key={category} className="form_fields_vendor compliance_cert_category_block" style={{ marginBottom: "1rem" }}>
                    <FormField
                      label={category}
                      mandatory={false}
                      tooltipText={`Upload one file for ${category}. Max 10MB.`}
                    >
                      <FileUpload
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        maxSizeBytes={MAX_FILE_SIZE_BYTES}
                        maxFiles={1}
                        value={byCategory[category] ?? []}
                        onFilesChange={(fileNames, selectedFiles) =>
                          handleFilesChangeForCategory(category, fileNames, selectedFiles)
                        }
                        onValidationError={(msg) => msg && toast.error(msg)}
                        disabled={(byCategory[category] ?? []).length >= 1}
                      />
                    </FormField>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default TabComplianceCertifications;
