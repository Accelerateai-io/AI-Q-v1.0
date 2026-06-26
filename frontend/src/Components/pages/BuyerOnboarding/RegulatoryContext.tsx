import React from "react";
import HeaderForBuyer from "./HeaderForBuyer";
import Select from "../../UI/Select";
import ChipMultiSelect from "../../UI/ChipMultiSelect";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import { Info } from "lucide-react";
import {
  BUYER_PRIMARY_REGULATORY_FRAMEWORKS,
  BUYER_REGULATORY_PENALTY_EXPOSURE,
  BUYER_DATA_CLASSIFICATION_LEVELS_HANDLED,
  BUYER_PII_SENSITIVE_DATA_HANDLING,
  BUYER_HELPTEXT,
} from "../../../constants/buyerOnboardingData";
import type { StepPropsBuyerrData } from "../../../types/formDataBuyer";

const RegulatoryContext = ({
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
        title_vendor={title ?? "Regulatory Context"}
        sub_title_vendor={subTitle}
        icon={icon}
      />

      <div className="step_form_body">
        <div className="step_form_right">
          <div className="form_fields_vendor">
            <ChipMultiSelect
              id="primaryRegulatoryFrameworks"
              labelName={
                <div className="labelSection">
                  <span>Primary Regulatory Frameworks</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip
                    content={BUYER_HELPTEXT.primaryRegulatoryFrameworks}
                  >
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              options={BUYER_PRIMARY_REGULATORY_FRAMEWORKS}
              value={formBuyerData.primaryRegulatoryFrameworks || []}
              onChange={(selected: string[]) =>
                setFormBuyerData({
                  ...formBuyerData,
                  primaryRegulatoryFrameworks: selected,
                })
              }
            />
            {fieldErrors?.primaryRegulatoryFrameworks && (
              <FieldError message={fieldErrors.primaryRegulatoryFrameworks} />
            )}
          </div>

          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Regulatory Penalty Exposure</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip
                    content={BUYER_HELPTEXT.regulatoryPenaltyExposure}
                  >
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="penaltyExposure"
              name="regulatoryPenaltyExposure"
              default_option="Select regulatory penalty exposure"
              options={BUYER_REGULATORY_PENALTY_EXPOSURE}
              value={formBuyerData.regulatoryPenaltyExposure || ""}
              onChange={handleChange}
              required
            />
            {fieldErrors?.regulatoryPenaltyExposure && (
              <FieldError message={fieldErrors.regulatoryPenaltyExposure} />
            )}
          </div>
        </div>

        <div>
          <div className="form_fields_vendor">
            <ChipMultiSelect
              id="dataClassificationHandled"
              labelName={
                <div className="labelSection">
                  <span>Data Classification Levels Handled</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip
                    content={BUYER_HELPTEXT.dataClassificationHandled}
                  >
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              options={BUYER_DATA_CLASSIFICATION_LEVELS_HANDLED}
              value={formBuyerData.dataClassificationHandled || []}
              onChange={(selected: string[]) =>
                setFormBuyerData({
                  ...formBuyerData,
                  dataClassificationHandled: selected,
                })
              }
            />
            {fieldErrors?.dataClassificationHandled && (
              <FieldError message={fieldErrors.dataClassificationHandled} />
            )}
          </div>

          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>PII/Sensitive Data Handling</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.piiHandling}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="pii_phi_handling"
              name="piiHandling"
              default_option="Select PII/Sensitive data handling"
              options={BUYER_PII_SENSITIVE_DATA_HANDLING}
              value={formBuyerData.piiHandling || ""}
              onChange={handleChange}
              required
            />
            {fieldErrors?.piiHandling && (
              <FieldError message={fieldErrors.piiHandling} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RegulatoryContext;
