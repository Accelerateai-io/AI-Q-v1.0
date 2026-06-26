import Input from "../../UI/Input";
import HeaderForVendor from "./HeaderForVendor";
import Select from "../../UI/Select";
import {
  PRIMARY_CONTACT_ROLE,
  VENDOR_HELPTEXT,
} from "../../../constants/vendorOnboardingData";
import type {
  StepPropsVendorData,
  FormChangeEvent,
} from "../../../types/formDataVendor";
import { Info, User } from "lucide-react";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";


const StepContactInformation = ({
  formVendorData,
  setFormVendorData,
  fieldErrors,
}: StepPropsVendorData) => {
  const handleChange = (e: FormChangeEvent) => {
    const { name, value } = e.target;
    setFormVendorData({ ...formVendorData, [name]: value });
  };

  return (
    <>
      <div className="step_form_body">
        <HeaderForVendor
          icon=<User/>
          className="header_for_vendor"
          title_vendor="Contact Information"
          sub_title_vendor="Who should we contact?"
        />
        {/* Left Column */}
        <div className="step_form_right">
          {/* Primary Contact Name */}
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Primary Contact Name</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.primaryContactName}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="text"
              id="primaryContactName"
              name="primaryContactName"
              value={formVendorData.primaryContactName}
              onChange={handleChange}
              required
            />
            {fieldErrors?.primaryContactName && (
              <p className="vendor_field_error" role="alert">
                {fieldErrors.primaryContactName}
              </p>
            )}
          </div>

          {/* Primary Contact Email */}
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Primary Contact Email</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.primaryContactEmail}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="email"
              id="primaryContactEmail"
              name="primaryContactEmail"
              value={formVendorData.primaryContactEmail}
              onChange={handleChange}
              required
            />
            {fieldErrors?.primaryContactEmail && (
              <FieldError message={fieldErrors.primaryContactEmail} />
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="step_form_left">
          {/* Primary Contact Role */}
          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Primary Contact Role</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.primaryContactRole}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="primaryContactRole"
              name="primaryContactRole"
              default_option="Select primary role"
              options={PRIMARY_CONTACT_ROLE}
              value={formVendorData.primaryContactRole}
              onChange={handleChange}
              required
            />
            {fieldErrors?.primaryContactRole && (
              <FieldError message={fieldErrors.primaryContactRole} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StepContactInformation;
