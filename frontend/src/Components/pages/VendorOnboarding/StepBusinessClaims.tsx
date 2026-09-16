import HeaderForVendor from "./HeaderForVendor";
import Select from "../../UI/Select";
import Input from "../../UI/Input";
import Button from "../../UI/Button";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import {
  FINANCIAL_POSITION_OPTIONS,
  FUNDING_STATUS_OPTIONS,
  SECURITY_INCIDENT_SEVERITY_OPTIONS,
  VENDOR_HELPTEXT,
  YES_NO_OPTIONS,
} from "../../../constants/vendorOnboardingData";
import type {
  FormChangeEvent,
  StepPropsVendorData,
  VendorSecurityIncident,
} from "../../../types/formDataVendor";
import { Briefcase, Info, Plus, Trash2 } from "lucide-react";

const EMPTY_INCIDENT: VendorSecurityIncident = {
  date: "",
  summary: "",
  sourceUrl: "",
  severity: "",
  resolved: false,
};

function StepBusinessClaims({
  formVendorData,
  setFormVendorData,
  fieldErrors,
}: StepPropsVendorData) {
  const incidents = formVendorData.securityIncidents ?? [];
  const showIncidents = formVendorData.hasPublicSecurityIncident === "yes";

  function handleChange(e: FormChangeEvent) {
    const { name, value } = e.target;
    setFormVendorData({ ...formVendorData, [name]: value });
  }

  function handleNumericChange(e: FormChangeEvent, allowDecimal = false) {
    const { name, value } = e.target;
    const digitsOnly = allowDecimal
      ? value
          .replace(/[^\d.]/g, "")
          .replace(/^(\d*\.\d*).*$/, "$1")
      : value.replace(/\D/g, "");
    setFormVendorData({ ...formVendorData, [name]: digitsOnly });
  }

  function handleIncidentAnswer(value: string) {
    setFormVendorData({
      ...formVendorData,
      hasPublicSecurityIncident: value,
      securityIncidents:
        value === "yes"
          ? incidents.length > 0
            ? incidents
            : [{ ...EMPTY_INCIDENT }]
          : [],
    });
  }

  function updateIncident(
    index: number,
    patch: Partial<VendorSecurityIncident>,
  ) {
    const next = incidents.map((incident, i) =>
      i === index ? { ...incident, ...patch } : incident,
    );
    setFormVendorData({ ...formVendorData, securityIncidents: next });
  }

  function addIncident() {
    setFormVendorData({
      ...formVendorData,
      securityIncidents: [...incidents, { ...EMPTY_INCIDENT }],
    });
  }

  function removeIncident(index: number) {
    const next = incidents.filter((_, i) => i !== index);
    setFormVendorData({
      ...formVendorData,
      securityIncidents: next.length > 0 ? next : [{ ...EMPTY_INCIDENT }],
    });
  }

  return (
    <div className="step_form_body">
      <HeaderForVendor
        icon={<Briefcase />}
        className="header_for_vendor"
        title_vendor="Business & Claims"
        sub_title_vendor="Funding, customers, and verification of public claims"
      />

      <h3 className="vendor_step_section_title">General Business Questions</h3>

      <div className="form_fields_vendor">
        <Select
          labelName={
            <div className="labelSection">
              <span>What is your funding status?</span>
              <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
              <ClickTooltip content={VENDOR_HELPTEXT.fundingStatus}>
                <Info size={14} color="#6B7280" />
              </ClickTooltip>
            </div>
          }
          id="fundingStatus"
          name="fundingStatus"
          value={formVendorData.fundingStatus || ""}
          onChange={handleChange}
          default_option="Select funding status"
          options={FUNDING_STATUS_OPTIONS}
          required
        />
        {fieldErrors?.fundingStatus && (
          <FieldError message={fieldErrors.fundingStatus} />
        )}
      </div>

      <div className="form_fields_vendor">
        <Select
          labelName={
            <div className="labelSection">
              <span>How would you describe your financial position?</span>
              <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
              <ClickTooltip content={VENDOR_HELPTEXT.financialPosition}>
                <Info size={14} color="#6B7280" />
              </ClickTooltip>
            </div>
          }
          id="financialPosition"
          name="financialPosition"
          value={formVendorData.financialPosition || ""}
          onChange={handleChange}
          default_option="Select financial position"
          options={FINANCIAL_POSITION_OPTIONS}
          required
        />
        {fieldErrors?.financialPosition && (
          <FieldError message={fieldErrors.financialPosition} />
        )}
      </div>

      <div className="form_fields_vendor">
        <Input
          labelName={
            <div className="labelSection">
              <span>How many enterprise customers do you have?</span>
              <ClickTooltip content={VENDOR_HELPTEXT.enterpriseCustomers}>
                <Info size={14} color="#6B7280" />
              </ClickTooltip>
            </div>
          }
          type="text"
          id="enterpriseCustomers"
          name="enterpriseCustomers"
          inputMode="numeric"
          value={formVendorData.enterpriseCustomers || ""}
          onChange={handleNumericChange}
        />
        {fieldErrors?.enterpriseCustomers && (
          <FieldError message={fieldErrors.enterpriseCustomers} />
        )}
      </div>

      <div className="form_fields_vendor">
        <Input
          labelName={
            <div className="labelSection">
              <span>What is your annual customer retention / logo retention rate?</span>
              <ClickTooltip content={VENDOR_HELPTEXT.customerRetentionRate}>
                <Info size={14} color="#6B7280" />
              </ClickTooltip>
            </div>
          }
          type="text"
          id="customerRetentionRate"
          name="customerRetentionRate"
          inputMode="decimal"
          value={formVendorData.customerRetentionRate || ""}
          onChange={(e) => handleNumericChange(e, true)}
        />
        {fieldErrors?.customerRetentionRate && (
          <FieldError message={fieldErrors.customerRetentionRate} />
        )}
      </div>

      <h3 className="vendor_step_section_title">Verification of Claims</h3>

      <div className="form_fields_vendor">
        <Input
          labelName={
            <div className="labelSection">
              <span>Do you publish a trust centre? URL</span>
              <ClickTooltip content={VENDOR_HELPTEXT.trustCentreUrl}>
                <Info size={14} color="#6B7280" />
              </ClickTooltip>
            </div>
          }
          type="url"
          id="trustCentreUrl"
          name="trustCentreUrl"
          value={formVendorData.trustCentreUrl || ""}
          onChange={handleChange}
        />
        {fieldErrors?.trustCentreUrl && (
          <FieldError message={fieldErrors.trustCentreUrl} />
        )}
      </div>

      <div className="form_fields_vendor">
        <Select
          labelName={
            <div className="labelSection">
              <span>Have you had a publicly disclosed security incident in the last 24 months?</span>
              <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
              <ClickTooltip content={VENDOR_HELPTEXT.hasPublicSecurityIncident}>
                <Info size={14} color="#6B7280" />
              </ClickTooltip>
            </div>
          }
          id="hasPublicSecurityIncident"
          name="hasPublicSecurityIncident"
          value={formVendorData.hasPublicSecurityIncident || ""}
          onChange={(e) => handleIncidentAnswer(e.target.value)}
          default_option="Select an answer"
          options={YES_NO_OPTIONS}
          required
        />
        {fieldErrors?.hasPublicSecurityIncident && (
          <FieldError message={fieldErrors.hasPublicSecurityIncident} />
        )}
        {fieldErrors?.securityIncidents && (
          <FieldError message={fieldErrors.securityIncidents} />
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
                  id={`incident-date-${index}`}
                  name={`incident-date-${index}`}
                  value={incident.date}
                  onChange={(e) => updateIncident(index, { date: e.target.value })}
                />
                {fieldErrors?.[`securityIncidents.${index}.date`] && (
                  <FieldError message={fieldErrors[`securityIncidents.${index}.date`]} />
                )}
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
                  id={`incident-summary-${index}`}
                  name={`incident-summary-${index}`}
                  value={incident.summary}
                  onChange={(e) => updateIncident(index, { summary: e.target.value })}
                />
                {fieldErrors?.[`securityIncidents.${index}.summary`] && (
                  <FieldError message={fieldErrors[`securityIncidents.${index}.summary`]} />
                )}
              </div>

              <div className="form_fields_vendor">
                <Input
                  labelName={
                    <div className="labelSection">
                      <span>Source URL</span>
                    </div>
                  }
                  type="url"
                  id={`incident-source-${index}`}
                  name={`incident-source-${index}`}
                  value={incident.sourceUrl}
                  onChange={(e) => updateIncident(index, { sourceUrl: e.target.value })}
                />
                {fieldErrors?.[`securityIncidents.${index}.sourceUrl`] && (
                  <FieldError
                    message={fieldErrors[`securityIncidents.${index}.sourceUrl`]}
                  />
                )}
              </div>

              <div className="form_fields_vendor">
                <Select
                  labelName={
                    <div className="labelSection">
                      <span>Severity</span>
                      <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                    </div>
                  }
                  id={`incident-severity-${index}`}
                  name={`incident-severity-${index}`}
                  value={incident.severity}
                  onChange={(e) => updateIncident(index, { severity: e.target.value })}
                  default_option="Select severity"
                  options={SECURITY_INCIDENT_SEVERITY_OPTIONS}
                  required
                />
                {fieldErrors?.[`securityIncidents.${index}.severity`] && (
                  <FieldError
                    message={fieldErrors[`securityIncidents.${index}.severity`]}
                  />
                )}
              </div>

              <label className="vendor_incident_resolved">
                <input
                  type="checkbox"
                  checked={incident.resolved}
                  onChange={(e) =>
                    updateIncident(index, { resolved: e.target.checked })
                  }
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
    </div>
  );
}

export default StepBusinessClaims;
