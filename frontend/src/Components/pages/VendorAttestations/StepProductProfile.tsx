// import Input from "../../UI/Input";
// import type LabelSection from "../../UI/LabelSection";
import FormField from "../../UI/FormField";
import Input from "../../UI/Input";
import HeaderForVendor from "../VendorOnboarding/HeaderForVendor";
import { Package } from "lucide-react";

const StepProductProfile = ({ data }) => {
  const PRODUCT_PROFILE = data;
  return (
    <>
      <HeaderForVendor
        className="header_for_vendor"
        title_vendor="Product Profile "
        icon={<Package size={18} />}
        // sub_title_vendor="Tell us about your AI products and services"
      />
      <div>
        <div className="form_fields_vendor">
          <FormField
            label={data[0].label}
            mandatory={data[0].required}
            tooltipText={data[0].placeholder}
            // errorText={errors.companyWebsite}
          >

            {/* <select></select> */}
            {/* <Select
              // id="companyWebsite"
              // name="companyWebsite"
              // type="tex"
              default_option="Select"
              options={VENDOR_TYPES}
              // value={""}
              // onChange={handleChangeVendor}
            /> */}
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField
            label={data[1].label}
            mandatory={data[1].required}
            tooltipText={data[1].placeholder}
            // errorText={errors.companyWebsite}
          >

          <Input type="textarea"/>
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField
            label={data[2].label}
            mandatory={data[2].required}
            tooltipText={data[2].placeholder}
            // errorText={errors.companyWebsite}
          >

          <Input type="textarea"/>
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField
            label={data[3].label}
            mandatory={data[3].required}
            tooltipText={data[3].placeholder}
            // errorText={errors.companyWebsite}
          >

          <Input type="textarea"/>
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField
            label={data[4].label}
            mandatory={data[4].required}
            tooltipText={data[4].placeholder}
            // errorText={errors.companyWebsite}
          >

          <Input type="textarea"/>
          </FormField>
        </div>
      </div>
    </>
  );
};

export default StepProductProfile;
