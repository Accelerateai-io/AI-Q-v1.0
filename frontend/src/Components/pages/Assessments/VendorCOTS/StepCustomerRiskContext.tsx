import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import FormField from "../../../UI/FormField";
import { AlertTriangle } from "lucide-react";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.customerRiskContext;

interface StepCustomerRiskContextProps {
  data: Record<number, { label: string; placeholder: string; required: boolean }>;
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const StepCustomerRiskContext = ({
  data,
  formData,
  setFormData,
}: StepCustomerRiskContextProps) => {
  return (
    <>
      <div className="step_form_body">
        <HeaderForVendor
          title_vendor="Customer Risk Context"
          className="header_for_vendor"
          icon={<AlertTriangle size={18} />}
        />
        <div className="step_form_right">
          <div className="form_fields_vendor">
            {KEYS.map((key, i) => {
              const config = data[i];
              if (!config) return null;
              const isTextarea = key === "regulatoryRequirements";
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

export default StepCustomerRiskContext;
