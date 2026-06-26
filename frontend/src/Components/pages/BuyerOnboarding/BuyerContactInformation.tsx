import React from "react";
import {
  BUYER_DEPARTMENTS,
  BUYER_PRIMARY_ROLE,
  BUYER_HELPTEXT,
} from "../../../constants/buyerOnboardingData";
import Input from "../../UI/Input";
import Select from "../../UI/Select";
import HeaderForBuyer from "./HeaderForBuyer";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import { Info } from "lucide-react";
import type { StepPropsBuyerrData } from "../../../types/formDataBuyer";

const BuyerContactInformation = ({
  formBuyerData,
  setFormBuyerData,
  fieldErrors,
  title,
  subTitle,
  icon,
}: StepPropsBuyerrData) => {
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
        title_vendor={title ?? "Contact Information"}
        sub_title_vendor={subTitle}
        icon={icon}
      />
      <div>
        <div>
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Primary Contact Name</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.primaryContactName}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="text"
              id="primaryContactName"
              name="primaryContactName"
              value={formBuyerData.primaryContactName}
              onChange={handleChange}
              required
            />
            {fieldErrors?.primaryContactName && (
              <FieldError message={fieldErrors.primaryContactName} />
            )}
          </div>

          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Primary Contact Email</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.primaryContactEmail}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="email"
              id="primaryContactEmail"
              name="primaryContactEmail"
              value={formBuyerData.primaryContactEmail}
              onChange={handleChange}
              required
            />
            {fieldErrors?.primaryContactEmail && (
              <FieldError message={fieldErrors.primaryContactEmail} />
            )}
          </div>
        </div>

        <div>
          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Primary Contact Role</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.primaryContactRole}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              default_option="Select primary role"
              options={BUYER_PRIMARY_ROLE}
              id="primaryContactRole"
              name="primaryContactRole"
              value={formBuyerData.primaryContactRole}
              onChange={handleChange}
              required
            />
            {fieldErrors?.primaryContactRole && (
              <FieldError message={fieldErrors.primaryContactRole} />
            )}
          </div>

          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Department/Business Unit</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.departmentOwner}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              default_option="Select department/business unit"
              id="departmentOwner"
              name="departmentOwner"
              options={BUYER_DEPARTMENTS}
              value={formBuyerData.departmentOwner}
              onChange={handleChange}
              required
            />
            {fieldErrors?.departmentOwner && (
              <FieldError message={fieldErrors.departmentOwner} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BuyerContactInformation;
