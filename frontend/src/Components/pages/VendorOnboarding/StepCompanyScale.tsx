import HeaderForVendor from "./HeaderForVendor";
import {
  EMPLOYEE_COUNTS,
  VENDOR_HELPTEXT,
} from "../../../constants/vendorOnboardingData";
import Select from "../../UI/Select";
import YearPicker from "../../UI/YearPicker";
import type {
  FormChangeEvent,
  StepPropsVendorData,
} from "../../../types/formDataVendor";
import { Info, Scale } from "lucide-react";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";

const StepCompanyScale = ({
  formVendorData,
  setFormVendorData,
  fieldErrors,
}: StepPropsVendorData) => {
  const handleChange = (e: FormChangeEvent) => {
    const { name, value } = e.target;
    // Convert year to number
    const newValue =
      name === "yearFounded"
        ? value
          ? parseInt(value, 10)
          : undefined
        : value;
    setFormVendorData({ ...formVendorData, [name]: newValue });
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
     
      <div className="step_form_body">
         <HeaderForVendor
         icon=  <Scale/>
        className="header_for_vendor"
        title_vendor="Company Scale"
        sub_title_vendor="Size and history of your company"
      />

        {/* Employee Count */}
        <div className="form_fields_vendor">
          <Select
            labelName={
              <div className="labelSection">
                <span>Employee Count</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip content={VENDOR_HELPTEXT.employeeCount}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            options={EMPLOYEE_COUNTS}
            default_option="Select employee count"
            id="employeeCount"
            name="employeeCount"
            value={formVendorData.employeeCount || ""}
            onChange={handleChange}
            required
          />
          {fieldErrors?.employeeCount && (
            <FieldError message={fieldErrors.employeeCount} />
          )}
        </div>

        {/* Year Founded */}
        <div className="form_fields_vendor">
          <YearPicker
            startYear={1950}
            endYear={currentYear}
            label={
              <div className="labelSection">
                <span>Year Founded</span>
                <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                <ClickTooltip content={VENDOR_HELPTEXT.yearFounded}>
                  <Info size={14} color="#6B7280" />
                </ClickTooltip>
              </div>
            }
            name="yearFounded"
            id="yearFounded"
            value={formVendorData.yearFounded}
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

export default StepCompanyScale;
