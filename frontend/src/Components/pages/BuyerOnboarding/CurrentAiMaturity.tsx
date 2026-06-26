import React from "react";
import HeaderForBuyer from "./HeaderForBuyer";
import Select from "../../UI/Select";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import { Info } from "lucide-react";
import {
  BUYER_AI_GOVERNANCE_MATURITY,
  BUYER_AI_SKILLS_AVAILABILITY,
  BUYER_CHANGE_MANAGEMENT_CAPABILITY,
  BUYER_DATA_GOVERNANCE_MATURITY,
  BUYER_EXISTING_AI_INITIATIVES,
  BUYER_HELPTEXT,
} from "../../../constants/buyerOnboardingData";
import type { StepPropsBuyerrData } from "../../../types/formDataBuyer";

const CurrentAiMaturity = ({
  formBuyerData,
  setFormBuyerData,
  fieldErrors,
  title,
  subTitle,
  icon,
}: StepPropsBuyerrData) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormBuyerData({ ...formBuyerData, [name]: value });
  };

  return (
    <>
      <HeaderForBuyer
        className="header_for_vendor"
        title_vendor={title ?? "Current AI Maturity"}
        sub_title_vendor={subTitle}
        icon={icon}
      />

      <div>
        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>Existing AI Initiatives</span>
                <ClickTooltip content={BUYER_HELPTEXT.existingAIInitiatives}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            default_option="Select existing AI initiatives"
            options={BUYER_EXISTING_AI_INITIATIVES}
            id="existingAIInitiatives"
            name="existingAIInitiatives"
            value={formBuyerData.existingAIInitiatives || ""}
            onChange={handleChange}
          />
          {fieldErrors?.existingAIInitiatives && (
            <FieldError message={fieldErrors.existingAIInitiatives} />
          )}
        </div>

        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>AI Governance Maturity</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip content={BUYER_HELPTEXT.aiGovernanceMaturity}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            default_option="Select AI governance maturity"
            options={BUYER_AI_GOVERNANCE_MATURITY}
            id="aiGovernanceMaturity"
            name="aiGovernanceMaturity"
            value={formBuyerData.aiGovernanceMaturity || ""}
            onChange={handleChange}
            required
          />
          {fieldErrors?.aiGovernanceMaturity && (
            <FieldError message={fieldErrors.aiGovernanceMaturity} />
          )}
        </div>

        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>Data Governance Maturity</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip content={BUYER_HELPTEXT.dataGovernanceMaturity}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            default_option="Select data governance maturity"
            options={BUYER_DATA_GOVERNANCE_MATURITY}
            id="dataGovernanceMaturity"
            name="dataGovernanceMaturity"
            value={formBuyerData.dataGovernanceMaturity || ""}
            onChange={handleChange}
            required
          />
          {fieldErrors?.dataGovernanceMaturity && (
            <FieldError message={fieldErrors.dataGovernanceMaturity} />
          )}
        </div>

        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>AI Skills Availability</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip content={BUYER_HELPTEXT.aiSkillsAvailability}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            default_option="Select AI skills availability"
            options={BUYER_AI_SKILLS_AVAILABILITY}
            id="aiSkillsAvailability"
            name="aiSkillsAvailability"
            value={formBuyerData.aiSkillsAvailability || ""}
            onChange={handleChange}
            required
          />
          {fieldErrors?.aiSkillsAvailability && (
            <FieldError message={fieldErrors.aiSkillsAvailability} />
          )}
        </div>

        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>Change Management Capability</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip
                  content={BUYER_HELPTEXT.changeManagementCapability}
                >
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            default_option="Select change management capability"
            options={BUYER_CHANGE_MANAGEMENT_CAPABILITY}
            id="changeManagementCapability"
            name="changeManagementCapability"
            value={formBuyerData.changeManagementCapability || ""}
            onChange={handleChange}
            required
          />
          {fieldErrors?.changeManagementCapability && (
            <FieldError message={fieldErrors.changeManagementCapability} />
          )}
        </div>
      </div>
    </>
  );
};

export default CurrentAiMaturity;
