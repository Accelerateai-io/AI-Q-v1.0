import React from "react";
import HeaderForBuyer from "./HeaderForBuyer";
import Select from "../../UI/Select";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import { Info } from "lucide-react";
import {
  BUYER_ACCEPTABLE_RISK_LEVEL,
  BUYER_AI_RISK_APPETITE,
  BUYER_HELPTEXT,
} from "../../../constants/buyerOnboardingData";
import type { StepPropsBuyerrData } from "../../../types/formDataBuyer";

const RiskAppetite = ({
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
        title_vendor={title ?? "Risk Appetite"}
        sub_title_vendor={subTitle}
        icon={icon}
      />

      <div>
        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>AI Risk Appetite</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip content={BUYER_HELPTEXT.aiRiskAppetite}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            id="aiRiskAppetite"
            name="aiRiskAppetite"
            default_option="Select AI risk appetite"
            options={BUYER_AI_RISK_APPETITE}
            value={formBuyerData.aiRiskAppetite || ""}
            onChange={handleChange}
            required
          />
          {fieldErrors?.aiRiskAppetite && (
            <FieldError message={fieldErrors.aiRiskAppetite} />
          )}
        </div>

        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>Acceptable Risk Level</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip content={BUYER_HELPTEXT.acceptableRiskLevel}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            id="riskLevel"
            name="acceptableRiskLevel"
            default_option="Select acceptable risk level"
            options={BUYER_ACCEPTABLE_RISK_LEVEL}
            value={formBuyerData.acceptableRiskLevel || ""}
            onChange={handleChange}
            required
          />
          {fieldErrors?.acceptableRiskLevel && (
            <FieldError message={fieldErrors.acceptableRiskLevel} />
          )}
        </div>
      </div>
    </>
  );
};

export default RiskAppetite;
