import Input from "../../../UI/Input";
import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import FormField from "../../../UI/FormField";
import Select from "../../../UI/Select";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.customerDiscovery;
const DUMMY_OPTIONS = [{ value: "", label: "Select" }, { value: "healthcare", label: "Healthcare" }, { value: "finance", label: "Finance" }, { value: "retail", label: "Retail" }, { value: "other", label: "Other" }];
const BUDGET_OPTIONS = [{ value: "", label: "Select" }, { value: "under_100k", label: "Under $100K" }, { value: "100k_500k", label: "$100K - $500K" }, { value: "500k_1m", label: "$500K - $1M" }, { value: "over_1m", label: "Over $1M" }];
const TIMELINE_OPTIONS = [{ value: "", label: "Select" }, { value: "0_3", label: "0-3 months" }, { value: "3_6", label: "3-6 months" }, { value: "6_12", label: "6-12 months" }, { value: "12_plus", label: "12+ months" }];

const StepCustomerDiscovery = ({ data, formData, setFormData }: { data: Record<string, { label: string; required?: boolean; placeholder?: string }>; formData: Record<string, string>; setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => {
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };
  return (
    <>
      <HeaderForVendor title_vendor="Customer Discovery" className="header_for_vendor" />
      <div>
        <div className="form_fields_vendor">
          <FormField label={data[0].label} mandatory={data[0].required} tooltipText={data[0].placeholder}>
            <Input id={KEYS[0]} labelName="" type="text" name={KEYS[0]} value={formData[KEYS[0]] ?? ""} onChange={update(KEYS[0])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[1].label} mandatory={data[1].required} tooltipText={data[1].placeholder}>
            <Select labelName="" name={KEYS[1]} default_option="Select" options={DUMMY_OPTIONS} value={formData[KEYS[1]] ?? ""} onChange={update(KEYS[1])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[2].label} mandatory={data[2].required} tooltipText={data[2].placeholder}>
            <Input id={KEYS[2]} labelName="" type="textarea" name={KEYS[2]} value={formData[KEYS[2]] ?? ""} onChange={update(KEYS[2])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[3].label} mandatory={data[3].required} tooltipText={data[3].placeholder}>
            <Input id={KEYS[3]} labelName="" type="textarea" name={KEYS[3]} value={formData[KEYS[3]] ?? ""} onChange={update(KEYS[3])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[4].label} mandatory={data[4].required} tooltipText={data[4].placeholder}>
            <Select labelName="" name={KEYS[4]} default_option="Select" options={BUDGET_OPTIONS} value={formData[KEYS[4]] ?? ""} onChange={update(KEYS[4])} />
          </FormField>
        </div>
        <div className="form_fields_vendor">
          <FormField label={data[5].label} mandatory={data[5].required} tooltipText={data[5].placeholder}>
            <Select labelName="" name={KEYS[5]} default_option="Select" options={TIMELINE_OPTIONS} value={formData[KEYS[5]] ?? ""} onChange={update(KEYS[5])} />
          </FormField>
        </div>
      </div>
    </>
  );
};

export default StepCustomerDiscovery;
