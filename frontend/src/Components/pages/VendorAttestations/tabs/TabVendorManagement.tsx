/**
 * Vendor Self Attestation – Vendor Management tab content.
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import FormField from "../../../UI/FormField";
import Input from "../../../UI/Input";
import Button from "../../../UI/Button";
import FieldError from "../../../UI/FieldError";
import type {
  AttestationSubProcessor,
  VendorSelfAttestationPayload,
} from "../../../../types/vendorSelfAttestation";
import { Plus, Trash2 } from "lucide-react";

export interface TabVendorManagementProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

const EMPTY_SUB_PROCESSOR: AttestationSubProcessor = {
  name: "",
  purpose: "",
  region: "",
  source_url: "",
};

function mapSubProcessors(raw: VendorSelfAttestationPayload["sub_processors"]): AttestationSubProcessor[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    name: String(item?.name ?? ""),
    purpose: String(item?.purpose ?? ""),
    region: String(item?.region ?? ""),
    source_url: String(item?.source_url ?? ""),
  }));
}

function TabVendorManagement({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "Vendor Management",
  subTitle,
  icon,
}: TabVendorManagementProps) {
  const processors = mapSubProcessors(attestation.sub_processors);
  const rows = processors.length > 0 ? processors : [{ ...EMPTY_SUB_PROCESSOR }];

  function updateProcessor(index: number, patch: Partial<AttestationSubProcessor>) {
    setAttestation((prev) => {
      const current = mapSubProcessors(prev.sub_processors);
      const base = current.length > 0 ? current : [{ ...EMPTY_SUB_PROCESSOR }];
      const next = base.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...prev, sub_processors: next };
    });
  }

  function addProcessor() {
    setAttestation((prev) => {
      const current = mapSubProcessors(prev.sub_processors);
      const base = current.length > 0 ? current : [{ ...EMPTY_SUB_PROCESSOR }];
      return {
        ...prev,
        sub_processors: [...base, { ...EMPTY_SUB_PROCESSOR }],
      };
    });
  }

  function removeProcessor(index: number) {
    setAttestation((prev) => {
      const current = mapSubProcessors(prev.sub_processors);
      const next = current.filter((_, i) => i !== index);
      return {
        ...prev,
        sub_processors: next.length > 0 ? next : [{ ...EMPTY_SUB_PROCESSOR }],
      };
    });
  }

  return (
    <>
      <AttestationDynamicStep
        title={title}
        subTitle={subTitle}
        icon={icon}
        sectionKey="vendor_management"
        data={data}
        attestation={attestation}
        setAttestation={setAttestation}
        fieldErrors={fieldErrors}
      />

      <div className="form_fields_vendor">
        <FormField
          label="List your sub-processors"
          mandatory={false}
          tooltipText="Add each sub-processor name, purpose, region, and source URL."
        />
        {fieldErrors?.sub_processors && <FieldError message={fieldErrors.sub_processors} />}
      </div>

      <div className="vendor_incident_list">
        {rows.map((processor, index) => (
          <div key={`sub-processor-${index}`} className="vendor_incident_card">
            <div className="vendor_incident_card_header">
              <p className="vendor_incident_card_title">Sub-processor {index + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="vendor_incident_remove"
                  onClick={() => removeProcessor(index)}
                  aria-label={`Remove sub-processor ${index + 1}`}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>
            <div className="form_fields_vendor">
              <Input
                labelName={
                  <div className="labelSection">
                    <span>Name</span>
                  </div>
                }
                type="text"
                id={`sub-processor-name-${index}`}
                name={`sub-processor-name-${index}`}
                value={processor.name}
                onChange={(e) => updateProcessor(index, { name: e.target.value })}
              />
            </div>
            <div className="form_fields_vendor">
              <Input
                labelName="Purpose"
                type="text"
                id={`sub-processor-purpose-${index}`}
                name={`sub-processor-purpose-${index}`}
                value={processor.purpose}
                onChange={(e) => updateProcessor(index, { purpose: e.target.value })}
              />
            </div>
            <div className="form_fields_vendor">
              <Input
                labelName="Region"
                type="text"
                id={`sub-processor-region-${index}`}
                name={`sub-processor-region-${index}`}
                value={processor.region}
                onChange={(e) => updateProcessor(index, { region: e.target.value })}
              />
            </div>
            <div className="form_fields_vendor">
              <Input
                labelName="Source URL"
                type="url"
                id={`sub-processor-url-${index}`}
                name={`sub-processor-url-${index}`}
                value={processor.source_url}
                onChange={(e) => updateProcessor(index, { source_url: e.target.value })}
              />
            </div>
          </div>
        ))}
        <div className="vendor_incident_add">
          <Button type="button" className="vendor_incident_add_btn" onClick={addProcessor}>
            <span>
              <Plus size={14} />
              Add sub-processor
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}

export default TabVendorManagement;
