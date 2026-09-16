import type { Request, Response } from "express";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../database/db.js";
import { usersTable } from "../../schema/schema.js";
import { vendorSelfAttestations } from "../../schema/assessments/vendorSelfAttestations.js";
import { createOrganization } from "../../schema/organizations/organizations.js";
import { loadVtsScoreTraceByAttestationId } from "../../services/loadVtsScoreTrace.js";
import type { FactorExplanation } from "../../services/vtsFactorExplanations.js";

function parseUserId(req: Request): number | null {
  const payload = req.user as { id?: number; userId?: string | number; email?: string } | undefined;
  const rawId = payload?.id ?? payload?.userId;
  const userId = rawId != null ? Number(rawId) : NaN;
  if (Number.isInteger(userId) && userId >= 1) return userId;
  return null;
}

function asFactorExplanations(value: unknown): FactorExplanation[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FactorExplanation => {
    if (item == null || typeof item !== "object") return false;
    return typeof (item as FactorExplanation).factor === "string";
  });
}

/**
 * GET /vendorSelfAttestation/score-summary/:id
 *
 * Vendor-safe VTS summary for ScoreTracePanel (mode=vendor).
 * Omits formula, waterfall components, warnings, LLM id, and internalOnly factors.
 */
const getVendorScoreSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    let userId = parseUserId(req);
    const payload = req.user as { email?: string } | undefined;
    if (userId == null && payload?.email) {
      const email = String(payload.email).trim();
      if (email) {
        const [found] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.email, email))
          .limit(1);
        if (found) userId = found.id;
      }
    }
    if (userId == null) {
      res.status(401).json({ success: false, error: "User not authenticated or invalid user identifier" });
      return;
    }

    const attestationId =
      typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!attestationId) {
      res.status(400).json({ success: false, error: "Attestation id is required" });
      return;
    }

    const [currentUser] = await db
      .select({
        id: usersTable.id,
        organization_id: usersTable.organization_id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!currentUser) {
      res.status(401).json({ success: false, error: "User not found" });
      return;
    }

    const orgIdStr =
      currentUser.organization_id != null ? String(currentUser.organization_id) : "";
    let orgNameForFilter: string | null = null;
    const numOrgId = Number(orgIdStr);
    if (orgIdStr && Number.isInteger(numOrgId) && numOrgId >= 1) {
      const [orgRow] = await db
        .select({ organizationName: createOrganization.organizationName })
        .from(createOrganization)
        .where(eq(createOrganization.id, numOrgId))
        .limit(1);
      orgNameForFilter = orgRow?.organizationName ?? null;
    }

    const orgWhere =
      orgIdStr || orgNameForFilter
        ? orgIdStr && orgNameForFilter
          ? or(
              eq(vendorSelfAttestations.organization_id, orgIdStr),
              eq(vendorSelfAttestations.organization_id, orgNameForFilter),
            )
          : eq(vendorSelfAttestations.organization_id, orgIdStr || orgNameForFilter || "")
        : eq(vendorSelfAttestations.user_id, userId);

    const [attestation] = await db
      .select({ id: vendorSelfAttestations.id })
      .from(vendorSelfAttestations)
      .where(and(eq(vendorSelfAttestations.id, attestationId), orgWhere))
      .limit(1);

    if (!attestation) {
      res.status(404).json({ success: false, error: "Attestation not found" });
      return;
    }

    const loaded = await loadVtsScoreTraceByAttestationId(attestationId);
    if (!loaded) {
      res.status(404).json({
        success: false,
        error:
          "Score summary unavailable: no stored score breakdown for this attestation. Submit the attestation to generate one.",
      });
      return;
    }

    const vendorFactors = asFactorExplanations(loaded.trace.factorExplanations).filter(
      (item) => item.internalOnly !== true,
    );

    res.status(200).json({
      success: true,
      data: {
        scoreType: "vendor_trust" as const,
        finalScore: loaded.trace.finalScore,
        formula: "",
        scoringVersion: loaded.trace.scoringVersion,
        rawSubScores: {
          productScore: loaded.trace.rawSubScores.productScore,
          governanceScore: loaded.trace.rawSubScores.governanceScore,
          operationalScore: loaded.trace.rawSubScores.operationalScore,
        },
        components: [],
        warnings: [],
        missingEvidence: [],
        factorExplanations: vendorFactors,
        generatedAt: loaded.trace.generatedAt,
      },
    });
  } catch (error) {
    console.error("getVendorScoreSummary:", error);
    res.status(500).json({ success: false, error: "Failed to load score summary" });
  }
};

export default getVendorScoreSummary;
