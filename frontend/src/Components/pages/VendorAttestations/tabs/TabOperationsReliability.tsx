/**
 * Vendor Self Attestation – Operations & Reliability tab content.
 * Heading, subheading, and icon from step config (Vendor Onboarding UI pattern).
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import FormField from "../../../UI/FormField";
import Select from "../../../UI/Select";
import Input from "../../../UI/Input";
import Button from "../../../UI/Button";
import FieldError from "../../../UI/FieldError";
import {
  SECURITY_INCIDENT_SEVERITY_OPTIONS,
  VENDOR_HELPTEXT,
  YES_NO_OPTIONS,
} from "../../../../constants/vendorOnboardingData";
import type { VendorSelfAttestationPayload } from "../../../../types/vendorSelfAttestation";
import type { VendorSecurityIncident } from "../../../../types/formDataVendor";
import { Plus, Trash2 } from "lucide-react";

export interface TabOperationsReliabilityProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

const EMPTY_INCIDENT: VendorSecurityIncident = {
  date: "",
  summary: "",
  sourceUrl: "",
  severity: "",
  resolved: false,
};

function mapIncidents(raw: VendorSelfAttestationPayload["security_incidents"]): VendorSecurityIncident[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    date: String(item?.date ?? ""),
    summary: String(item?.summary ?? ""),
    sourceUrl: String(item?.sourceUrl ?? item?.source_url ?? ""),
    severity: String(item?.severity ?? ""),
    resolved: Boolean(item?.resolved),
  }));
}

function TabOperationsReliability({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "Operations & Reliability",
  subTitle,
  icon,
}: TabOperationsReliabilityProps) {
  const incidents = mapIncidents(attestation.security_incidents);
  const showIncidents = attestation.has_public_security_incident === "yes";

  function handleIncidentAnswer(value: string) {
    setAttestation((prev) => ({
      ...prev,
      has_public_security_incident: value,
      security_incidents:
        value === "yes"
          ? incidents.length > 0
            ? incidents
            : [{ ...EMPTY_INCIDENT }]
          : [],
    }));
  }

  function updateIncident(index: number, patch: Partial<VendorSecurityIncident>) {
    const next = incidents.map((incident, i) =>
      i === index ? { ...incident, ...patch } : incident,
    );
    setAttestation((prev) => ({ ...prev, security_incidents: next }));
  }

  function addIncident() {
    setAttestation((prev) => ({
      ...prev,
      security_incidents: [...incidents, { ...EMPTY_INCIDENT }],
    }));
  }

  function removeIncident(index: number) {
    const next = incidents.filter((_, i) => i !== index);
    setAttestation((prev) => ({
      ...prev,
      security_incidents: next.length > 0 ? next : [{ ...EMPTY_INCIDENT }],
    }));
  }

  return (
    <>
      <AttestationDynamicStep
        title={title}
        subTitle={subTitle}
        icon={icon}
        sectionKey="operations_reliability"
        data={data}
        attestation={attestation}
        setAttestation={setAttestation}
        fieldErrors={fieldErrors}
      />

      <div className="form_fields_vendor">
        <FormField
          label="Have you had a publicly disclosed security incident in the last 24 months?"
          mandatory={true}
          tooltipText={VENDOR_HELPTEXT.hasPublicSecurityIncident}
          errorText={fieldErrors?.has_public_security_incident}
        >
          <Select
            labelName=""
            id="has_public_security_incident"
            name="has_public_security_incident"
            value={attestation.has_public_security_incident || ""}
            onChange={(e) => handleIncidentAnswer(e.target.value)}
            default_option="Select an answer"
            options={YES_NO_OPTIONS}
            required
          />
        </FormField>
        {fieldErrors?.security_incidents && (
          <FieldError message={fieldErrors.security_incidents} />
        )}
      </div>

      {showIncidents && (
        <div className="vendor_incident_list">
          {incidents.map((incident, index) => (
            <div key={`incident-${index}`} className="vendor_incident_card">
              <div className="vendor_incident_card_header">
                <p className="vendor_incident_card_title">Incident {index + 1}</p>
                {incidents.length > 1 && (
                  <button
                    type="button"
                    className="vendor_incident_remove"
                    onClick={() => removeIncident(index)}
                    aria-label={`Remove incident ${index + 1}`}
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
                      <span>Date</span>
                      <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                    </div>
                  }
                  type="date"
                  id={`attestation-incident-date-${index}`}
                  name={`attestation-incident-date-${index}`}
                  value={incident.date}
                  onChange={(e) => updateIncident(index, { date: e.target.value })}
                />
              </div>
              <div className="form_fields_vendor">
                <Input
                  labelName={
                    <div className="labelSection">
                      <span>Summary</span>
                      <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                    </div>
                  }
                  type="textarea"
                  id={`attestation-incident-summary-${index}`}
                  name={`attestation-incident-summary-${index}`}
                  value={incident.summary}
                  onChange={(e) => updateIncident(index, { summary: e.target.value })}
                />
              </div>
              <div className="form_fields_vendor">
                <Input
                  labelName={<div className="labelSection"><span>Source URL</span></div>}
                  type="url"
                  id={`attestation-incident-source-${index}`}
                  name={`attestation-incident-source-${index}`}
                  value={incident.sourceUrl}
                  onChange={(e) => updateIncident(index, { sourceUrl: e.target.value })}
                />
              </div>
              <div className="form_fields_vendor">
                <Select
                  labelName={
                    <div className="labelSection">
                      <span>Severity</span>
                      <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                    </div>
                  }
                  id={`attestation-incident-severity-${index}`}
                  name={`attestation-incident-severity-${index}`}
                  value={incident.severity}
                  onChange={(e) => updateIncident(index, { severity: e.target.value })}
                  default_option="Select severity"
                  options={SECURITY_INCIDENT_SEVERITY_OPTIONS}
                  required
                />
              </div>
              <label className="vendor_incident_resolved">
                <input
                  type="checkbox"
                  checked={incident.resolved}
                  onChange={(e) => updateIncident(index, { resolved: e.target.checked })}
                />
                <span>Resolved</span>
              </label>
            </div>
          ))}
          <div className="vendor_incident_add">
            <Button type="button" className="vendor_incident_add_btn" onClick={addIncident}>
              <span>
                <Plus size={14} />
                Add incident
              </span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default TabOperationsReliability;
