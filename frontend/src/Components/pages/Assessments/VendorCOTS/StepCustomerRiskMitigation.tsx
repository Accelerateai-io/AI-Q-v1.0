import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import FormField from "../../../UI/FormField";
import { Shield } from "lucide-react";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.customerRiskMitigation;

interface StepCustomerRiskMitigationProps {
  data: Record<number, { label: string; placeholder: string; required: boolean }>;
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const StepCustomerRiskMitigation = ({
  data,
  formData,
  setFormData,
}: StepCustomerRiskMitigationProps) => {
  return (
    <>
      <div className="step_form_body">
        <HeaderForVendor
          title_vendor="Customer Risk Mitigation"
          className="header_for_vendor"
          icon={<Shield size={18} />}
        />
        <div className="step_form_right">
          <div className="form_fields_vendor">
            {KEYS.map((key, i) => {
              const config = data[i];
              if (!config) return null;
              return (
                <FormField
                  key={key}
                  label={config.label}
                  mandatory={config.required}
                  tooltipText={config.placeholder}
                >
                  <textarea
                    id={key}
                    name={key}
                    value={formData[key] ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    rows={4}
                    className="textarea_field"
                  />
                </FormField>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default StepCustomerRiskMitigation;
