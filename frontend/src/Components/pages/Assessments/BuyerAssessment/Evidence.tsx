import { BUYER_COTS_FIELD_KEYS } from "../../../../constants/buyerCotsAssessmentKeys";
import { MAX_FILE_SIZE_BYTES } from "../../../../constants/vendorAttestationDocumentConstants";
import BuyerCotsField from "./BuyerCotsField";
import FormField from "../../../UI/FormField";
import FileUpload from "../../../UI/FileUpload";
import HeaderForBuyer from "../../BuyerOnboarding/HeaderForBuyer";

function isUploadField(config: { label?: string; placeholder?: string; options?: unknown }): boolean {
  const label = (config.label ?? "").toLowerCase();
  const placeholder = (config.placeholder ?? "").toLowerCase();
  return !config.options && (label.includes("upload") || placeholder.includes("upload"));
}

function parseFileNames(value: string | undefined): string[] {
  if (value == null || String(value).trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const Evidence = ({
  data,
  formData,
  setFormData,
  fieldErrors,
  title,
  subTitle,
  icon,
}) => {
  const keys = BUYER_COTS_FIELD_KEYS.evidence;
  return (
    <>
      <HeaderForBuyer
        className="header_for_vendor"
        title_vendor={title ?? "Evidence"}
        sub_title_vendor={subTitle}
        icon={icon}
      />
      <div>
        {keys.map((key, i) => {
          const config = data[i];
          if (config && isUploadField(config)) {
            const fileNames = parseFileNames(formData[key]);
            return (
              <div key={key} className="form_fields_vendor buyer_cots_field">
                <FormField
                  label={config.label}
                  mandatory={config.required === "true"}
                  tooltipText={config.placeholder}
                >
                  <FileUpload
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    maxSizeBytes={MAX_FILE_SIZE_BYTES}
                    value={fileNames}
                    onFilesChange={(names) =>
                      setFormData((prev) => ({ ...prev, [key]: JSON.stringify(names) }))
                    }
                  />
                </FormField>
              </div>
            );
          }
          return (
            <div key={key} className="form_fields_vendor buyer_cots_field">
              <BuyerCotsField
                fieldKey={key}
                label={config.label}
                placeholder={config.placeholder}
                required={config.required}
                options={config.options}
                multiselect={config.multiselect}
                value={formData[key]}
                onChange={(val) => setFormData((prev) => ({ ...prev, [key]: val }))}
                errorMessage={fieldErrors?.[key]}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Evidence;
