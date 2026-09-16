import { Calendar, ChevronRight, Download, FileText } from "lucide-react";
import React from "react";
import type { GeneratedReportItem } from "./GeneralReports";
import { getReportTypeAccent, getReportTypeDisplayLabel, getReportTypeIcon } from "./reportTypes";
import {
  isReportTimeExpired,
  reportArchivedStatusText,
} from "../../../utils/reportArchiveStatusLabel";
import "../UserManagement/user_management.css";
import "../Assessments/assessments.css";
import "../VendorDirectory/VendorDirectory.css";
import "../Dashboard/dashboard.css";
import "./general_reports.css";

interface GeneralReportsCardsProps {
  reports: GeneratedReportItem[];
  onViewReport: (report: GeneratedReportItem) => void;
  onDownload?: (report: GeneratedReportItem) => void;
  /** When true, View Report stays enabled for archived items (Archived tab). */
  viewEnabledWhenArchived?: boolean;
  /** When true, render only the card(s) in a fragment (no wrapper div) for use inside a parent grid. */
  singleCard?: boolean;
}

/** Expiry: 1 year from generated date, or use API expiry when available. */
function getExpiryDate(report: GeneratedReportItem): string {
  const expiryAt = report.expiryAt ?? report.attestationExpiryAt;
  if (expiryAt != null && String(expiryAt).trim() !== "") {
    try {
      const d = new Date(expiryAt);
      if (!Number.isNaN(d.getTime())) {
        return d
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .replace(/\s+/g, "-");
      }
    } catch {
      // fall through to generatedAt + 1 year
    }
  }
  try {
    const d = new Date(report.generatedAt);
    if (Number.isNaN(d.getTime())) return "—";
    d.setFullYear(d.getFullYear() + 1);
    return d
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/\s+/g, "-");
  } catch {
    return "—";
  }
}

/** Report is archived when assessment is user-archived, or assessment/attestation expiry is in the past. */
function isReportArchived(report: GeneratedReportItem): boolean {
  if (
    report.assessmentUserArchivedAt != null &&
    String(report.assessmentUserArchivedAt).trim() !== ""
  ) {
    return true;
  }
  const expiryAt = report.expiryAt;
  const attestationExpiryAt = report.attestationExpiryAt;
  const isAssessmentExpired =
    expiryAt != null &&
    String(expiryAt).trim() !== "" &&
    !Number.isNaN(new Date(expiryAt).getTime()) &&
    new Date(expiryAt).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  const isAttestationExpired =
    attestationExpiryAt != null &&
    String(attestationExpiryAt).trim() !== "" &&
    !Number.isNaN(new Date(attestationExpiryAt).getTime()) &&
    new Date(attestationExpiryAt).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  return isAssessmentExpired || isAttestationExpired;
}

function GeneralReportsCards({
  reports,
  onViewReport,
  onDownload,
  viewEnabledWhenArchived = false,
  singleCard = false,
}: GeneralReportsCardsProps) {
  const cards = reports.map((report) => {
    const archived = isReportArchived(report);
    const isExpiredStatus = archived && isReportTimeExpired(report);
    const TypeIcon = getReportTypeIcon(report.reportType);
    const typeLabel = getReportTypeDisplayLabel(report.reportType);

    return (
      <article
        key={report.id}
        className={`vendor_directory_card general_rpr_card complete_rpr_card_design analysis_rpr_card${
          archived ? " general_rpr_card_archived" : ""
        }`}
        data-accent={getReportTypeAccent(report.reportType) ?? undefined}
      >
        <div className="general_report_card_header complete_rpr_card_top">
          {archived ? (
            isExpiredStatus ? (
              <span className="pill pill_status pill_status_inactive pill_status_with_dot">
                <span className="pill_status_dot" aria-hidden />
                Expired
              </span>
            ) : (
              <span className="assessments_vd_badge assessments_vd_badge--archived">
                Archived
              </span>
            )
          ) : (
            <span className="analysis_rpr_card_header_spacer" aria-hidden />
          )}
          <div className="complete_rpr_card_header_actions">
            <span className="complete_rpr_card_header_doc_icon" aria-hidden>
              <FileText size={18} />
            </span>
            {onDownload && !archived && (
              <span className="general_rpr_card_download_wrap">
                <button
                  type="button"
                  className="general_rpr_card_download_btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(report);
                  }}
                  aria-label={`Download ${typeLabel}`}
                >
                  <Download size={14} aria-hidden />
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="general_rpr_title complete_rpr_card_title_block">
          <div className="vendor_directory_card_header_text complete_rpr_card_title_model_group">
            <span className="general_rpr_card_title_wrap">
              <h2 className="vendor_directory_card_name general_rpr_card_title_clamp">
                {report.assessmentLabel}
              </h2>
            </span>
            <span className="analysis_rpr_card_type">
              <TypeIcon size={14} className="analysis_rpr_card_type_icon" aria-hidden />
              {typeLabel}
            </span>
          </div>
        </div>

        <div className="analysis_rpr_card_spacer" aria-hidden />

        <div className="general_rpr_card_footer complete_rpr_card_footer">
          <div className="general_rpr_card_dates complete_rpr_card_expiry_col">
            {archived ? (
              <span
                className={
                  isReportTimeExpired(report)
                    ? "general_rpr_card_status general_rpr_card_status_expired"
                    : "general_rpr_card_status general_rpr_card_status_archived"
                }
              >
                {reportArchivedStatusText(report)}
              </span>
            ) : (
              <>
                <span className="complete_rpr_card_expiry_label">
                  <Calendar
                    size={14}
                    className="complete_rpr_card_expiry_icon"
                    aria-hidden
                  />
                  Expires on
                </span>
                <span className="complete_rpr_card_expiry_value">{getExpiryDate(report)}</span>
              </>
            )}
          </div>
          <button
            type="button"
            className="dash_view_all_btn complete_rpr_card_view_btn"
            onClick={() => onViewReport(report)}
            aria-label={`View report: ${typeLabel}`}
            disabled={archived && !viewEnabledWhenArchived}
          >
            View Report
            <ChevronRight size={15} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </article>
    );
  });

  if (singleCard) return <>{cards}</>;
  return (
    <div className="general_rpr_cards_sec vendor_directory_grid complete_rpr_cards_grid">
      {cards}
    </div>
  );
}

export default GeneralReportsCards;
