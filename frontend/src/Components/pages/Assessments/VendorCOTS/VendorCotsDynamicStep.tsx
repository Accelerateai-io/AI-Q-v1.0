/**
 * Renders one section of the Vendor COTS multistep form from schema.
 * Input types: text, textarea, select, multiselect. Options from vendorCotsOptions.
 * Validation (required) is applied per field; fieldErrors shown inline.
 */
import type { ChangeEvent } from "react"
import type { ReactNode } from "react"
import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor"
import FormField from "../../../UI/FormField"
import Select from "../../../UI/Select"
import ChipMultiSelect from "../../../UI/ChipMultiSelect"
import type { VendorCotsSectionConfig, VendorCotsFieldConfig } from "../../../../constants/vendorCotsFormSchema"
import { getVendorCotsFieldOptions } from "../../../../constants/vendorCotsOptions"

function parseMultiselectValue(value: string | undefined): string[] {
  if (value == null || value === "") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export interface VendorCotsDynamicStepProps {
  section: VendorCotsSectionConfig
  formData: Record<string, string>
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fieldErrors?: Record<string, string>
  title?: string
  subTitle?: string
  icon?: ReactNode
  /** Options for Product dropdown (vendor's completed attestations). Used when field.optionsKey === "vendorCompletedProducts". */
  completedProductOptions?: { value: string; label: string }[]
}

function VendorCotsDynamicStep({
  section,
  formData,
  setFormData,
  fieldErrors = {},
  title,
  subTitle,
  icon,
  completedProductOptions = [],
}: VendorCotsDynamicStepProps) {
  const displayTitle = title ?? section.label
  const displaySubTitle = subTitle ?? section.subTitle

  function renderField(field: VendorCotsFieldConfig) {
    const key = field.key
    const value = formData[key] ?? ""
    const isProductSelect = field.optionsKey === "vendorCompletedProducts"
    const options = isProductSelect
      ? completedProductOptions
      : field.optionsKey
        ? getVendorCotsFieldOptions(field.optionsKey)
        : undefined
    const errorText = fieldErrors[key]

    if (field.inputType === "multiselect" && options) {
      const arrValue = parseMultiselectValue(value)
      return (
        <div key={key} className="form_fields_vendor">
          <FormField
            label={field.label}
            mandatory={field.required}
            tooltipText={field.placeholder}
            errorText={errorText}
          >
            <ChipMultiSelect
              id={`cots-${section.id}-${key}`}
              labelName=""
              options={options}
              value={arrValue}
              onChange={(selected) =>
                setFormData((prev) => ({ ...prev, [key]: JSON.stringify(selected) }))
              }
            />
          </FormField>
        </div>
      )
    }

    if (field.inputType === "select" && isProductSelect && completedProductOptions.length === 0) {
      return (
        <div key={key} className="form_fields_vendor">
          <FormField
            label={field.label}
            mandatory={field.required}
            tooltipText={field.placeholder}
            errorText={errorText ?? "No completed products. Complete a vendor self-attestation first."}
          >
            <Select
              labelName=""
              id={`cots-${section.id}-${key}`}
              name={key}
              value=""
              default_option="No completed products"
              options={[]}
              required={field.required}
              onChange={() => {}}
            />
          </FormField>
        </div>
      )
    }

    if (field.inputType === "select" && options && options.length > 0) {
      return (
        <div key={key} className="form_fields_vendor">
          <FormField
            label={field.label}
            mandatory={field.required}
            tooltipText={field.placeholder}
            errorText={errorText}
          >
            <Select
              labelName=""
              id={`cots-${section.id}-${key}`}
              name={key}
              value={value}
              default_option={field.placeholder ?? "Select..."}
              options={options}
              required={field.required}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          </FormField>
        </div>
      )
    }

    if (field.inputType === "textarea") {
      return (
        <div key={key} className="form_fields_vendor">
          <FormField
            label={field.label}
            mandatory={field.required}
            tooltipText={field.placeholder}
            errorText={errorText}
          >
            <textarea
              id={key}
              name={key}
              value={value}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, [key]: e.target.value }))
              }
              rows={3}
              className="textarea_field"
            />
          </FormField>
        </div>
      )
    }

    const maxLength =
      key === "regulatoryRequirementsOther" || key === "customerSpecificRisksOther"
        ? 300
        : undefined
    return (
      <div key={key} className="form_fields_vendor">
        <FormField
          label={field.label}
          mandatory={field.required}
          tooltipText={field.placeholder}
          errorText={errorText}
        >
          <input
            type="text"
            id={key}
            name={key}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({
                ...prev,
                [key]: maxLength ? e.target.value.slice(0, maxLength) : e.target.value,
              }))
            }
            maxLength={maxLength}
            className="input_field"
            style={{ width: "100%" }}
          />
        </FormField>
      </div>
    )
  }

  return (
    <>
      <div className="step_form_body">
        <HeaderForVendor
          className="header_for_vendor"
          title_vendor={displayTitle}
          sub_title_vendor={displaySubTitle}
          icon={icon}
        />
        <div className="step_form_right">
          <div >
            {section.fields.map((field) => renderField(field))}
          </div>
        </div>
      </div>
    </>
  )
}

export default VendorCotsDynamicStep
