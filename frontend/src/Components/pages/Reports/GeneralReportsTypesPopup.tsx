import { Ban, FileText, InfoIcon } from "lucide-react";
import React, { useState } from "react";
import Button from "../../UI/Button";
import { getReportTypesForPortal, type ReportTypeOption } from "./reportTypes";

export const REPORT_TYPE_ERROR = "Please select any of the report";

interface GeneralReportsTypesPopupProps {
  selectedReport: string;
  onReportTypeChange: (value: string) => void;
  onClose: () => void;
  onGenerateReport?: (reportType: string) => void;
  alreadyGeneratedError?: string;
  /** "vendor" | "buyer" – filters report types by portal (vendor-only vs buyer-only). Defaults to "vendor". */
  portal?: "vendor" | "buyer";
}

function GeneralReportsTypesPopup({
  selectedReport,
  onReportTypeChange,
  onClose,
  onGenerateReport,
  alreadyGeneratedError = "",
  portal = "vendor",
}: GeneralReportsTypesPopupProps) {
  const [generateError, setGenerateError] = useState("");
  const reportTypesToShow: ReportTypeOption[] = getReportTypesForPortal(portal);

  function handleGenerateReport() {
    const trimmed = (selectedReport ?? "").trim();
    if (!trimmed) {
      setGenerateError(REPORT_TYPE_ERROR);
      return;
    }
    setGenerateError("");
    onGenerateReport?.(trimmed);
  }

  return (
    <>
      <div className="popup_fields">
        <div className="general_reports_types_popup_options">
          {reportTypesToShow.map(({ label, Icon, accent }, index) => (
            <div
              className="report_type_option_wrap"
              key={index}
              data-accent={accent}
            >
              <label className="radio-box">
                <input
                  type="radio"
                  name="reportType"
                  value={label}
                  checked={selectedReport === label}
                  onChange={(e) => {
                    onReportTypeChange(e.target.value);
                    setGenerateError("");
                  }}
                />
                <div className="radio-content">
                  <Icon className="icon" size={18} aria-hidden />
                  <span className="text">{label}</span>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {generateError && (
        <div className="error_text_sec_rpr" role="alert">
          <span><InfoIcon size={14} /></span>
          <p className="general_reports_types_popup_error">{generateError}</p>
        </div>
      )}

      {alreadyGeneratedError && (
        <div className="error_text_sec_rpr" role="alert">
          <span><InfoIcon size={14} /></span>
          <p className="general_reports_types_popup_error">{alreadyGeneratedError}</p>
        </div>
      )}

      <div className="fields_for_button_actions orgBtns report_types_popup_actions">
        <Button
          type="button"
          className="orgCancelBtn"
          onClick={onClose}
        >
          <span><Ban size={16} /></span>
          Cancel
        </Button>
        {onGenerateReport && (
          <Button
            type="button"
            className="orgCreateBtn"
            onClick={handleGenerateReport}
          >
            <span><FileText size={16} /></span>
            Generate Report
          </Button>
        )}
      </div>
    </>
  );
}

export default GeneralReportsTypesPopup;
