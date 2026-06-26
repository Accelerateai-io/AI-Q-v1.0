import {
  BUYER_ANNUAL_REVENUE,
  BUYER_EMPLOYEE_COUNTS,
  BUYER_HELPTEXT,
} from "../../../constants/buyerOnboardingData";
import Select from "../../UI/Select";
import YearPicker from "../../UI/YearPicker";
import HeaderForBuyer from "./HeaderForBuyer";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import { Info } from "lucide-react";
import type { StepPropsBuyerrData } from "../../../types/formDataBuyer";

const BuyerOrganizationScale = ({
  formBuyerData,
  setFormBuyerData,
  fieldErrors,
  title,
  subTitle,
  icon,
}: StepPropsBuyerrData) => {
  const startYear = 1950;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormBuyerData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <HeaderForBuyer
        className="header_for_vendor"
        title_vendor={title ?? "Organization Scale"}
        sub_title_vendor={subTitle}
        icon={icon}
      />
      <div>
        <div>
          <div className="form_fields_vendor">
            <Select
              labelName={
<div className="labelSection">
                <span>Organization Size</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.organizationSize}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="employeeCount"
              name="employeeCount"
              value={formBuyerData.employeeCount}
              default_option="Select organization size"
              options={BUYER_EMPLOYEE_COUNTS}
              onChange={handleChange}
              required
            />
            {fieldErrors?.employeeCount && (
              <FieldError message={fieldErrors.employeeCount} />
            )}
          </div>

          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Annual Revenue Range</span>
                  <ClickTooltip content={BUYER_HELPTEXT.annualRevenue}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="annualRevenue"
              name="annualRevenue"
              value={formBuyerData.annualRevenue}
              default_option="Select annual revenue range"
              options={BUYER_ANNUAL_REVENUE}
              onChange={handleChange}
            />
            {fieldErrors?.annualRevenue && (
              <FieldError message={fieldErrors.annualRevenue} />
            )}
          </div>
        </div>

        <div className="form_fields_vendor">
          <YearPicker
            label={
              <div className="labelSection">
                <span>Year Founded</span>
                <ClickTooltip content={BUYER_HELPTEXT.yearFounded}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            id="yearFounded"
            name="yearFounded"
            startYear= {startYear}
            value={formBuyerData.yearFounded}
            onChange={handleChange}
          />
          {fieldErrors?.yearFounded && (
            <FieldError message={fieldErrors.yearFounded} />
          )}
        </div>
      </div>
    </>
  );
};

export default BuyerOrganizationScale;
