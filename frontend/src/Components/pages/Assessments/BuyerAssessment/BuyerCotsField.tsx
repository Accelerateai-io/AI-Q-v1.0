import React from "react";
import FormField from "../../../UI/FormField";
import ChipMultiSelect from "../../../UI/ChipMultiSelect";
import FieldError from "../../../UI/FieldError";

const defaultOption = "Select";

/** Renders input, single select, or multiselect based on field config. Multiselect values stored as JSON array string. */
const BuyerCotsField = ({
  fieldKey,
  label,
  placeholder,
  required,
  options,
  multiselect,
  value,
  onChange,
  readOnly,
  errorMessage,
}) => {
  const safeValue = value ?? "";

  // Read-only from onboarding: show value only (no dropdown) so geographic regions / tech stack display as plain text
  if (readOnly) {
    if (options && multiselect) {
      let displayText = "";
      try {
        if (typeof safeValue === "string" && safeValue.trim()) {
          const parsed = JSON.parse(safeValue);
          displayText = Array.isArray(parsed) ? parsed.join(", ") : String(safeValue);
        }
      } catch {
        displayText = typeof safeValue === "string" ? safeValue : String(safeValue ?? "");
      }
      return (
        <>
          <FormField label={label} mandatory={required} tooltipText={placeholder}>
            <input
              type="text"
              value={displayText}
              readOnly
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed", color: "#333" }}
              aria-label={label}
            />
          </FormField>
          {errorMessage && <FieldError message={errorMessage} />}
        </>
      );
    }
    if (options && !multiselect) {
      const strValue = typeof safeValue === "string" ? safeValue : String(safeValue);
      const valueInOptions = options.some((o) => o.value === strValue || o.label === strValue);
      return (
        <>
          <FormField label={label} mandatory={required} tooltipText={placeholder}>
            <select
              value={strValue || ""}
              disabled
              readOnly
              className="select_input"
              style={{
                backgroundColor: "#f5f5f5",
                cursor: "not-allowed",
                color: "#333",
              }}
              aria-label={label}
            >
              <option value="">{placeholder || defaultOption}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              {!valueInOptions && strValue ? (
                <option value={strValue}>{strValue}</option>
              ) : null}
            </select>
          </FormField>
          {errorMessage && <FieldError message={errorMessage} />}
        </>
      );
    }
    return (
      <>
        <FormField label={label} mandatory={required} tooltipText={placeholder}>
          <input
            type="text"
            value={typeof safeValue === "string" ? safeValue : (Array.isArray(safeValue) ? safeValue.join(", ") : JSON.stringify(safeValue))}
            readOnly
            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            aria-label={label}
          />
        </FormField>
        {errorMessage && <FieldError message={errorMessage} />}
      </>
    );
  }

  if (options && multiselect) {
    let selected: string[] = [];
    try {
      if (typeof safeValue === "string" && safeValue.trim()) {
        selected = JSON.parse(safeValue);
        if (!Array.isArray(selected)) selected = [];
      }
    } catch {
      selected = [];
    }
    return (
      <>
        <FormField label={label} mandatory={required} tooltipText={placeholder}>
          <ChipMultiSelect
            id={fieldKey}
            labelName=""
            options={options}
            value={selected}
            onChange={(selectedValues) => onChange(JSON.stringify(selectedValues))}
          />
        </FormField>
        {errorMessage && <FieldError message={errorMessage} />}
      </>
    );
  }

  if (options && !multiselect) {
    return (
      <>
        <FormField label={label} mandatory={required} tooltipText={placeholder}>
          <select
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            className={`select_input ${!safeValue ? "select_input--placeholder" : ""}`}
            aria-label={label}
          >
            <option value="">{placeholder || defaultOption}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
        {errorMessage && <FieldError message={errorMessage} />}
      </>
    );
  }

  return (
    <>
      <FormField label={label} mandatory={required} tooltipText={placeholder}>
        <input
          type="text"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormField>
      {errorMessage && <FieldError message={errorMessage} />}
    </>
  );
};

export default BuyerCotsField;
