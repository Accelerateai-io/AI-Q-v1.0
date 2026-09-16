/**
 * Renders one section of the Vendor COTS multistep form from schema.
 * Input types: text, textarea, select, multiselect, date, repeater.
 */
import type { ChangeEvent } from "react"
import type { ReactNode } from "react"
import { Plus, Trash2 } from "lucide-react"
import Button from "../../../UI/Button"
import HeaderForVendor from "../../VendorOnboarding/HeaderForVendor"
import FormField from "../../../UI/FormField"
import Select from "../../../UI/Select"
import ChipMultiSelect from "../../../UI/ChipMultiSelect"
import type { VendorCotsSectionConfig, VendorCotsFieldConfig } from "../../../../constants/vendorCotsFormSchema"
import { getVendorCotsFieldOptions, getVendorCotsGlobalExclusiveValue } from "../../../../constants/vendorCotsOptions"

function parseMultiselectValue(value: string | undefined): string[] {
  if (value == null || value === "") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function parseRepeaterRows(value: string | undefined): Record<string, string>[] {
  if (value == null || value === "") return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) => {
      if (!row || typeof row !== "object") return {}
      return Object.fromEntries(
        Object.entries(row as Record<string, unknown>).map(([k, v]) => [k, v == null ? "" : String(v)]),
      )
    })
  } catch {
    return []
  }
}

function isFieldVisible(field: VendorCotsFieldConfig, formData: Record<string, string>): boolean {
  if (!field.showWhen) return true
  const selected = parseMultiselectValue(formData[field.showWhen.key])
  return selected.includes(field.showWhen.includes)
}

export interface VendorCotsDynamicStepProps {
  section: VendorCotsSectionConfig
  formData: Record<string, string>
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fieldErrors?: Record<string, string>
  title?: string
  subTitle?: string
  icon?: ReactNode
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

  function renderRepeater(field: VendorCotsFieldConfig) {
    const cfg = field.repeater
    if (!cfg) return null
    const key = field.key
    const rows = parseRepeaterRows(formData[key])
    const displayRows = rows.length > 0 ? rows : [{}]
    const errorText = fieldErrors[key]

    function commit(next: Record<string, string>[]) {
      setFormData((prev) => ({ ...prev, [key]: JSON.stringify(next) }))
    }

    return (
      <div key={key} className="form_fields_vendor">
        <FormField
          label={field.label}
          mandatory={field.required}
          tooltipText={field.placeholder}
          errorText={errorText}
        >
          <div className="vendor_incident_list">
            {displayRows.map((row, index) => (
              <div key={`${key}-${index}`} className="vendor_incident_card">
                <div className="vendor_incident_card_header">
                  <p className="vendor_incident_card_title">
                    {cfg.itemLabel} {index + 1}
                  </p>
                  {displayRows.length > cfg.minRows && (
                    <button
                      type="button"
                      className="vendor_incident_remove"
                      onClick={() => commit(displayRows.filter((_, i) => i !== index))}
                      aria-label={`Remove ${cfg.itemLabel} ${index + 1}`}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>
                {cfg.columns.map((col) => {
                  const colValue = row[col.key] ?? ""
                  if (col.inputType === "select") {
                    const colOpts = col.optionsKey ? getVendorCotsFieldOptions(col.optionsKey) : []
                    return (
                      <div key={col.key} className="form_fields_vendor">
                        <Select
                          labelName={col.label}
                          id={`${key}-${index}-${col.key}`}
                          name={`${key}-${index}-${col.key}`}
                          value={colValue}
                          default_option={`Select ${col.label.toLowerCase()}`}
                          options={colOpts ?? []}
                          required={col.required}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                            const next = displayRows.map((r, i) =>
                              i === index ? { ...r, [col.key]: e.target.value } : r,
                            )
                            commit(next)
                          }}
                        />
                      </div>
                    )
                  }
                  return (
                    <div key={col.key} className="form_fields_vendor">
                      <label className="labelSection" htmlFor={`${key}-${index}-${col.key}`}>
                        {col.label}
                      </label>
                      <input
                        type="text"
                        id={`${key}-${index}-${col.key}`}
                        name={`${key}-${index}-${col.key}`}
                        value={colValue}
                        maxLength={col.maxLength}
                        className="input_field"
                        style={{ width: "100%" }}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const next = displayRows.map((r, i) =>
                            i === index ? { ...r, [col.key]: e.target.value } : r,
                          )
                          commit(next)
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {displayRows.length < cfg.maxRows && (
            <div className="vendor_incident_add">
              <Button
                type="button"
                className="vendor_incident_add_btn"
                onClick={() => commit([...displayRows, {}])}
              >
                <span>
                  <Plus size={14} />
                  Add {cfg.itemLabel.toLowerCase()}
                </span>
              </Button>
            </div>
          )}
        </FormField>
      </div>
    )
  }

  function renderField(field: VendorCotsFieldConfig) {
    if (!isFieldVisible(field, formData)) return null
    const key = field.key
    const value = formData[key] ?? ""
    const isProductSelect = field.optionsKey === "vendorCompletedProducts"
    const options = isProductSelect
      ? completedProductOptions
      : field.optionsKey
        ? getVendorCotsFieldOptions(field.optionsKey)
        : undefined
    const errorText = fieldErrors[key]
    const exclusive = field.exclusiveValue ?? getVendorCotsGlobalExclusiveValue(field.optionsKey)

    if (field.inputType === "repeater") return renderRepeater(field)

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
              globalExclusiveValue={exclusive}
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

    if (field.inputType === "date") {
      const today = new Date().toISOString().slice(0, 10)
      let dateHint = ""
      if (value) {
        const picked = new Date(`${value}T00:00:00`)
        const ageDays = Math.floor((Date.now() - picked.getTime()) / 86_400_000)
        if (value > today) dateHint = "Research date cannot be in the future."
        else if (ageDays > 90) dateHint = "This research is older than 90 days — consider refreshing it."
      }
      return (
        <div key={key} className="form_fields_vendor">
          <FormField
            label={field.label}
            mandatory={field.required}
            tooltipText={field.placeholder}
            errorText={errorText || (value > today ? dateHint : "")}
          >
            <input
              type="date"
              id={key}
              name={key}
              value={value}
              max={today}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="input_field"
              style={{ width: "100%" }}
            />
            {value && value <= today && dateHint && (
              <p className="chip-multi-select-description">{dateHint}</p>
            )}
          </FormField>
        </div>
      )
    }

    if (field.inputType === "textarea") {
      const maxLength = field.maxLength
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
              maxLength={maxLength}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({
                  ...prev,
                  [key]: maxLength ? e.target.value.slice(0, maxLength) : e.target.value,
                }))
              }
              rows={3}
              className="textarea_field"
            />
            {maxLength != null && (
              <p className="chip-multi-select-description">{value.length}/{maxLength}</p>
            )}
          </FormField>
        </div>
      )
    }

    const maxLength = field.maxLength
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
          <div>
            {section.fields.map((field) => renderField(field))}
          </div>
        </div>
      </div>
    </>
  )
}

export default VendorCotsDynamicStep
