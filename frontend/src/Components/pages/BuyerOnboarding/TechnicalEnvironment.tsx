import React from "react";
import HeaderForBuyer from "./HeaderForBuyer";
import ChipMultiSelect from "../../UI/ChipMultiSelect";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import { Info } from "lucide-react";
import {
  BUYER_EXISTING_TECHNOLOGY_STACK,
  BUYER_HELPTEXT,
} from "../../../constants/buyerOnboardingData";
import type { StepPropsBuyerrData } from "../../../types/formDataBuyer";

const TechnicalEnvironment = ({
  formBuyerData,
  setFormBuyerData,
  fieldErrors,
  title,
  subTitle,
  icon,
}: StepPropsBuyerrData) => {
  const handleChange = (selectedValues: string[]) => {
    setFormBuyerData({
      ...formBuyerData,
      existingTechStack: selectedValues,
    });
  };


  return (
    <>
      <HeaderForBuyer
        className="header_for_vendor"
        title_vendor={title ?? "Technical Environment"}
        sub_title_vendor={subTitle}
        icon={icon}
      />

      <div className="form_fields_vendor">
        <ChipMultiSelect
          id="existingTech"
          labelName={
            <div className="labelSection">
              <span>Existing Technology Stack</span>
              <ClickTooltip content={BUYER_HELPTEXT.existingTechStack}>
                <Info size={14} color="#6B7280" />
              </ClickTooltip>
            </div>
          }
          options={BUYER_EXISTING_TECHNOLOGY_STACK}
          value={formBuyerData.existingTechStack || []}
          onChange={handleChange}
        />
        {fieldErrors?.existingTechStack && (
          <FieldError message={fieldErrors.existingTechStack} />
        )}
      </div>
    </>
  );
};

export default TechnicalEnvironment;
