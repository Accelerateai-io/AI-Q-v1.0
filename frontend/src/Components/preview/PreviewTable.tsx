// src/components/preview/PreviewTable.tsx

import React from "react";
import type { PreviewField, PreviewValue } from "../../types/preview";
import { formatPreviewValueAsString } from "../../utils/formatPreviewValue";
import "./preview_table.css";

interface PreviewTableProps<T> {
  dataForPreview: T;
  previewFields: PreviewField<T>[];
  previewTitle: string;
}

const PreviewTable = <T,>({
  dataForPreview,
  previewFields,
  previewTitle,
}: PreviewTableProps<T>) => {
  if (!dataForPreview) return null;

const renderValue = (value: PreviewValue, fieldLabel?: string): React.ReactNode => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const clickableLinks = ["email", "website"];

  // Multi-select/array/object: user-friendly format, never raw JSON or array
  const str = typeof value === "string" ? value.trim() : "";
  if (typeof value === "string" && (str.startsWith("[") || str.startsWith("{"))) {
    return formatPreviewValueAsString(value);
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "N/A";
  }
  if (typeof value === "object") {
    return (
      <table className="preview-nested-table">
        <tbody>
          {Object.entries(value).map(([k, v]) => (
            <tr key={k}>
              <td className="preview-nested-key">
                {k.replace(/_/g, " ").replace(/([A-Z])/g, " $1") + ":"}
              </td>
              <td className="preview-nested-value">{renderValue(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (
    fieldLabel &&
    clickableLinks.some((link) => fieldLabel.toLowerCase().includes(link))
  ) {
    if (fieldLabel.toLowerCase().includes("email")) {
      return <a href={`mailto:${value}`}>{value}</a>;
    }
    return (
      <a href={String(value)} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    );
  }

  return String(value);
};


  return (
    <div className="preview-container">
      <h2 className="preview-title">{previewTitle}</h2>

      <table className="preview-table">
        <tbody>
          {previewFields.map((field) => (
            <tr key={field.label}>
              <td className="preview-label">{field.label}</td>
              <td className="preview-value">
                {renderValue(field.value(dataForPreview),  field.label)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PreviewTable;
