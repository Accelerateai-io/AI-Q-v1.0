import React from "react";
import type { BuyerDataInterface } from "../../../types/formDataBuyer";
import { BUYER_PREVIEW_SECTIONS } from "../../../constants/buyerOnboardingData";
import { formatPreviewValue } from "../../../utils/formatPreviewValue";
import "../VendorOnboarding/StepVendorOnboardingPreview.css";

interface StepBuyerOnboardingPreviewProps {
  formBuyerData: BuyerDataInterface;
  title?: string;
  subTitle?: string;
  icon?: React.ReactNode;
}

const StepBuyerOnboardingPreview: React.FC<StepBuyerOnboardingPreviewProps> = ({
  formBuyerData,
}) => {
  return (
    <div className="vendor_preview">
      <p className="vendor_preview_intro">
        Review your information below. Submit when everything looks correct.
      </p>
      <div className="vendor_preview_sections">
        {BUYER_PREVIEW_SECTIONS.map((section) => (
          <section key={section.title} className="vendor_preview_card">
            <h3 className="vendor_preview_card_title">{section.title}</h3>
            <dl className="vendor_preview_list">
              {section.fields.map((field) => {
                const value = field.value(formBuyerData);
                return (
                  <div key={field.label} className="vendor_preview_row">
                    <dt className="vendor_preview_label">{field.label}</dt>
                    <dd className="vendor_preview_value">
                      {formatPreviewValue(value, field.label)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
};

export default StepBuyerOnboardingPreview;
