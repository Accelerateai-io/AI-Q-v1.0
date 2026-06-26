import React from "react";
import { VENDOR_COTS_FIELD_KEYS } from "../../../../constants/vendorCotsAssessmentKeys";
import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor";
import { FileCheck } from "lucide-react";
import { formatPreviewValue } from "../../../../utils/formatPreviewValue";
import "../../VendorOnboarding/StepVendorOnboardingPreview.css";

const SECTION_TITLES: Record<string, string> = {
  customerDiscovery: "Customer Discovery",
  solutionFit: "Solution Fit",
  customerRiskContext: "Customer Risk Context",
  competitiveAnalysis: "Competitive Analysis",
  customerRiskMitigation: "Customer Risk Mitigation",
};

interface StepVendorCotsPreviewProps {
  formData: Record<string, string>;
  /** Optional list to show product name for selectedProductId in Solution Fit */
  completedProductOptions?: { value: string; label: string }[];
}

function StepVendorCotsPreview({ formData, completedProductOptions = [] }: StepVendorCotsPreviewProps) {
  const sections: Record<string, { label: string; value: string }[]> = {};
  const productNameById = Object.fromEntries(completedProductOptions.map((o) => [o.value, o.label]));

  for (const [section, keys] of Object.entries(VENDOR_COTS_FIELD_KEYS)) {
    sections[section] = (keys as readonly string[]).map((key) => {
      const value = formData[key] ?? "";
      const label =
        key === "selectedProductId"
          ? "Product"
          : key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase().trim());
      const displayValue = key === "selectedProductId" && value ? productNameById[value] ?? value : value;
      return { label, value: displayValue };
    });
  }

  const order = [
    "customerDiscovery",
    "solutionFit",
    "customerRiskContext",
    "competitiveAnalysis",
    "customerRiskMitigation",
  ];

  return (
    <div className="vendor_preview">
      <HeaderForVendor
        className="header_for_vendor"
        title_vendor="Review"
        sub_title_vendor="Review your information below. Submit when everything looks correct."
        icon={<FileCheck size={18} />}
      />
      <div className="vendor_preview_sections">
        {order.map((sectionKey) => {
          const title = SECTION_TITLES[sectionKey] ?? sectionKey;
          const fields = sections[sectionKey];
          if (!fields?.length) return null;
          return (
            <section key={sectionKey} className="vendor_preview_card">
              <h3 className="vendor_preview_card_title">{title}</h3>
              <dl className="vendor_preview_list">
                {fields.map((field) => (
                  <div key={field.label} className="vendor_preview_row">
                    <dt className="vendor_preview_label">{field.label}</dt>
                    <dd className="vendor_preview_value">
                      {formatPreviewValue(field.value, field.label)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default StepVendorCotsPreview;
