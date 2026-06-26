import HeaderForBuyer from "../../BuyerOnboarding/HeaderForBuyer";
import { BUYER_COTS_FIELD_KEYS } from "../../../../constants/buyerCotsAssessmentKeys";
import BuyerCotsField from "./BuyerCotsField";

const RiskProfile = ({
  data,
  formData,
  setFormData,
  readOnlyKeys = [],
  fieldErrors,
  title,
  subTitle,
  icon,
}) => {
  const keys = BUYER_COTS_FIELD_KEYS.riskProfile;
  const isReadOnly = (key) => readOnlyKeys.includes(key);
  return (
    <>
      <HeaderForBuyer
        className="header_for_vendor"
        title_vendor={title ?? "Risk Profile"}
        sub_title_vendor={subTitle}
        icon={icon}
      />
      <div>
        {keys.map((key, i) => {
          const config = data[i];
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
                readOnly={isReadOnly(key)}
                errorMessage={fieldErrors?.[key]}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};

export default RiskProfile;
