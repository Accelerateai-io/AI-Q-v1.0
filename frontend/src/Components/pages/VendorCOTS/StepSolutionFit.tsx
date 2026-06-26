// ** Check the import paths - ../ is added extra in the below line, error as type declaration or header cannot find
// import Input from "../../../UI/Input"; 
import Input from "../../UI/Input";
import HeaderForVendor from "../VendorOnboarding/HeaderForVendor";
import FormField from "../../UI/FormField";
import Select from "../../UI/Select";
import { VENDOR_COTS_FIELD_KEYS } from "../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.solutionFit;
const IMPL_OPTIONS = [{ value: "", label: "Select" }, { value: "cloud", label: "Cloud" }, { value: "on_prem", label: "On-premise" }, { value: "hybrid", label: "Hybrid" }];
const CUSTOM_OPTIONS = [{ value: "", label: "Select" }, { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }];
const INTEGRATION_OPTIONS = [{ value: "", label: "Select" }, { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }];

const StepSolutionFit = ({ data, formData, setFormData }: { data: Record<string, { label: string; required?: boolean; placeholder?: string }>; formData: Record<string, string>; setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => {
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };
  return (
    <>
      <HeaderForVendor title_vendor="Solution Fit" className="header_for_vendor" />
      <div>
        <div className="form_fields_vendor">
          <FormField label={data[0].label} mandatory={data[0].required} tooltipText={data[0].placeholder}>
            <Input id={KEYS[0]} labelName="" type="text" name={KEYS[0]} value={formData[KEYS[0]] ?? ""} onChange={update(KEYS[0])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[1].label} mandatory={data[1].required} tooltipText={data[1].placeholder}>
            <Select labelName="" name={KEYS[1]} default_option="Select" options={IMPL_OPTIONS} value={formData[KEYS[1]] ?? ""} onChange={update(KEYS[1])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[2].label} mandatory={data[2].required} tooltipText={data[2].placeholder}>
            <Select labelName="" name={KEYS[2]} default_option="Select" options={CUSTOM_OPTIONS} value={formData[KEYS[2]] ?? ""} onChange={update(KEYS[2])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[3].label} mandatory={data[3].required} tooltipText={data[3].placeholder}>
            <Select labelName="" name={KEYS[3]} default_option="Select" options={INTEGRATION_OPTIONS} value={formData[KEYS[3]] ?? ""} onChange={update(KEYS[3])} />
          </FormField>
        </div>
      </div>
    </>
  );
};

export default StepSolutionFit;
