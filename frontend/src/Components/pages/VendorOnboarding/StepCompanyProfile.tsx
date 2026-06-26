import type { ChangeEvent } from "react";
import Input from "../../UI/Input";
import HeaderForVendor from "./HeaderForVendor";
import Select from "../../UI/Select";
import IndustrySectorDependency from "../../UI/IndustrySectorDependency";
import {
  VENDOR_TYPES,
  VENDOR_MATURITY_STAGE,
  VENDOR_HELPTEXT,
} from "../../../constants/vendorOnboardingData";
import type {
  StepPropsVendorData,
  VendorDataInterface,
} from "../../../types/formDataVendor";
import { Building2, Info } from "lucide-react";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";

const StepCompanyProfile = ({
  formVendorData,
  setFormVendorData,
  fieldErrors,
}: StepPropsVendorData) => {
  // Generic handler for inputs/selects
  const handleChangeVendor = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormVendorData({ ...formVendorData, [name]: value });
  };

  const sectorValue: VendorDataInterface["sector"] = {
    public_sector: formVendorData.sector?.public_sector ?? [],
    private_sector: formVendorData.sector?.private_sector ?? [],
    non_profit_sector: formVendorData.sector?.non_profit_sector ?? [],
  };

  return (
    <>
      <div className="step_form_body">
        <HeaderForVendor
          icon=<Building2/>
          className="header_for_vendor"
          title_vendor="Company Profile"
          sub_title_vendor="Basic information about your company"
        />
        <div className="step_form_right">
          {/* Vendor Name */}
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Vendor Name</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.vendorName}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="text"
              id="vendorName"
              name="vendorName"
              value={formVendorData.vendorName || ""}
              onChange={handleChangeVendor}
            />
            {fieldErrors?.vendorName && (
              <FieldError message={fieldErrors.vendorName} />
            )}
          </div>

          {/* Vendor Type */}
          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Vendor Type</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.vendorType}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="vendorType"
              name="vendorType"
              value={formVendorData.vendorType || ""}
              onChange={handleChangeVendor}
              default_option="Select vendor type"
              options={VENDOR_TYPES}
              required
            />
            {fieldErrors?.vendorType && (
              <FieldError message={fieldErrors.vendorType} />
            )}
          </div>

          {/* Industry Sector */}
          <div className="form_fields_vendor">
            <IndustrySectorDependency
              labelName={
                <div className="labelSection">
                  <span>Industry Sector</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.sector}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="industry_sec"
              sector={sectorValue}
              onChange={(sector) =>
                setFormVendorData({ ...formVendorData, sector })
              }
              defaultCategoryOption="Select sector category"
              required
            />
            {fieldErrors?.sector && <FieldError message={fieldErrors.sector} />}
          </div>

          {/* Vendor Maturity Stage */}
          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Vendor Maturity Stage</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.vendorMaturity}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="vendorMaturity"
              name="vendorMaturity"
              value={formVendorData.vendorMaturity || ""}
              onChange={handleChangeVendor}
              required
              default_option="Select vendor maturity stage"
              options={VENDOR_MATURITY_STAGE}
            />
            {fieldErrors?.vendorMaturity && (
              <FieldError message={fieldErrors.vendorMaturity} />
            )}
          </div>
        </div>

        <div className="step_form_left">
          {/* Company Website */}
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Company Website</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={VENDOR_HELPTEXT.companyWebsite}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="text"
              id="companyWebsite"
              name="companyWebsite"
              value={formVendorData.companyWebsite || ""}
              onChange={handleChangeVendor}
            />
            {fieldErrors?.companyWebsite && (
              <FieldError message={fieldErrors.companyWebsite} />
            )}
          </div>

          {/* Company Description */}
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Company Description</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>

                  <ClickTooltip content={VENDOR_HELPTEXT.companyDescription}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="textarea"
              id="companyDescription"
              name="companyDescription"
              value={formVendorData.companyDescription || ""}
              onChange={handleChangeVendor}
            />
            {fieldErrors?.companyDescription && (
              <FieldError message={fieldErrors.companyDescription} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StepCompanyProfile;
