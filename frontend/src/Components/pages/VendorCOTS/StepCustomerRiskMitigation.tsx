import Input from "../../../UI/Input";
import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import FormField from "../../../UI/FormField";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.customerRiskMitigation;

const StepCustomerRiskMitigation = ({ data, formData, setFormData }: { data: Record<string, { label: string; required?: boolean; placeholder?: string }>; formData: Record<string, string>; setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => {
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };
  return (
    <>
      <HeaderForVendor title_vendor="Customer Risk Mitigation" className="header_for_vendor" />
      <div>
        <div className="form_fields_vendor">
          <FormField label={data[0].label} mandatory={data[0].required} tooltipText={data[0].placeholder}>
            <Input id={KEYS[0]} labelName="" type="textarea" name={KEYS[0]} value={formData[KEYS[0]] ?? ""} onChange={update(KEYS[0])} />
          </FormField>
        </div>
      </div>
    </>
  );
};

export default StepCustomerRiskMitigation;