/**
 * Vendor Self Attestation – Data Handling & Privacy tab content.
 */
import type { ReactNode } from "react";
import { toast } from "react-toastify";
import AttestationDynamicStep from "../AttestationDynamicStep";
import FormField from "../../../UI/FormField";
import Select from "../../../UI/Select";
import FileUpload from "../../../UI/FileUpload";
import ChipMultiSelect from "../../../UI/ChipMultiSelect";
import type { VendorSelfAttestationPayload } from "../../../../types/vendorSelfAttestation";
import {
  CONTROLLER_OR_PROCESSOR_OPTIONS,
  DATA_SUBJECT_RIGHTS_OPTIONS,
  ENCRYPTION_AT_REST_OPTIONS,
} from "../../../../constants/vendorAttestationOptions";
import { MAX_FILE_SIZE_BYTES } from "../../../../constants/vendorAttestationDocumentConstants";

export interface TabDataHandlingPrivacyProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
  attestationId?: string | null;
  onUploadDocument?: (attestationId: string, file: File) => Promise<string>;
}

function TabDataHandlingPrivacy({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "Data Handling & Privacy",
  subTitle,
  icon,
  attestationId,
  onUploadDocument,
}: TabDataHandlingPrivacyProps) {
  const evidenceName = attestation.encryption_at_rest_evidence_id?.trim() || "";
  const showEvidence = Boolean(attestation.encryption_at_rest) &&
    attestation.encryption_at_rest !== "not_disclosed";

  async function handleEvidenceChange(fileNames: string[], selectedFiles?: File[]) {
    if (attestationId && onUploadDocument && selectedFiles?.length) {
      try {
        const uploaded = await onUploadDocument(attestationId, selectedFiles[0]);
        setAttestation((prev) => ({ ...prev, encryption_at_rest_evidence_id: uploaded }));
      } catch {
        toast.error("Upload failed for encryption evidence.");
        setAttestation((prev) => ({
          ...prev,
          encryption_at_rest_evidence_id: selectedFiles[0]?.name ?? "",
        }));
      }
      return;
    }
    setAttestation((prev) => ({
      ...prev,
      encryption_at_rest_evidence_id: fileNames[0] ?? "",
    }));
  }

  return (
    <>
      <AttestationDynamicStep
        title={title}
        subTitle={subTitle}
        icon={icon}
        sectionKey="data_handling_privacy"
        data={data}
        attestation={attestation}
        setAttestation={setAttestation}
        fieldErrors={fieldErrors}
      />

      <div className="form_fields_vendor">
        <FormField
          label="Which data subject rights do you support, and in what role?"
          mandatory={true}
          tooltipText="Select the rights you support and whether you act as controller, processor, or both."
          errorText={fieldErrors?.data_subject_rights || fieldErrors?.controller_or_processor}
        >
          <ChipMultiSelect
            id="data_subject_rights"
            labelName=""
            options={DATA_SUBJECT_RIGHTS_OPTIONS}
            value={attestation.data_subject_rights ?? []}
            onChange={(selected) =>
              setAttestation((prev) => ({ ...prev, data_subject_rights: selected }))
            }
          />
          <div style={{ marginTop: "0.75rem" }}>
            <Select
              labelName=""
              id="controller_or_processor"
              name="controller_or_processor"
              value={attestation.controller_or_processor || ""}
              onChange={(e) =>
                setAttestation((prev) => ({
                  ...prev,
                  controller_or_processor: e.target.value,
                }))
              }
              default_option="Select controller, processor, or both"
              options={CONTROLLER_OR_PROCESSOR_OPTIONS}
              required
            />
          </div>
        </FormField>
      </div>

      <div className="form_fields_vendor">
        <FormField
          label="What encryption do you apply at rest?"
          mandatory={true}
          tooltipText="Select encryption at rest. Choose Not disclosed if you cannot share this. Evidence is optional."
          errorText={fieldErrors?.encryption_at_rest}
        >
          <Select
            labelName=""
            id="encryption_at_rest"
            name="encryption_at_rest"
            value={attestation.encryption_at_rest || ""}
            onChange={(e) => {
              const value = e.target.value;
              setAttestation((prev) => ({
                ...prev,
                encryption_at_rest: value,
                encryption_at_rest_evidence_id:
                  value === "not_disclosed" ? "" : prev.encryption_at_rest_evidence_id,
              }));
            }}
            default_option="Select encryption at rest"
            options={ENCRYPTION_AT_REST_OPTIONS}
            required
          />
        </FormField>
      </div>

      {showEvidence && (
        <div className="form_fields_vendor">
          <FormField
            label="Encryption at rest evidence"
            mandatory={false}
            tooltipText="Optional supporting document. Max 10MB."
          >
            <FileUpload
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              maxSizeBytes={MAX_FILE_SIZE_BYTES}
              maxFiles={1}
              value={evidenceName ? [evidenceName] : []}
              onFilesChange={(fileNames, selectedFiles) =>
                void handleEvidenceChange(fileNames, selectedFiles)
              }
              onValidationError={(msg) => msg && toast.error(msg)}
              disabled={Boolean(evidenceName)}
            />
          </FormField>
        </div>
      )}
    </>
  );
}

export default TabDataHandlingPrivacy;
