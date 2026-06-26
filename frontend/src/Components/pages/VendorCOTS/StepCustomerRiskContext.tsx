import Input from "../../../UI/Input";
import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import FormField from "../../../UI/FormField";
import Select from "../../../UI/Select";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.customerRiskContext;
const SENSITIVITY_OPTIONS = [{ value: "", label: "Select" }, { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }];
const RISK_OPTIONS = [{ value: "", label: "Select" }, { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }];

const StepCustomerRiskContext = ({ data, formData, setFormData }: { data: Record<string, { label: string; required?: boolean; placeholder?: string }>; formData: Record<string, string>; setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => {
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };
  return (
    <>
      <HeaderForVendor title_vendor="Customer Risk Context" className="header_for_vendor" />
      <div>
        <div className="form_fields_vendor">
          <FormField label={data[0].label} mandatory={data[0].required} tooltipText={data[0].placeholder}>
            <Input id={KEYS[0]} labelName="" type="text" name={KEYS[0]} value={formData[KEYS[0]] ?? ""} onChange={update(KEYS[0])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[1].label} mandatory={data[1].required} tooltipText={data[1].placeholder}>
            <Select labelName="" name={KEYS[1]} default_option="Select" options={SENSITIVITY_OPTIONS} value={formData[KEYS[1]] ?? ""} onChange={update(KEYS[1])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[2].label} mandatory={data[2].required} tooltipText={data[2].placeholder}>
            <Select labelName="" name={KEYS[2]} default_option="Select" options={RISK_OPTIONS} value={formData[KEYS[2]] ?? ""} onChange={update(KEYS[2])} />
          </FormField>
        </div>
      </div>
    </>
  );
};

export default StepCustomerRiskContext;