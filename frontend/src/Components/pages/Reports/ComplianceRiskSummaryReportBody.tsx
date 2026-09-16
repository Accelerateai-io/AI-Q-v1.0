import { FileCheck, Gavel, ListOrdered, Scale, ShieldAlert } from "lucide-react";
import { formatFrameworkMappingFrameworkForDisplay } from "../../../utils/frameworkMappingFrameworkDisplay";
import { ensureSpaceAfterColon } from "../../../utils/summarizeRiskPoints";
import "../Assessments/BuyerAssessment/buyer_vendor_risk_report.css";

export type CrsPayload = {
  version?: number;
  generatedAt?: string;
  assessmentId?: string;
  vendorName?: string;
  productName?: string;
  executiveRiskSummary?: {
    inherentRag?: string;
    residualRag?: string;
    summary?: string;
  };
  topRisks?: Array<{
    rank: number;
    title: string;
    likelihood: number;
    impact: number;
    lxi: number;
    drivers: string[];
  }>;
  complianceMapping?: Array<{
    framework: string;
    requirement: string;
    vendorControlOrEvidence: string;
  }>;
  vendorValidationNotes?: string;
  methodologyEvidenceTrail?: string;
};

export function parseComplianceRiskSummaryJson(
  raw: string | Record<string, unknown> | undefined | null,
): CrsPayload | null {
  if (raw == null) return null;
  let j: CrsPayload | null = null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    j = raw as CrsPayload;
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    try {
      j = JSON.parse(s) as CrsPayload;
    } catch {
      return null;
    }
  } else {
    return null;
  }
  if (!j || typeof j !== "object") return null;
  if (!j.executiveRiskSummary && !j.topRisks?.length) return null;
  return j;
}

function riskLevelFromRag(level: string): { label: string; cls: string } {
  const n = (level ?? "").trim().toLowerCase();
  if (n === "red" || n === "high" || n === "critical") {
    return { label: "High", cls: "crs_rag_red" };
  }
  if (n === "green" || n === "low") {
    return { label: "Low", cls: "crs_rag_green" };
  }
  if (n === "amber" || n === "yellow" || n === "medium" || n === "moderate") {
    return { label: "Medium", cls: "crs_rag_amber" };
  }
  return { label: level.trim() || "—", cls: "crs_rag_amber" };
}

function RagBadge({ level }: { level: string }) {
  const { label, cls } = riskLevelFromRag(level);
  return <span className={`crs_rag_badge ${cls}`}>{label}</span>;
}

function toPoints(text: string): string[] {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return [];
  const byLine = t
    .split(/\n+/)
    .map((line) =>
      ensureSpaceAfterColon(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim()),
    )
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  const sentences = t
    .split(/(?<=[.!?])\s+(?=[A-Z“"'(0-9])/)
    .map((s) => ensureSpaceAfterColon(s.trim()))
    .filter(Boolean);
  return sentences.length > 0 ? sentences : [ensureSpaceAfterColon(t)];
}

function PointsList({ text, empty }: { text: string; empty: string }) {
  const items = toPoints(text);
  if (items.length === 0) {
    return <p className="bvr_reco_intro">{empty}</p>;
  }
  return (
    <ul className="ira_gap_list crs_notes_list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function ComplianceRiskSummaryReportBody({ data }: { data: CrsPayload }) {
  const exec = data.executiveRiskSummary ?? {};
  const topRisks = Array.isArray(data.topRisks) ? data.topRisks : [];
  const mapping = Array.isArray(data.complianceMapping) ? data.complianceMapping : [];
  const validationNotes = data.vendorValidationNotes ?? "";
  const methodology = data.methodologyEvidenceTrail ?? "";

  return (
    <div className="report_vcm_wrap crs_wrap">
      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <Scale className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Executive risk summary</span>
        </h2>
        <div className="crs_rag_grid" role="group" aria-label="Risk assessment grades">
          <div className="crs_rag_tile">
            <span className="crs_rag_label">Inherent</span>
            <RagBadge level={exec.inherentRag ?? ""} />
          </div>
          <div className="crs_rag_tile">
            <span className="crs_rag_label">Residual</span>
            <RagBadge level={exec.residualRag ?? ""} />
          </div>
        </div>
        <p className="bvr_exec_text crs_body_text">{exec.summary?.trim() ? exec.summary : "—"}</p>
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <ListOrdered className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Top risks list</span>
        </h2>
        {topRisks.length > 0 ? (
          <div className="crs_risk_list" role="table" aria-label="Top risks">
            <div className="crs_risk_header" role="row">
              <span className="crs_risk_col_rank" role="columnheader">Rank</span>
              <span className="crs_risk_col_title" role="columnheader">Risk</span>
              <span className="crs_risk_col_metric" role="columnheader">L</span>
              <span className="crs_risk_col_metric" role="columnheader">I</span>
              <span className="crs_risk_col_metric" role="columnheader">L×I</span>
              <span className="crs_risk_col_drivers" role="columnheader">Drivers</span>
            </div>
            {topRisks.map((r, i) => {
              const drivers = Array.isArray(r.drivers) ? r.drivers.filter(Boolean) : [];
              return (
                <div key={i} className="crs_risk_item" role="row">
                  <span className="crs_risk_col_rank crs_risk_rank" role="cell">
                    {r.rank ?? i + 1}
                  </span>
                  <h3 className="crs_risk_col_title crs_risk_title" role="cell">
                    {r.title ?? "—"}
                  </h3>
                  <span className="crs_risk_col_metric" data-metric="L" role="cell">
                    {r.likelihood ?? "—"}
                  </span>
                  <span className="crs_risk_col_metric" data-metric="I" role="cell">
                    {r.impact ?? "—"}
                  </span>
                  <span className="crs_risk_col_metric" data-metric="L×I" role="cell">
                    {r.lxi ?? "—"}
                  </span>
                  <div className="crs_risk_col_drivers" role="cell">
                    {drivers.length > 0 ? (
                      <ul className="crs_drivers_list">
                        {drivers.map((d, di) => (
                          <li key={di}>{ensureSpaceAfterColon(d)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="crs_drivers_empty">No drivers listed.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="bvr_reco_intro">No ranked risks in this report.</p>
        )}
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <FileCheck className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Compliance mapping</span>
        </h2>
        {mapping.length > 0 ? (
          <div className="crs_table_wrap">
            <table className="bvr_matrix_table crs_mapping_table">
              <thead>
                <tr>
                  <th scope="col">Framework</th>
                  <th scope="col">Requirement</th>
                  <th scope="col">Vendor control / evidence</th>
                </tr>
              </thead>
              <tbody>
                {mapping.map((row, i) => (
                  <tr key={i}>
                    <td>{formatFrameworkMappingFrameworkForDisplay(row.framework)}</td>
                    <td>{row.requirement ?? "—"}</td>
                    <td>{row.vendorControlOrEvidence ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="bvr_reco_intro">No compliance mapping rows.</p>
        )}
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <ShieldAlert className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Vendor validation notes</span>
        </h2>
        <PointsList
          text={validationNotes}
          empty="No buyer validation notes were captured for this assessment."
        />
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <Gavel className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Methodology &amp; evidence trail</span>
        </h2>
        <PointsList text={methodology} empty="—" />
      </section>
    </div>
  );
}
