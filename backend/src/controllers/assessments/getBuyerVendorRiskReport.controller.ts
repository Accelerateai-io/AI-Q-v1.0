import type { Request, Response } from "express";
import { db, pool } from "../../database/db.js";
import { usersTable } from "../../schema/schema.js";
import { assessments } from "../../schema/assessments/assessments.js";
import { cotsBuyerAssessments } from "../../schema/assessments/cotsBuyerAssessments.js";
import { and, eq } from "drizzle-orm";
import { expireSubmittedAssessmentsAndArchiveBuyerReports } from "../../services/expireAndArchiveCotsBuyerAssessments.js";
import { hasCotsBuyerArchivedReportColumn } from "../../services/cotsBuyerArchivedColumn.js";
import {
  enrichStoredBuyerVendorReport,
  regulatorySnippetFromJson,
} from "../agents/buyerVendorRiskReportAgent.js";
import { buildBuyerCotsFrameworkMappingRows } from "../../services/buyerCotsFrameworkMapping.js";
import { mergeLlmModelIntoReport } from "../../utils/activeLlmModelMeta.js";
import { findAttestationForBuyerVendorProduct } from "../../services/findAttestationForBuyerVendorProduct.js";
import { extractVendorTrustScore } from "../../services/buyerImplementationRiskScore.js";

/**
 * GET /buyerCotsAssessment/:id/vendor-risk-report
 * Returns stored Vendor Risk Assessment Report (generated on submit).
 */
const getBuyerVendorRiskReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const decoded = req.user as { id?: number } | undefined;
    const userId = decoded?.id;
    if (userId == null) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId))).limit(1);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const platformRole = String((user as Record<string, unknown>).user_platform_role ?? "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ");
    const isSystemUser =
      platformRole === "system admin" ||
      platformRole === "system manager" ||
      platformRole === "system viewer";
    const organizationId = String((user as Record<string, unknown>).organization_id ?? "").trim();
    const id = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!id || (!isSystemUser && !organizationId)) {
      res.status(400).json({ success: false, message: "Invalid assessment id" });
      return;
    }

    await expireSubmittedAssessmentsAndArchiveBuyerReports(pool);

    const whereBuyer = isSystemUser
      ? and(eq(cotsBuyerAssessments.assessment_id, id), eq(assessments.type, "cots_buyer"))
      : and(
          eq(cotsBuyerAssessments.assessment_id, id),
          eq(assessments.organization_id, organizationId),
          eq(assessments.type, "cots_buyer"),
        );

    const hasArchiveCol = await hasCotsBuyerArchivedReportColumn(pool);
    const [row] = hasArchiveCol
      ? await db
          .select({
            report: cotsBuyerAssessments.vendor_risk_assessment_report,
            archived_report: cotsBuyerAssessments.archived_vendor_risk_assessment_report,
            vendor_name: cotsBuyerAssessments.vendor_name,
            specific_product: cotsBuyerAssessments.specific_product,
            organization_name: cotsBuyerAssessments.organization_name,
            assessment_status: assessments.status,
            user_archived_at: assessments.user_archived_at,
            criticality: cotsBuyerAssessments.critical_of_ai_solution,
            risk_appetite: cotsBuyerAssessments.risk_appetite,
            data_sensitivity: cotsBuyerAssessments.data_sensitivity_level,
            governance_maturity: cotsBuyerAssessments.governance_maturity,
            target_timeline: cotsBuyerAssessments.target_timeline,
            regulatory_requirments: cotsBuyerAssessments.regulatory_requirments,
            llmModelId: cotsBuyerAssessments.llm_model_id,
            llmModelLabel: cotsBuyerAssessments.llm_model_label,
          })
          .from(cotsBuyerAssessments)
          .innerJoin(assessments, eq(cotsBuyerAssessments.assessment_id, assessments.id))
          .where(whereBuyer)
          .limit(1)
      : await db
          .select({
            report: cotsBuyerAssessments.vendor_risk_assessment_report,
            vendor_name: cotsBuyerAssessments.vendor_name,
            specific_product: cotsBuyerAssessments.specific_product,
            organization_name: cotsBuyerAssessments.organization_name,
            assessment_status: assessments.status,
            user_archived_at: assessments.user_archived_at,
            criticality: cotsBuyerAssessments.critical_of_ai_solution,
            risk_appetite: cotsBuyerAssessments.risk_appetite,
            data_sensitivity: cotsBuyerAssessments.data_sensitivity_level,
            governance_maturity: cotsBuyerAssessments.governance_maturity,
            target_timeline: cotsBuyerAssessments.target_timeline,
            regulatory_requirments: cotsBuyerAssessments.regulatory_requirments,
            llmModelId: cotsBuyerAssessments.llm_model_id,
            llmModelLabel: cotsBuyerAssessments.llm_model_label,
          })
          .from(cotsBuyerAssessments)
          .innerJoin(assessments, eq(cotsBuyerAssessments.assessment_id, assessments.id))
          .where(whereBuyer)
          .limit(1);

    if (!row) {
      res.status(404).json({ success: false, message: "Assessment not found" });
      return;
    }

    const assessmentTimeExpired = String(row.assessment_status ?? "").toLowerCase() === "expired";
    const aRow = row as { user_archived_at?: Date | null };
    const assessmentUserArchived = aRow.user_archived_at != null;
    const reportArchivedForUi = assessmentTimeExpired || assessmentUserArchived;
    const rawReport =
      hasArchiveCol && assessmentTimeExpired
        ? (row as { archived_report?: unknown; report: unknown }).archived_report
        : row.report;
    const vendorName = row.vendor_name ?? "";
    const productName = row.specific_product ?? "";

    if (rawReport == null || typeof rawReport !== "object") {
      if (assessmentTimeExpired) {
        res.status(200).json({
          success: true,
          pending: false,
          archived: true,
          assessmentUserArchived,
          assessmentTimeExpired: true,
          reportUnavailable: true,
          message:
            "This assessment has expired. No vendor comparison report was archived (none was stored before expiry).",
          vendorName,
          productName,
          organizationName: row.organization_name ?? "",
        });
        return;
      }
      res.status(200).json({
        success: true,
        pending: true,
        archived: assessmentUserArchived,
        assessmentUserArchived,
        assessmentTimeExpired: false,
        reportUnavailable: false,
        message: "Report is still being generated or was not available. Refresh shortly.",
        vendorName,
        productName,
        organizationName: row.organization_name ?? "",
      });
      return;
    }

    const reportObj = rawReport as Record<string, unknown>;
    const llmModelId =
      typeof (row as { llmModelId?: string | null }).llmModelId === "string"
        ? String((row as { llmModelId?: string | null }).llmModelId).trim()
        : "";
    const llmModelLabel =
      typeof (row as { llmModelLabel?: string | null }).llmModelLabel === "string"
        ? String((row as { llmModelLabel?: string | null }).llmModelLabel).trim()
        : "";
    // Use the same product-profile VTS the Product Profile page displays.
    let productProfileVts: number | null = null;
    try {
      const attestation = await findAttestationForBuyerVendorProduct(vendorName, productName);
      if (attestation) {
        productProfileVts = extractVendorTrustScore(attestation);
      }
    } catch (e) {
      console.error("getBuyerVendorRiskReport: product-profile VTS lookup failed:", e);
    }
    const enriched = mergeLlmModelIntoReport(
      enrichStoredBuyerVendorReport(
        reportObj,
        vendorName,
        productName,
        {
          criticality: row.criticality,
          riskAppetite: row.risk_appetite,
          dataSensitivity: row.data_sensitivity,
          governanceMaturity: row.governance_maturity,
          targetTimeline: row.target_timeline,
          regulatorySnippet: regulatorySnippetFromJson(row.regulatory_requirments),
        },
        productProfileVts,
      ) as Record<string, unknown>,
      llmModelId || null,
      llmModelLabel || null,
    );
    const frameworkMappingRows = buildBuyerCotsFrameworkMappingRows(
      reportObj,
      row.regulatory_requirments,
    );

    res.status(200).json({
      success: true,
      pending: false,
      archived: reportArchivedForUi,
      assessmentTimeExpired,
      assessmentUserArchived,
      vendorName,
      productName,
      organizationName: row.organization_name ?? "",
      report: enriched,
      llmModelId: llmModelId || null,
      llmModelLabel: llmModelLabel || null,
      frameworkMappingRows,
    });
  } catch (e) {
    console.error("getBuyerVendorRiskReport:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getBuyerVendorRiskReport;
