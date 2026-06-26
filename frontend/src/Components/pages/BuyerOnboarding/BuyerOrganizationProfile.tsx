import Input from "../../UI/Input";
import Select from "../../UI/Select";
import HeaderForBuyer from "./HeaderForBuyer";
import IndustrySectorDependency from "../../UI/IndustrySectorDependency";
import ClickTooltip from "../../UI/ClickTooltip";
import FieldError from "../../UI/FieldError";
import { Info } from "lucide-react";
import {
  BUYER_ORGANIZATION_TYPE,
  BUYER_INDUSTRY_SECTORS,
  BUYER_HELPTEXT,
} from "../../../constants/buyerOnboardingData";
import type {
  BuyerDataInterface,
  StepPropsBuyerrData,
} from "../../../types/formDataBuyer";

const BuyerOrganizationProfile = ({
  formBuyerData,
  setFormBuyerData,
  fieldErrors,
  title,
  subTitle,
  icon,
}: StepPropsBuyerrData) => {
  const handleChangeBuyer = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormBuyerData({ ...formBuyerData, [name]: value });
  };

  const sectorValue: BuyerDataInterface["sector"] = {
    public_sector: formBuyerData.sector?.public_sector ?? [],
    private_sector: formBuyerData.sector?.private_sector ?? [],
    non_profit_sector: formBuyerData.sector?.non_profit_sector ?? [],
  };

  return (
    <>
      <HeaderForBuyer
        className="header_for_vendor"
        title_vendor={title ?? "Organization Profile"}
        sub_title_vendor={subTitle ?? "This information helps us tailor assessments to your context"}
        icon={icon}
      />
      <div>
        <div>
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Organization Name</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.organizationName}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="text"
              id="organizationName"
              name="organizationName"
              value={formBuyerData.organizationName || ""}
              onChange={handleChangeBuyer}
            />
            {fieldErrors?.organizationName && (
              <FieldError message={fieldErrors.organizationName} />
            )}
          </div>
          <div className="form_fields_vendor">
            <Select
              labelName={
                <div className="labelSection">
                  <span>Organization Type</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.organizationType}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="organizationType"
              name="organizationType"
              value={formBuyerData.organizationType || ""}
              onChange={handleChangeBuyer}
              default_option="Select"
              options={BUYER_ORGANIZATION_TYPE}
            />
            {fieldErrors?.organizationType && (
              <FieldError message={fieldErrors.organizationType} />
            )}
          </div>
        </div>
        <div>
          <div className="form_fields_vendor">
            <IndustrySectorDependency
              labelName={
                <div className="labelSection">
                  <span>Industry Sector</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.sector}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              id="industry_sec"
              sector={sectorValue}
              onChange={(sector) =>
                setFormBuyerData({ ...formBuyerData, sector })
              }
              defaultCategoryOption="Select sector category"
              sectorOptions={BUYER_INDUSTRY_SECTORS}
              required
            />
            {fieldErrors?.sector && (
              <FieldError message={fieldErrors.sector} />
            )}
          </div>
          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Organization Website</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip content={BUYER_HELPTEXT.organizationWebsite}>
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="text"
              id="organizationWebsite"
              name="organizationWebsite"
              value={formBuyerData.organizationWebsite || ""}
              onChange={handleChangeBuyer}
            />
            {fieldErrors?.organizationWebsite && (
              <FieldError message={fieldErrors.organizationWebsite} />
            )}
          </div>

          <div className="form_fields_vendor">
            <Input
              labelName={
                <div className="labelSection">
                  <span>Organization Description</span>
                  <sup className="form_field_mandatory_asterisk" aria-hidden="true">*</sup>
                  <ClickTooltip
                    content={BUYER_HELPTEXT.organizationDescription}
                  >
                    <Info size={14} color="#6B7280" />
                  </ClickTooltip>
                </div>
              }
              type="textarea"
              id="organizationDescription"
              name="organizationDescription"
              value={formBuyerData.organizationDescription || ""}
              onChange={handleChangeBuyer}
            />
            {fieldErrors?.organizationDescription && (
              <FieldError message={fieldErrors.organizationDescription} />
            )}
          </div>
        </div>
        {/* <div className="step_form_right">
            <div className="form_fields_vendor">
              <Input
                labelName="Organization Description"
                type="text"
                id="orgDescription"
                name="org_Description"
                value=""
                onChange=""
              />
            </div>
          </div> */}
      </div>
    </>
  );
};

export default BuyerOrganizationProfile;
