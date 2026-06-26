import React from "react"
import type { VendorFormData } from "../../../types/preview"
import { VENDOR_PREVIEW_SECTIONS } from "../../../constants/vendorOnboardingData"
import { formatPreviewValue } from "../../../utils/formatPreviewValue"
import "./StepVendorOnboardingPreview.css"

interface StepVendorOnboardingPreviewProps {
  formVendorData: VendorFormData
}

const StepVendorOnboardingPreview: React.FC<StepVendorOnboardingPreviewProps> = ({
  formVendorData,
}) => {
  return (
    <div className="vendor_preview">
      <p className="vendor_preview_intro">
        Review your information below. Submit when everything looks correct.
      </p>
      <div className="vendor_preview_sections">
        {VENDOR_PREVIEW_SECTIONS.map((section) => (
          <section key={section.title} className="vendor_preview_card">
            <h3 className="vendor_preview_card_title">{section.title}</h3>
            <dl className="vendor_preview_list">
              {section.fields.map((field) => {
                const value = field.value(formVendorData)
                return (
                  <div key={field.label} className="vendor_preview_row">
                    <dt className="vendor_preview_label">{field.label}</dt>
                    <dd className="vendor_preview_value">
                      {formatPreviewValue(value, field.label)}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}

export default StepVendorOnboardingPreview
