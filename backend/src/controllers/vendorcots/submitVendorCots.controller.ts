import type { Request, Response } from "express";
import { db, pool } from "../../database/db.js";
import { isScoringUnavailableError } from "../../utils/scoringUnavailable.js";
import { hasReportStatusColumn } from "../../services/reportStatusColumn.js";
import { assessmentUserArchiveLog } from "../../schema/assessments/assessmentUserArchiveLog.js";
import { usersTable } from "../../schema/schema.js";
import { assessments } from "../../schema/assessments/assessments.js";
import { cotsVendorAssessments } from "../../schema/assessments/cotsVendorAssessments.js";
import { customerRiskAssessmentReports } from "../../schema/assessments/customerRiskAssessmentReports.js";
import { vendorSelfAttestations } from "../../schema/assessments/vendorSelfAttestations.js";
import { eq, and, or } from "drizzle-orm";
import { generateVendorCotsReport } from "../agents/vendorCotsReportAgent.js";
import {
  scoreCotsVendorWithPython,
} from "../../services/pythonScoringClient.js";
import { buildVendorCotsPayload } from "../../utils/buildVendorCotsPayload.js";
import {
  getTop5RisksWithMitigations,
  type Top5RisksWithMitigations,
} from "../../services/getTop5RisksFromAssessmentContext.js";
import { stampActiveLlmModel, getActiveLlmModelMeta } from "../../utils/activeLlmModelMeta.js";
import {
  assertFeatureTokenQuota,
  isTokenQuotaExceededError,
  sendIfTokenQuotaExceeded,
} from "../../services/admin/featureTokenQuota.service.js";
import {
  getRequestActor,
  runWithRequestActor,
} from "../../utils/requestActorContext.js";

/** Persisted under fullReport.appendix: catalog rows used to generate the assessment. */
function appendixCatalogRisksAndMitigations(
  top5: Top5RisksWithMitigations | null,
): Array<{
  risk_id: string;
  risk_domain?: string;
  risk_title?: string;
  mitigation_action_names: string[];
}> | undefined {
  if (!top5?.top5Risks?.length) return undefined;
  const items: Array<{
    risk_id: string;
    risk_domain?: string;
    risk_title?: string;
    mitigation_action_names: string[];
  }> = [];
  for (const r of top5.top5Risks) {
    const rid = String(r.risk_id ?? "").trim();
    if (!rid) continue;
    const mids = top5.mitigationsByRiskId[rid] ?? [];
    const names = [
      ...new Set(
        mids
          .map((m) => String(m.mitigation_action_name ?? "").trim())
          .filter(Boolean),
      ),
    ];
    const riskDomain = String(r.domains ?? "").trim();
    const riskTitle = String(r.risk_title ?? "").trim();
    items.push({
      risk_id: rid,
      ...(riskDomain ? { risk_domain: riskDomain } : {}),
      ...(riskTitle ? { risk_title: riskTitle } : {}),
      mitigation_action_names: names,
    });
  }
  return items.length ? items : undefined;
}
/** Persisted under fullReport.appendix: flat rows for report appendix table (risk id, domain, mitigation id + name). */
function appendixRiskMitigationActions(
  top5: Top5RisksWithMitigations | null,
): Array<{
  risk_id: string;
  risk_domain?: string;
  risk_title?: string;
  mitigation_action_id: string;
  mitigation_action_name: string;
}> | undefined {
  if (!top5?.top5Risks?.length) return undefined;
  const items: Array<{
    risk_id: string;
    risk_domain?: string;
    risk_title?: string;
    mitigation_action_id: string;
    mitigation_action_name: string;
  }> = [];
  for (const r of top5.top5Risks) {
    const rid = String(r.risk_id ?? "").trim();
    if (!rid) continue;
    const riskDomain = String(r.domains ?? "").trim();
    const riskTitle = String(r.risk_title ?? "").trim();
    const mids = top5.mitigationsByRiskId[rid] ?? [];
    for (const m of mids) {
      const name = String(m.mitigation_action_name ?? "").trim();
      if (!name) continue;
      const mid = String(m.mitigation_action_id ?? "").trim();
      items.push({
        risk_id: rid,
        ...(riskDomain ? { risk_domain: riskDomain } : {}),
        ...(riskTitle ? { risk_title: riskTitle } : {}),
        mitigation_action_id: mid,
        mitigation_action_name: name,
      });
    }
  }
  return items.length ? items : undefined;
}
import { calculateRoiFromAssessment } from "../../services/roiCalculator.js";
import {
  resolveFrameworkMappingRowsForAttestation,
  countSubstantiveFrameworkMappingRows,
  vendorCotsFrameworkMappingRowsFromAttestation,
} from "../../services/frameworkMappingFromCompliance.js";
import { narrowVendorCotsFrameworkRowsToAiDomainControls } from "../../services/vendorCotsAttestationFrameworkControls.js";
import { mergeVendorCotsAttestationRowsWithRegulatoryGaps } from "../../services/vendorCotsFrameworkMappingGenerator.js";

/** Fixed appendix text for all reports; only reviewedBy is set from the user who submitted. */
const APPENDIX_METHODOLOGY = "AI-Q 3-Layer Risk Assessment Framework v2.1 — Customer-Specific Analysis";
const APPENDIX_PREPARED_BY = "AI-Q Platform — Automated Analysis Report Engine";
const APPENDIX_CONFIDENTIALITY = "Confidential — For internal sales team use only";

/** POST /vendorCotsAssessment - submit: create or update assessment. Save draft = status "draft", Submit = status "submitted" (DB enum has draft/submitted). */
async function createCustomerRiskReport(
  assessmentId: string,
  orgIdStr: string,
  payloadCots: Record<string, unknown>,
  reviewedByUser: string,
): Promise<void> {
  const reportStarted = Date.now();
  const vendorAttestationId = payloadCots.vendor_attestation_id != null ? String(payloadCots.vendor_attestation_id).trim() : null;
  let productName = "";
  let attestationFrameworkSource: Record<string, unknown> | null = null;
  if (vendorAttestationId) {
    const [row] = await db
      .select({
        product_name: vendorSelfAttestations.product_name,
        compliance_document_expiries: vendorSelfAttestations.compliance_document_expiries,
        framework_mapping_rows: vendorSelfAttestations.framework_mapping_rows,
      })
      .from(vendorSelfAttestations)
      .where(
        or(
          eq(vendorSelfAttestations.id, vendorAttestationId),
          eq(vendorSelfAttestations.vendor_self_attestation_id, vendorAttestationId),
        ),
      )
      .limit(1);
    productName = (row?.product_name ?? "").trim() || "Product";
    if (row) {
      attestationFrameworkSource = {
        framework_mapping_rows: row.framework_mapping_rows,
        compliance_document_expiries: row.compliance_document_expiries,
      };
    }
  } else {
    productName = "Product";
  }

  let frameworkRowsFromDocuments: ReturnType<typeof resolveFrameworkMappingRowsForAttestation> = [];
  let frameworkRowsForStoredReport: Array<{
    framework: string;
    coverage: string;
    controls: string;
    notes: string;
  }> = [];
  try {
    frameworkRowsFromDocuments = attestationFrameworkSource
      ? resolveFrameworkMappingRowsForAttestation(attestationFrameworkSource)
      : [];
    /** Type 2 (Vendor COTS): attestation frameworks + gap rows when regulatory selections lack attestation mapping; top 3 controls where applicable. */
    frameworkRowsForStoredReport = narrowVendorCotsFrameworkRowsToAiDomainControls(
      mergeVendorCotsAttestationRowsWithRegulatoryGaps(
        vendorCotsFrameworkMappingRowsFromAttestation(attestationFrameworkSource),
        payloadCots,
      ),
      payloadCots,
    ).map((r) => ({
      framework: r.framework,
      coverage: r.coverage,
      controls: r.controls,
      notes: r.notes,
    }));
  } catch (frameworkErr) {
    console.error(
      `[cots_vendor] framework mapping failed assessment=${assessmentId}; continuing to risk lookup and score:`,
      frameworkErr instanceof Error ? frameworkErr.message : frameworkErr,
    );
  }
  const substantiveAttestationFrameworkCount =
    countSubstantiveFrameworkMappingRows(frameworkRowsFromDocuments);
  const frameworkMappingAttestationStatus: "missing" | "incomplete" | "available" =
    !vendorAttestationId || !attestationFrameworkSource
      ? "missing"
      : substantiveAttestationFrameworkCount === 0
        ? "incomplete"
        : "available";
  const orgName = (payloadCots.customer_organization_name != null ? String(payloadCots.customer_organization_name).trim() : "") || "Organization";
  const title = `Analysis Report: ${orgName} - ${productName}`;
  const toJson = (v: unknown) =>
    v != null ? (Array.isArray(v) ? v : typeof v === "object" ? JSON.stringify(v) : String(v)) : "";
  const report: Record<string, unknown> = {
    assessmentId,
    status: "submitted",
    organizationId: orgIdStr,
    frameworkMappingAttestationStatus: frameworkMappingAttestationStatus,
    selectedProductId: vendorAttestationId ?? "",
    customerOrganizationName: payloadCots.customer_organization_name ?? "",
    customerSector: payloadCots.customer_sector ?? "",
    primaryPainPoint: payloadCots.primary_pain_point ?? "",
    expectedOutcomes: payloadCots.expected_outcomes ?? "",
    customerBudgetRange: payloadCots.customer_budget_range ?? "",
    implementationTimeline: payloadCots.implementation_timeline ?? "",
    productFeatures:
      payloadCots.product_features != null
        ? Array.isArray(payloadCots.product_features)
          ? payloadCots.product_features
          : toJson(payloadCots.product_features)
        : "",
    implementationApproach: payloadCots.implementation_approach ?? "",
    customizationLevel: payloadCots.customization_level ?? "",
    integrationComplexity: payloadCots.integration_complexity ?? "",
    regulatoryRequirements:
      payloadCots.regulatory_requirements != null
        ? Array.isArray(payloadCots.regulatory_requirements)
          ? payloadCots.regulatory_requirements
          : toJson(payloadCots.regulatory_requirements)
        : "",
    regulatoryRequirementsOther: payloadCots.regulatory_requirements_other ?? "",
    dataSensitivity: payloadCots.data_sensitivity ?? "",
    customerRiskTolerance: payloadCots.customer_risk_tolerance ?? "",
    alternativesConsidered: payloadCots.alternatives_considered ?? "",
    keyAdvantages: payloadCots.key_advantages ?? "",
    customerSpecificRisks:
      payloadCots.customer_specific_risks != null
        ? Array.isArray(payloadCots.customer_specific_risks)
          ? payloadCots.customer_specific_risks
          : toJson(payloadCots.customer_specific_risks)
        : "",
    customerSpecificRisksOther: payloadCots.customer_specific_risks_other ?? "",
    identifiedRisks: payloadCots.identified_risks ?? "",
    riskDomainScores: payloadCots.risk_domain_scores ?? "",
    contextualMultipliers: payloadCots.contextual_multipliers ?? "",
    riskMitigation: payloadCots.risk_mitigation ?? "",
  };

  // Form score and AIRI lookup are independent. Start both so a slow AIRI
  // download cannot delay the Python score, and the report still waits for both.
  console.log(
    `[cots_vendor] scoring assessment=${assessmentId} url=${process.env.PYTHON_SCORING_URL ?? "http://localhost:5004"}/assessment/cots-vendor/score`,
  );
  const [top5RisksWithMitigations, presetFormula] = await Promise.all([
    getTop5RisksWithMitigations(payloadCots).catch((err: unknown) => {
      console.error("getTop5RisksWithMitigations failed:", err);
      return null;
    }),
    scoreCotsVendorWithPython(payloadCots)
      .then((result) => {
        console.log(
          `[cots_vendor] scored assessment=${assessmentId} srs=${result.sales_risk_score}`,
        );
        return result;
      })
      .catch((scoreErr: unknown) => {
        console.error(
          `[cots_vendor] score request failed assessment=${assessmentId}:`,
          scoreErr instanceof Error ? scoreErr.message : scoreErr,
        );
        return null;
      }),
  ]);

  // Persist RI-derived intent into contextual multipliers for the report / UI.
  if (top5RisksWithMitigations?.intentScore?.label) {
    const intentLabel = top5RisksWithMitigations.intentScore.label;
    report.contextualMultipliers = intentLabel;
    payloadCots.contextual_multipliers = intentLabel;
    payloadCots.contextualMultipliers = intentLabel;
  }

  if (top5RisksWithMitigations) {
    report.dbTop5Risks = {
      top5Risks: top5RisksWithMitigations.top5Risks.map((r) => ({
        risk_id: r.risk_id,
      })),
      mitigationsByRiskId: Object.fromEntries(
        Object.entries(top5RisksWithMitigations.mitigationsByRiskId).map(([rid, list]) => [
          rid,
          list.map((m) => ({
            mitigation_action_id: m.mitigation_action_id,
            mitigation_action_name: m.mitigation_action_name,
            mitigation_category: m.mitigation_category,
            mitigation_definition: m.mitigation_definition ?? null,
          })),
        ]),
      ),
    };
  }

  report.deploymentOverview = {
    useCase: payloadCots.expected_outcomes ?? payloadCots.primary_pain_point ?? "",
    productTier: productName,
    targetUsers: "",
    infrastructure: payloadCots.integration_complexity ?? "",
    deploymentTimeline: payloadCots.implementation_timeline ?? "",
    annualContractValue: payloadCots.customer_budget_range ?? "",
  };

  let generated: Awaited<ReturnType<typeof generateVendorCotsReport>> = null;
  let reportStatus: "done" | "failed" | "insufficient_data" = "done";
  try {
    generated = await generateVendorCotsReport(
      payloadCots,
      top5RisksWithMitigations,
      frameworkRowsForStoredReport,
      presetFormula,
    );
  } catch (genErr) {
    if (isTokenQuotaExceededError(genErr)) {
      reportStatus = "failed";
      report.reportStatus = "failed";
      report.scoreUnavailable = true;
      report.reportStatusMessage =
        genErr instanceof Error ? genErr.message : "Token quota exceeded.";
      console.error(
        `[cots_vendor] report generation quota error for assessment=${assessmentId}:`,
        genErr instanceof Error ? genErr.message : genErr,
      );
    } else if (isScoringUnavailableError(genErr) && genErr.reason === "insufficient_data") {
      // The user left a whole scoring area unanswered. A retry cannot help — the
      // report is marked "insufficient_data" so the UI can ask them to complete it.
      reportStatus = "insufficient_data";
      const d = genErr.details ?? {};
      report.reportStatus = "insufficient_data";
      report.scoreUnavailable = true;
      report.insufficientData = {
        classification:
          d.classification ?? "Insufficient data — some scoring areas were not answered.",
        pillarsMeasured: d.pillarsMeasured ?? null,
        pillarsTotal: d.pillarsTotal ?? null,
        unmeasuredAreas: d.unmeasuredAreas ?? [],
      };
      report.reportStatusMessage =
        d.classification ??
        "Insufficient data — complete the missing answers to generate a score.";
      console.error(
        `[cots_vendor] insufficient data for assessment=${assessmentId}: ${d.classification ?? ""}`,
      );
    } else {
      // Scorer failure / generation error: persisted as FAILED (retryable) rather
      // than left silently stuck "Generating".
      reportStatus = "failed";
      report.reportStatus = "failed";
      report.scoreUnavailable = true;
      report.reportStatusMessage =
        "The risk score could not be generated. Please retry.";
      console.error(
        `[cots_vendor] report generation error for assessment=${assessmentId}:`,
        genErr instanceof Error ? genErr.message : genErr,
      );
    }
  }
  let srsRationale = "";
  if (generated) {
    if (
      generated.matchedRiskSummaries &&
      generated.matchedRiskSummaries.length > 0 &&
      report.dbTop5Risks != null &&
      typeof report.dbTop5Risks === "object"
    ) {
      const dbTop = report.dbTop5Risks as {
        top5Risks?: Array<Record<string, unknown>>;
        mitigationsByRiskId?: unknown;
      };
      const rows = dbTop.top5Risks;
      if (Array.isArray(rows)) {
        const byId = new Map(
          generated.matchedRiskSummaries.map((m) => [
            String(m.risk_id ?? "").trim(),
            m.summary_points,
          ] as const),
        );
        dbTop.top5Risks = rows.map((r) => {
          const rid = String(r.risk_id ?? "").trim();
          const pts = rid ? byId.get(rid) : undefined;
          if (pts && pts.length > 0) {
            return { ...r, summary_points: pts };
          }
          return r;
        });
      }
    }

    if (
      generated.matchedMitigationSummaries &&
      generated.matchedMitigationSummaries.length > 0 &&
      report.dbTop5Risks != null &&
      typeof report.dbTop5Risks === "object"
    ) {
      const dbTop = report.dbTop5Risks as {
        top5Risks?: Array<Record<string, unknown>>;
        mitigationsByRiskId?: Record<string, Array<Record<string, unknown>>>;
      };
      const mitMap = dbTop.mitigationsByRiskId;
      if (mitMap && typeof mitMap === "object") {
        const mitigationIdByRiskAndName = new Map<string, string>();
        if (top5RisksWithMitigations?.mitigationsByRiskId) {
          for (const [rid, mids] of Object.entries(top5RisksWithMitigations.mitigationsByRiskId)) {
            for (const m of mids) {
              const key = `${rid}::${String(m.mitigation_action_name ?? "").trim().toLowerCase().replace(/\s+/g, " ")}`;
              mitigationIdByRiskAndName.set(key, String(m.mitigation_action_id ?? "").trim());
            }
          }
        }
        const normName = (s: string) =>
          String(s ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
        for (const entry of generated.matchedMitigationSummaries) {
          const rid = String(entry.risk_id ?? "").trim();
          const wantName = String(entry.mitigation_action_name ?? "").trim();
          const pts = entry.summary_points?.filter((p) => String(p ?? "").trim().length > 1) ?? [];
          if (!rid || !wantName || pts.length === 0) continue;
          const mitigationId = mitigationIdByRiskAndName.get(`${rid}::${normName(wantName)}`) ?? "";
          if (!mitigationId) continue;
          const list = mitMap[rid];
          if (!Array.isArray(list)) continue;
          const idx = list.findIndex(
            (m) => String(m.mitigation_action_id ?? "").trim() === mitigationId,
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], mitigation_summary_points: pts };
          }
        }
        dbTop.mitigationsByRiskId = mitMap;
      }
    }

    const fullReport = generated.fullReport as Record<string, unknown> | undefined;
    const appendix = (fullReport?.appendix && typeof fullReport.appendix === "object")
      ? (fullReport.appendix as Record<string, unknown>)
      : {};
    const calculatedRoi = calculateRoiFromAssessment(payloadCots);
    const frameworkMappingRows = frameworkRowsForStoredReport;

    report.generatedAnalysis = {
      overallRiskScore: generated.overallRiskScore,
      riskLevel: generated.riskLevel,
      scoreRationale:
        typeof generated.scoreRationale === "string"
          ? generated.scoreRationale.trim() || undefined
          : undefined,
      scoreRationaleType:
        generated.scoreRationaleType === "SCS" ||
        generated.scoreRationaleType === "SRS" ||
        generated.scoreRationaleType === "IRS"
          ? generated.scoreRationaleType
          : "SCS",
      summary: generated.summary,
      executiveSummary: generated.executiveSummary,
      keyRisks: generated.keyRisks,
      recommendations: generated.recommendations,
      recommendationsWithPriority: generated.recommendationsWithPriority,
      fullReport: {
        ...fullReport,
        frameworkMapping: { rows: frameworkMappingRows },
        roiAnalysis: calculatedRoi ?? undefined,
        appendix: {
          ...appendix,
          methodology: APPENDIX_METHODOLOGY,
          preparedBy: APPENDIX_PREPARED_BY,
          reviewedBy: reviewedByUser.trim() || "—",
          confidentiality: APPENDIX_CONFIDENTIALITY,
          dataSources: Array.isArray(appendix.dataSources) ? appendix.dataSources : undefined,
          catalogRisksAndMitigations: appendixCatalogRisksAndMitigations(top5RisksWithMitigations),
          catalogRiskMitigationActions: appendixRiskMitigationActions(top5RisksWithMitigations),
        },
      },
    };
    if (frameworkMappingRows.length > 0) {
      report.frameworkMappingRows = frameworkMappingRows;
    }
    srsRationale =
      typeof generated.scoreRationale === "string" ? generated.scoreRationale.trim() : "";
    if (srsRationale) {
      report.scoreRationale = srsRationale;
      report.scoreRationaleType = "SCS";
    }
  } else if (frameworkRowsForStoredReport.length > 0) {
    report.generatedAnalysis = {
      fullReport: {
        frameworkMapping: { rows: frameworkRowsForStoredReport },
      },
    };
    report.frameworkMappingRows = frameworkRowsForStoredReport;
  }

  const llmMeta = getActiveLlmModelMeta();
  const reportStored = stampActiveLlmModel(report as Record<string, unknown>);

  const includeStatusColumn = await hasReportStatusColumn(
    pool,
    "customer_risk_assessment_reports",
  );
  await db.insert(customerRiskAssessmentReports).values({
    assessment_id: assessmentId,
    organization_id: orgIdStr,
    title,
    report: reportStored,
    ...(includeStatusColumn ? { report_status: reportStatus } : {}),
    score_rationale: srsRationale || undefined,
    score_rationale_type: srsRationale ? "SCS" : undefined,
    llm_model_id: llmMeta.modelId,
    llm_model_label: llmMeta.modelLabel,
  });
  console.log(
    `[cots_vendor] report saved assessment=${assessmentId} elapsed=${Date.now() - reportStarted}ms`,
  );
}

/**
 * LLM report generation often exceeds the gateway idle timeout (~60s).
 * Save the assessment, send JSON to the browser, THEN generate the report.
 * Do not await this from the HTTP handler.
 */
function queueCustomerRiskReport(
  assessmentId: string,
  orgIdStr: string,
  payloadCots: Record<string, unknown>,
  reviewedByUser: string,
): void {
  const actor = getRequestActor();
  setImmediate(() => {
    void runWithRequestActor(actor, async () => {
      try {
        await createCustomerRiskReport(
          assessmentId,
          orgIdStr,
          payloadCots,
          reviewedByUser,
        );
      } catch (err) {
        console.error(
          "Background vendor COTS report generation failed:",
          assessmentId,
          err instanceof Error ? err.message : err,
        );
      }
    });
  });
}

const submitVendorCotsAssessment = async (req: Request, res: Response) => {
  try {
    const decoded = req.user as { id?: number } | undefined;
    const userId = decoded?.id;
    if (userId == null) {
      return res.status(401).json({ message: "User not found from token" });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, Number(userId)))
      .limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    const orgIdFromUser = (user as Record<string, unknown>).organization_id;
    const orgIdStr = orgIdFromUser != null ? String(orgIdFromUser).trim() : "";
    if (!orgIdStr) {
      return res.status(400).json({ message: "User has no organization. Complete onboarding or contact admin." });
    }

    await assertFeatureTokenQuota("assessment");

    const u = user as Record<string, unknown>;
    const firstName = typeof u.user_first_name === "string" ? u.user_first_name.trim() : "";
    const lastName = typeof u.user_last_name === "string" ? u.user_last_name.trim() : "";
    const userName = typeof u.user_name === "string" ? u.user_name.trim() : "";
    const email = typeof u.email === "string" ? u.email.trim() : "";
    const reviewedByUser =
      [firstName, lastName].filter(Boolean).join(" ") || userName || email || "—";

    const body = req.body ?? {};
    const payloadCots = buildVendorCotsPayload(body as Record<string, unknown>);

    const assessmentIdRaw = body.assessmentId ?? body.assessment_id;
    const assessmentId = typeof assessmentIdRaw === "string" ? assessmentIdRaw.trim() || null : null;

    if (assessmentId) {
      const [existing] = await db
        .select({ id: assessments.id, status: assessments.status })
        .from(assessments)
        .where(
          and(
            eq(assessments.id, assessmentId),
            eq(assessments.organization_id, orgIdStr),
            eq(assessments.type, "cots_vendor")
          )
        )
        .limit(1);
      if (existing) {
        const currentStatus = String((existing as { status?: string }).status ?? "").toLowerCase();
        if (currentStatus === "completed" || currentStatus === "submitted") {
          return res.status(403).json({
            message: "Completed assessments cannot be modified.",
          });
        }
        await db.transaction(async (tx) => {
          await tx
            .update(assessments)
            .set({ status: "submitted", updated_at: new Date() })
            .where(eq(assessments.id, assessmentId));
          await tx
            .update(cotsVendorAssessments)
            .set({ ...payloadCots, user_id: Number(userId), updated_at: new Date() })
            .where(eq(cotsVendorAssessments.assessment_id, assessmentId));
        });
        res.status(200).json({
          message: "Vendor COTS assessment submitted successfully",
          assessmentId,
          reportGenerating: true,
        });
        queueCustomerRiskReport(assessmentId, orgIdStr, payloadCots, reviewedByUser);
        return;
      }
    }

    const [assessment] = await db.transaction(async (tx) => {
      const [a] = await tx
        .insert(assessments)
        .values({
          type: "cots_vendor",
          organization_id: orgIdStr,
          status: "submitted",
        })
        .returning({ id: assessments.id });

      if (!a?.id) {
        throw new Error("Failed to create assessment");
      }

      await tx.insert(cotsVendorAssessments).values({
        assessment_id: a.id,
        user_id: Number(userId),
        ...payloadCots,
      });

      return [a];
    });

    res.status(201).json({
      message: "Vendor COTS assessment submitted successfully",
      assessmentId: assessment.id,
      reportGenerating: true,
    });
    queueCustomerRiskReport(assessment.id, orgIdStr, payloadCots, reviewedByUser);
    return;
  } catch (error) {
    if (sendIfTokenQuotaExceeded(res, error)) return;
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in submitVendorCotsAssessment:", message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * POST /vendorCotsAssessment/:id/regenerate
 * Re-run report generation for an assessment the caller's org owns (e.g. after a
 * failed or stuck "Generating" report). Authenticated and org-scoped: a user can
 * only regenerate reports for their own organization's assessments. Prior report
 * rows for the assessment are removed so the regenerated report is authoritative.
 */
export const regenerateVendorCotsReport = async (req: Request, res: Response) => {
  try {
    const decoded = req.user as { id?: number } | undefined;
    const userId = decoded?.id;
    if (userId == null) {
      return res.status(401).json({ message: "User not found from token" });
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, Number(userId)))
      .limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    const orgIdStr = String((user as Record<string, unknown>).organization_id ?? "").trim();
    if (!orgIdStr) {
      return res.status(400).json({ message: "User has no organization." });
    }

    const assessmentId =
      typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!assessmentId) {
      return res.status(400).json({ message: "Invalid assessment id" });
    }

    const [assessment] = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(
        and(
          eq(assessments.id, assessmentId),
          eq(assessments.organization_id, orgIdStr),
          eq(assessments.type, "cots_vendor"),
        ),
      )
      .limit(1);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found or access denied" });
    }

    const [row] = await db
      .select()
      .from(cotsVendorAssessments)
      .where(eq(cotsVendorAssessments.assessment_id, assessmentId))
      .limit(1);
    if (!row) {
      return res.status(404).json({ message: "Assessment data not found" });
    }

    await assertFeatureTokenQuota("assessment");

    // Remove prior report rows so the regenerated report is authoritative.
    await db
      .delete(customerRiskAssessmentReports)
      .where(
        and(
          eq(customerRiskAssessmentReports.assessment_id, assessmentId),
          eq(customerRiskAssessmentReports.organization_id, orgIdStr),
        ),
      );

    const u = user as Record<string, unknown>;
    const reviewedByUser =
      [
        typeof u.user_first_name === "string" ? u.user_first_name.trim() : "",
        typeof u.user_last_name === "string" ? u.user_last_name.trim() : "",
      ]
        .filter(Boolean)
        .join(" ") ||
      (typeof u.user_name === "string" ? u.user_name.trim() : "") ||
      (typeof u.email === "string" ? u.email.trim() : "") ||
      "—";

    // Stored row columns are the original payloadCots keys (round-trip safe).
    const payloadCots = { ...(row as Record<string, unknown>) };

    res.status(202).json({
      message: "Report regeneration started",
      assessmentId,
      reportGenerating: true,
    });
    queueCustomerRiskReport(assessmentId, orgIdStr, payloadCots, reviewedByUser);
    return;
  } catch (error) {
    if (sendIfTokenQuotaExceeded(res, error)) return;
    console.error(
      "regenerateVendorCotsReport:",
      error instanceof Error ? error.message : error,
    );
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /vendorCotsAssessment/:id/reopen-for-edit
 * Reopen a submitted assessment for editing (status → draft) so the user can
 * complete missing answers after an "insufficient data" result. Authenticated,
 * org-scoped, and audit-logged. Any stale report rows are cleared.
 */
export const reopenVendorCotsForEdit = async (req: Request, res: Response) => {
  try {
    const decoded = req.user as { id?: number } | undefined;
    const userId = decoded?.id;
    if (userId == null) {
      return res.status(401).json({ message: "User not found from token" });
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, Number(userId)))
      .limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    const orgIdStr = String((user as Record<string, unknown>).organization_id ?? "").trim();
    if (!orgIdStr) {
      return res.status(400).json({ message: "User has no organization." });
    }

    const assessmentId =
      typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!assessmentId) {
      return res.status(400).json({ message: "Invalid assessment id" });
    }

    const [assessment] = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(
        and(
          eq(assessments.id, assessmentId),
          eq(assessments.organization_id, orgIdStr),
          eq(assessments.type, "cots_vendor"),
        ),
      )
      .limit(1);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found or access denied" });
    }

    const reasonRaw =
      typeof req.body?.reason === "string" && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 4000)
        : "Reopened to complete missing answers (insufficient data)";

    await db.transaction(async (tx) => {
      await tx
        .update(assessments)
        .set({ status: "draft", updated_at: new Date() })
        .where(eq(assessments.id, assessmentId));
      await tx.insert(assessmentUserArchiveLog).values({
        assessment_id: assessmentId,
        user_id: Number(userId),
        action: "reopen_for_edit",
        reason: reasonRaw,
      });
      // Clear the stale (insufficient/failed) report so it is regenerated on resubmit.
      await tx
        .delete(customerRiskAssessmentReports)
        .where(
          and(
            eq(customerRiskAssessmentReports.assessment_id, assessmentId),
            eq(customerRiskAssessmentReports.organization_id, orgIdStr),
          ),
        );
    });

    return res.status(200).json({
      message: "Assessment reopened for editing",
      assessmentId,
      status: "draft",
    });
  } catch (error) {
    console.error(
      "reopenVendorCotsForEdit:",
      error instanceof Error ? error.message : error,
    );
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default submitVendorCotsAssessment;
