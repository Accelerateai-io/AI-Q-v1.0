import HeaderForVendor from "../VendorOnboarding/HeaderForVendor";
import FormField from "../../UI/FormField";
import Select from "../../UI/Select";
import { ShieldCheck } from "lucide-react";

const StepComplianceAndCertifications = ({data}) => {
    const dummy_Data = ["A"]; // just for now to UI wokring

  return (
    <>
      <HeaderForVendor
        title_vendor="Compliance & Certifications "
        className="header_for_vendor"
        icon={<ShieldCheck size={18} />}
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
        
      </div>
    </>
  )
}

export default StepComplianceAndCertifications