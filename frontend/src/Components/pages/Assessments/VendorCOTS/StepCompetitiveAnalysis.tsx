import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import FormField from "../../../UI/FormField";
import { BarChart2 } from "lucide-react";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";

const KEYS = VENDOR_COTS_FIELD_KEYS.competitiveAnalysis;

interface StepCompetitiveAnalysisProps {
  data: Record<number, { label: string; placeholder: string; required: boolean }>;
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const StepCompetitiveAnalysis = ({
  data,
  formData,
  setFormData,
}: StepCompetitiveAnalysisProps) => {
  return (
    <>
      <div className="step_form_body">
        <HeaderForVendor
          title_vendor="Competitive Analysis"
          className="header_for_vendor"
          icon={<BarChart2 size={18} />}
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
                    rows={3}
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

export default StepCompetitiveAnalysis;
