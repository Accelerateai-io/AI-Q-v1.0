import HeaderForVendor from "../VendorOnboarding/HeaderForVendor";
import FormField from "../../UI/FormField";
import Select from "../../UI/Select";
import Input from "../../UI/Input";
import { FlaskConical } from "lucide-react";

const StepAiSafetyAndTesting = ({data}) => {
   const dummy_Data = ["A"]; // just for now to UI wokring
  return (
    <>
      <HeaderForVendor
        title_vendor="AI Safety & Testing"
        className="header_for_vendor"
        icon={<FlaskConical size={18} />}
      />

      <div>
        <div className="form_fields_vendor">
          {/* VendorType */}
          <FormField
            label={data[0].label}
            mandatory={data[0].required}
            tooltipText={data[0].placeholder}
            // errorText={errors.companyWebsite}
          >
            <Select
              // id="companyWebsite"
              // name="companyWebsite"
              // type="tex"
              default_option="Select"
              options={dummy_Data}
              // value={""}
              // onChange={handleChangeVendor}
            />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          {/* Onboarding - Indsutry Selector */}
          <FormField
            label={data[1].label}
            mandatory={data[1].required}
            tooltipText={data[1].placeholder}
            // errorText={errors.companyWebsite}
          >
              <Select
              // id="companyWebsite"
              // name="companyWebsite"
              // type="tex"
              default_option="Select"
              options={dummy_Data}
              // value={""}
              // onChange={handleChangeVendor}
            />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          {/* Onboarding - Vendor Maturity Stage Field */}
          <FormField
            label={data[2].label}
            mandatory={data[2].required}
            tooltipText={data[2].placeholder}
            // errorText={errors.companyWebsite}
          >
            <Select
              // id="companyWebsite"
              // name="companyWebsite"
              // type="tex"
              default_option="Select"
              options={dummy_Data}
              // value={""}
              // onChange={handleChangeVendor}
            />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          {/* Onboarding - Company Website Field */}
          <FormField
            label={data[3].label}
            mandatory={data[3].required}
            tooltipText={data[3].placeholder}
            // errorText={errors.companyWebsite}
          >
             <Select
              // id="companyWebsite"
              // name="companyWebsite"
              // type="tex"
              default_option="Select"
              options={dummy_Data}
              // value={""}
              // onChange={handleChangeVendor}
            />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          {/* Onboarding - Company Website Field */}
          <FormField
            label={data[3].label}
            mandatory={data[3].required}
            tooltipText={data[3].placeholder}
            // errorText={errors.companyWebsite}
          >
             <Select
              // id="companyWebsite"
              // name="companyWebsite"
              // type="tex"
              default_option="Select"
              options={dummy_Data}
              // value={""}
              // onChange={handleChangeVendor}
            />
          </FormField>
        </div>
      </div>
    </>
  );
}

export default StepAiSafetyAndTesting