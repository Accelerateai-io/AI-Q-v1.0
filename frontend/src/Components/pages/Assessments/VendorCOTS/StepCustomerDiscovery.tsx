import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import FormField from "../../../UI/FormField";
import { Search } from "lucide-react";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.customerDiscovery;

interface StepCustomerDiscoveryProps {
  data: Record<number, { label: string; placeholder: string; required: boolean }>;
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const StepCustomerDiscovery = ({ data, formData, setFormData }: StepCustomerDiscoveryProps) => {
  return (
    <>
      <div className="step_form_body">
        <HeaderForVendor
          title_vendor="Customer Discovery"
          className="header_for_vendor"
          icon={<Search size={24} />}
        />
        <div className="step_form_right">
          <div>
            {KEYS.map((key, i) => {
              const config = data[i];
              if (!config) return null;
              const isTextarea = i === 2 || i === 3;
              return (
                <FormField
                  key={key}
                  label={config.label}
                  mandatory={config.required}
                  tooltipText={config.placeholder}
                >
                  {isTextarea ? (
                    <textarea
                      id={key}
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      rows={3}
                      className="textarea_field"
                    />
                  ) : (
                    <input
                      type="text"
                      id={key}
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="input_field"
                    />
                  )}
                </FormField>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default StepCustomerDiscovery;
