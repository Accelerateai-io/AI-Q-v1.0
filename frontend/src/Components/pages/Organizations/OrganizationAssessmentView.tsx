/**
 * Full-page assessment details when viewing from Organizations (view action → Assessments tab → View).
 * Shows breadcrumbs, assessment content, and report cards for this assessment.
 */
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import Breadcrumbs from "../../UI/Breadcrumbs";
import AssessmentPreviewModalContent from "../Assessments/AssessmentPreviewModalContent";
import LoadingMessage from "../../UI/LoadingMessage";
import { formatDateDDMMMYYYY } from "../../../utils/formatDate.js";
import CompleteReportsCards from "../Reports/CompleteReportsCards";
import GeneralReportsCards from "../Reports/GeneralReportsCards";
import type { CustomerRiskReportItem } from "../Reports/Reports";
import type { GeneratedReportItem } from "../Reports/GeneralReports";
import "../UserManagement/user_management.css";
import "../Assessments/assessments.css";
import "../VendorAttestationDetails/vendor_attestation_details.css";
import "../VendorDirectory/VendorDirectory.css";
import "../Dashboard/dashboard.css";
import "../Reports/general_reports.css";
import "../Reports/reports.css";
import {
  OrgPortalFrameworkGapSectionVendor,
  OrgPortalFrameworkGapSectionBuyer,
  type VendorOrganizationalPortal,
  type BuyerOrganizationalPortal,
} from "./OrgPortalFrameworkGapSection";

const BASE_URL = import.meta.env.VITE_BASE_URL || "";

interface GeneralReportItem {
  id: string;
  assessmentId: string;
  reportType: string;
  generatedAt?: string;
  assessmentLabel?: string;
  expiryAt?: string | null;
  attestationExpiryAt?: string | null;
}

function getReportCardTitle(fullTitle: string): string {
  if (!fullTitle || typeof fullTitle !== "string") return fullTitle || "—";
  return fullTitle.replace(/^Analysis Report:\s*/i, "").trim() || fullTitle;
}

function isCompleteReportArchived(r: CustomerRiskReportItem): boolean {
  const expiryAt = r.expiryAt ?? r.attestationExpiryAt;
  if (expiryAt == null || String(expiryAt).trim() === "") return false;
  try {
    const d = new Date(expiryAt);
    if (Number.isNaN(d.getTime())) return false;
    return d.setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  } catch {
    return false;
  }
}

function getCompleteReportExpiry(r: CustomerRiskReportItem): string {
  const raw = r.expiryAt ?? r.attestationExpiryAt;
  if (raw == null || String(raw).trim() === "") return "—";
  return formatDateDDMMMYYYY(raw);
}

function mapBuyerVendorRiskListItem(r: Record<string, unknown>): CustomerRiskReportItem {
  const irsRaw = r.implementationRiskScore;
  const implementationRiskScore =
    irsRaw != null && Number.isFinite(Number(irsRaw)) ? Number(irsRaw) : null;
  const cls = r.implementationRiskClassification;
  const dec = r.implementationRiskDecision;
  const rep = r.report;
  return {
    id: String(r.id ?? ""),
    assessmentId: String(r.assessmentId ?? ""),
    title: String(r.title ?? "Vendor risk report"),
    createdAt: String(r.createdAt ?? ""),
    expiryAt: r.expiryAt != null ? String(r.expiryAt) : null,
    attestationExpiryAt: r.attestationExpiryAt != null ? String(r.attestationExpiryAt) : null,
    assessmentUserArchivedAt:
      r.assessmentUserArchivedAt != null ? String(r.assessmentUserArchivedAt) : null,
    source: "buyer_vendor_risk",
    implementationRiskScore,
    implementationRiskClassification:
      cls != null && String(cls).trim() !== "" ? String(cls).trim() : null,
    implementationRiskDecision:
      dec != null && String(dec).trim() !== "" ? String(dec).trim() : null,
    report: rep != null && typeof rep === "object" && !Array.isArray(rep)
      ? (rep as Record<string, unknown>)
      : undefined,
  };
}

function mapBuyerVendorRiskFromVendorReportApi(
  assessmentId: string,
  vrRes: Record<string, unknown>,
  previewRow: Record<string, unknown> | null,
): CustomerRiskReportItem | null {
  const rep = vrRes.report;
  if (rep == null || typeof rep !== "object" || Array.isArray(rep)) return null;
  const report = rep as Record<string, unknown>;
  const vendor = String(vrRes.vendorName ?? report.vendorName ?? "").trim() || "Vendor";
  const product = String(vrRes.productName ?? report.productName ?? "").trim() || "Product";
  const irsRaw = report.implementationRiskScore;
  const irs = irsRaw != null && Number.isFinite(Number(irsRaw)) ? Number(irsRaw) : null;
  return {
    id: `bvr-${assessmentId}`,
    assessmentId,
    title: `${vendor} – ${product}`,
    createdAt: String(
      previewRow?.updatedAt ?? previewRow?.createdAt ?? new Date().toISOString(),
    ),
    expiryAt: previewRow?.expiryAt != null ? String(previewRow.expiryAt) : null,
    attestationExpiryAt: null,
    source: "buyer_vendor_risk",
    implementationRiskScore: irs,
    implementationRiskClassification:
      report.implementationRiskClassification != null
        ? String(report.implementationRiskClassification).trim()
        : null,
    implementationRiskDecision:
      report.implementationRiskDecision != null
        ? String(report.implementationRiskDecision).trim()
        : null,
    report,
  };
}

function OrganizationAssessmentView() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const systemRole = (sessionStorage.getItem("systemRole") ?? "").toLowerCase().trim();
  const isSystemAdmin =
    systemRole === "system admin" || systemRole === "system_admin";
  const state = location.state as {
    organizationName?: string;
    organizationId?: string;
    type?: string;
    row?: Record<string, unknown>;
  } | null;

  const typeParam = searchParams.get("type") ?? state?.type ?? "";
  const type = (typeParam || "").toLowerCase().trim();

  const [previewRow, setPreviewRow] = useState<Record<string, unknown> | null>(state?.row ?? null);
  const [vendorDetail, setVendorDetail] = useState<Record<string, unknown> | null>(null);
  const [buyerDetail, setBuyerDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!state?.row);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState(state?.organizationName ?? "Organization");
  const [organizationId, setOrganizationId] = useState<string | null>(state?.organizationId ?? null);
  const [completeReports, setCompleteReports] = useState<CustomerRiskReportItem[]>([]);
  const [generalReports, setGeneralReports] = useState<GeneralReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    if (!assessmentId || !type) {
      setLoading(false);
      if (!assessmentId) setError("Assessment ID missing.");
      else if (!type) setError("Assessment type missing.");
      return;
    }

    const token = sessionStorage.getItem("bearerToken");
    if (!token) {
      setLoading(false);
      setError("Please log in to view this assessment.");
      return;
    }

    const isVendor = type === "cots_vendor";

    if (state?.row) {
      setPreviewRow(state.row);
      setOrganizationName(state.organizationName ?? "Organization");
      setOrganizationId(state.organizationId ?? null);
      if (isVendor) {
        setVendorDetail(null);
        setLoading(true);
        fetch(`${BASE_URL.replace(/\/$/, "")}/vendorCotsAssessment/${encodeURIComponent(assessmentId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((result) => {
            if (result?.success && result?.data) setVendorDetail(result.data);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setBuyerDetail(null);
        setLoading(true);
        fetch(`${BASE_URL.replace(/\/$/, "")}/buyerCotsAssessment/${encodeURIComponent(assessmentId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((result) => {
            if (result?.success && result?.data) {
              const data = result.data as Record<string, unknown>;
              setBuyerDetail(data);
              setPreviewRow({
                ...(state.row as Record<string, unknown>),
                ...data,
              });
              if (data.organizationName != null) {
                setOrganizationName(String(data.organizationName));
              }
              if (data.organizationId != null) {
                setOrganizationId(String(data.organizationId));
              }
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }
      return;
    }

    setLoading(true);
    setError(null);
    const url = isVendor
      ? `${BASE_URL.replace(/\/$/, "")}/vendorCotsAssessment/${encodeURIComponent(assessmentId)}`
      : `${BASE_URL.replace(/\/$/, "")}/buyerCotsAssessment/${encodeURIComponent(assessmentId)}`;

    fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (!result?.success || !result?.data) {
          setError("Assessment not found.");
          setPreviewRow(null);
          return;
        }
        const data = result.data as Record<string, unknown>;
        const row: Record<string, unknown> = {
          assessmentId: data.assessmentId,
          type: data.type ?? (isVendor ? "cots_vendor" : "cots_buyer"),
          status: data.status,
          organizationId: data.organizationId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          expiryAt: data.expiryAt,
          ...data,
        };
        setPreviewRow(row);
        if (data.organizationId != null) {
          setOrganizationId(String(data.organizationId));
        }
        if (isVendor) {
          setVendorDetail(data);
          setBuyerDetail(null);
        } else {
          setBuyerDetail(data);
          setVendorDetail(null);
        }
        if (!isVendor && data.organizationName) {
          setOrganizationName(String(data.organizationName));
        }
      })
      .catch(() => {
        setError("Failed to load assessment.");
        setPreviewRow(null);
      })
      .finally(() => setLoading(false));
  }, [assessmentId, type, state?.row, state?.organizationName]);

  // Fetch report cards for this assessment (Complete + General reports)
  useEffect(() => {
    const assessmentType = (previewRow?.type as string | undefined)?.toLowerCase().trim();
    if (
      !assessmentId ||
      !previewRow ||
      (assessmentType !== "cots_vendor" && assessmentType !== "cots_buyer")
    ) {
      setCompleteReports([]);
      setGeneralReports([]);
      return;
    }
    const token = sessionStorage.getItem("bearerToken");
    if (!token) return;

    setReportsLoading(true);
    const base = BASE_URL.replace(/\/$/, "");
    const orgId =
      organizationId ??
      (previewRow.organizationId != null ? String(previewRow.organizationId).trim() : "");
    const orgQuery = orgId ? `organizationId=${encodeURIComponent(orgId)}` : "";

    const generalUrl = `${base}/generalReports?assessmentId=${encodeURIComponent(assessmentId)}`;

    if (assessmentType === "cots_vendor") {
      Promise.all([
        fetch(`${base}/customerRiskReports?assessmentId=${encodeURIComponent(assessmentId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((res) => res.json()),
        fetch(generalUrl, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.json()),
      ])
        .then(([custRes, genRes]) => {
          if (custRes?.success && Array.isArray(custRes?.data?.reports)) {
            const fallbackSrs =
              previewRow?.reportRiskScore != null &&
              Number.isFinite(Number(previewRow.reportRiskScore))
                ? Number(previewRow.reportRiskScore)
                : null;
            setCompleteReports(
              custRes.data.reports.map((r: CustomerRiskReportItem) => ({
                ...r,
                source: "customer" as const,
                overallRiskScore:
                  r.overallRiskScore != null && Number.isFinite(Number(r.overallRiskScore))
                    ? Number(r.overallRiskScore)
                    : fallbackSrs,
              })),
            );
          } else {
            setCompleteReports([]);
          }
          if (genRes?.success && Array.isArray(genRes?.data?.reports)) {
            setGeneralReports(genRes.data.reports);
          } else {
            setGeneralReports([]);
          }
        })
        .catch(() => {
          setCompleteReports([]);
          setGeneralReports([]);
        })
        .finally(() => setReportsLoading(false));
      return;
    }

    const bvrParams = new URLSearchParams({ assessmentId });
    if (orgQuery) {
      const orgIdVal = orgQuery.split("=")[1];
      if (orgIdVal) bvrParams.set("organizationId", decodeURIComponent(orgIdVal));
    }
    Promise.all([
      fetch(`${base}/buyerVendorRiskReports?${bvrParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(generalUrl, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.json()),
      fetch(`${base}/buyerCotsAssessment/${encodeURIComponent(assessmentId)}/vendor-risk-report`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([bvrRes, genRes, vrRes]) => {
        let complete: CustomerRiskReportItem[] = [];
        if (bvrRes?.success && Array.isArray(bvrRes?.data?.reports) && bvrRes.data.reports.length > 0) {
          complete = bvrRes.data.reports.map((r: Record<string, unknown>) =>
            mapBuyerVendorRiskListItem(r),
          );
        } else if (vrRes?.success && vrRes?.report != null) {
          const mapped = mapBuyerVendorRiskFromVendorReportApi(
            assessmentId,
            vrRes as Record<string, unknown>,
            previewRow,
          );
          if (mapped) complete = [mapped];
        }
        setCompleteReports(complete);
        if (genRes?.success && Array.isArray(genRes?.data?.reports)) {
          setGeneralReports(genRes.data.reports);
        } else {
          setGeneralReports([]);
        }
      })
      .catch(() => {
        setCompleteReports([]);
        setGeneralReports([]);
      })
      .finally(() => setReportsLoading(false));
  }, [assessmentId, previewRow?.type, previewRow?.organizationId, organizationId]);

  const handleOrgClick = () => {
    if (organizationId) {
      navigate("/organizations", {
        state: {
          openOrganization: {
            id: organizationId,
            organizationId,
            organizationName,
          },
        },
      });
    }
  };

  const breadcrumbItems = [
    { label: "Organizations", path: "/organizations" },
    organizationId
      ? { label: organizationName, onClick: handleOrgClick }
      : organizationName,
    "Assessment details",
  ];

  if (error) {
    return (
      <div className="sec_user_page org_settings_page" style={{ padding: "1.5rem 1rem 0 0" }}>
        <Breadcrumbs items={breadcrumbItems} />
        <p role="alert" style={{ marginTop: "1rem", color: "var(--color-error, #dc2626)" }}>
          {error}
        </p>
        <button
          type="button"
          className="product_profile_btn_view_attestation"
          onClick={() => navigate("/organizations")}
          style={{ marginTop: "1rem" }}
        >
          Back to Organizations
        </button>
      </div>
    );
  }

  if (loading && !previewRow) {
    return (
      <div className="sec_user_page org_settings_page" style={{ padding: "1.5rem 1rem 0 0" }}>
        <Breadcrumbs items={breadcrumbItems} />
        <LoadingMessage message="Loading assessment…" />
      </div>
    );
  }

  if (!previewRow) {
    return null;
  }

  const assessmentType = (previewRow.type as string | undefined)?.toLowerCase().trim() ?? "";
  const isVendorAssessment = assessmentType === "cots_vendor";
  const isBuyerAssessment = assessmentType === "cots_buyer";
  const showReportsSection = isVendorAssessment || isBuyerAssessment;

  const handleViewCompleteReport = (report: CustomerRiskReportItem) => {
    if (report.source === "buyer_vendor_risk" && report.assessmentId) {
      navigate(`/buyer-vendor-risk-report/${encodeURIComponent(report.assessmentId)}`);
      return;
    }
    navigate(`/reports/${report.id}`, {
      state: { reportTitle: getReportCardTitle(report.title ?? "") },
    });
  };

  const handleDownloadCompleteReport = (
    report: CustomerRiskReportItem,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const reportTitle = getReportCardTitle(report.title ?? "");
    if (report.source === "buyer_vendor_risk" && report.assessmentId) {
      navigate(`/buyer-vendor-risk-report/${encodeURIComponent(report.assessmentId)}`, {
        state: { autoExportPdf: true, reportTitle },
      });
      return;
    }
    navigate(`/reports/${encodeURIComponent(report.id)}`, {
      state: { autoExportPdf: true, reportTitle },
    });
  };

  return (
    <div className="sec_user_page org_settings_page product_profile_page" style={{ padding: "1.5rem 1rem 0 0" }}>
      <Breadcrumbs items={breadcrumbItems} />
      <div className="vendor_attestation_preview_modal_body" style={{ marginTop: "1.5rem", maxWidth: "900px" }}>
        <AssessmentPreviewModalContent
          previewRow={previewRow}
          vendorDetail={vendorDetail}
          vendorLoading={loading && isVendorAssessment}
          buyerDetail={buyerDetail}
          buyerLoading={loading && isBuyerAssessment}
          hideBuyerReadinessFormula={isSystemAdmin && isBuyerAssessment}
        />
      </div>

      {(previewRow.type as string)?.toLowerCase() === "cots_vendor" &&
        vendorDetail?.organizationalPortal != null &&
        typeof vendorDetail.organizationalPortal === "object" && (
          <OrgPortalFrameworkGapSectionVendor
            portal={vendorDetail.organizationalPortal as VendorOrganizationalPortal}
            frameworkMappingAssessmentLabel={
              typeof previewRow?.title === "string" && previewRow.title.trim()
                ? previewRow.title.trim()
                : typeof previewRow?.name === "string" && previewRow.name.trim()
                  ? previewRow.name.trim()
                  : undefined
            }
          />
        )}

      {isBuyerAssessment &&
        previewRow.organizationalPortal != null &&
        typeof previewRow.organizationalPortal === "object" && (
          <OrgPortalFrameworkGapSectionBuyer
            portal={previewRow.organizationalPortal as BuyerOrganizationalPortal}
          />
        )}

      {showReportsSection && (
        <section className="assessment_details_reports_section" style={{ marginTop: "2rem", maxWidth: "900px" }}>
          <h2 className="assessment_details_reports_heading" style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Reports
          </h2>
          {reportsLoading ? (
            <LoadingMessage message="Loading reports…" />
          ) : completeReports.length === 0 && generalReports.length === 0 ? (
            <p className="assessment_details_no_reports">
              No reports have been generated for this assessment yet.
            </p>
          ) : (
            <div className="general_rpr_cards_sec vendor_directory_grid complete_rpr_cards_grid">
              <CompleteReportsCards
                reports={completeReports}
                getTitle={(r) => getReportCardTitle(r.title ?? "")}
                isArchived={isCompleteReportArchived}
                getExpiryDate={getCompleteReportExpiry}
                onViewReport={handleViewCompleteReport}
                onDownload={handleDownloadCompleteReport}
                singleCard
              />
              <GeneralReportsCards
                reports={generalReports.map(
                  (report): GeneratedReportItem => ({
                    id: report.id,
                    assessmentId: report.assessmentId,
                    assessmentLabel: report.assessmentLabel ?? `Report ${report.id}`,
                    reportType: report.reportType,
                    generatedAt: report.generatedAt ?? new Date().toISOString(),
                    expiryAt: report.expiryAt ?? null,
                    attestationExpiryAt: report.attestationExpiryAt ?? null,
                  }),
                )}
                onViewReport={(report) => navigate(`/reports/general/${report.id}`)}
                singleCard
                viewEnabledWhenArchived
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default OrganizationAssessmentView;
