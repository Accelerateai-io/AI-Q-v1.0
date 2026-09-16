import type { Request, Response } from "express";
import { db } from "../../database/db.js";
import { usersTable } from "../../schema/schema.js";
import { assessments } from "../../schema/assessments/assessments.js";
import { cotsBuyerAssessments } from "../../schema/assessments/cotsBuyerAssessments.js";
import { eq, and } from "drizzle-orm";
import { buildPayloadCots } from "../../services/cotsBuyerPayload.js";

/** POST /buyerCotsAssessment/save-draft - create or update draft. Organization ID is taken from the authenticated user (DB). */
const saveBuyerCotsDraft = async (req: Request, res: Response) => {
  try {
    const decoded = req.user as { id?: number } | undefined;
    const userId = decoded?.id;
    if (userId == null) {
      return res.status(401).json({ message: "User not found from token" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId))).limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    const organizationId = String((user as Record<string, unknown>).organization_id ?? "").trim();
    if (!organizationId) {
      return res.status(400).json({ message: "User has no organization. Complete onboarding or contact admin." });
    }

    const body = req.body ?? {};
    const assessmentIdRaw = body.assessmentId ?? body.assessment_id;
    const assessmentId =
      assessmentIdRaw != null && assessmentIdRaw !== ""
        ? String(assessmentIdRaw).trim() || null
        : null;
    const payloadCots = buildPayloadCots(body);
    payloadCots.organization_id = organizationId;
    payloadCots.user_id = Number(userId);

    if (assessmentId) {
      const [existing] = await db
        .select({ id: assessments.id, status: assessments.status })
        .from(assessments)
        .where(and(eq(assessments.id, assessmentId), eq(assessments.organization_id, organizationId), eq(assessments.type, "cots_buyer")))
        .limit(1);
      if (!existing) {
        return res.status(404).json({ message: "Assessment not found or access denied" });
      }
      const currentStatus = String((existing as { status?: string }).status ?? "").toLowerCase();
      if (currentStatus === "completed" || currentStatus === "submitted") {
        return res.status(403).json({ message: "Completed assessments cannot be changed back to draft." });
      }
      await db.transaction(async (tx) => {
        await tx.update(assessments).set({ status: "draft", updated_at: new Date() }).where(eq(assessments.id, assessmentId));
        const [existingCots] = await tx
          .select({ id: cotsBuyerAssessments.id })
          .from(cotsBuyerAssessments)
          .where(eq(cotsBuyerAssessments.assessment_id, assessmentId))
          .limit(1);
        if (existingCots) {
          await tx
            .update(cotsBuyerAssessments)
            .set({ ...payloadCots, updated_at: new Date() })
            .where(eq(cotsBuyerAssessments.assessment_id, assessmentId));
        } else {
          await tx.insert(cotsBuyerAssessments).values({ assessment_id: assessmentId, ...payloadCots });
        }
      });
      return res.status(200).json({ message: "Draft saved", assessmentId: String(assessmentId) });
    }

    const [assessment] = await db.transaction(async (tx) => {
      const [a] = await tx
        .insert(assessments)
        .values({ type: "cots_buyer", organization_id: organizationId, status: "draft" })
        .returning({ id: assessments.id });
      if (!a?.id) throw new Error("Failed to create assessment");
      await tx.insert(cotsBuyerAssessments).values({ assessment_id: a.id, ...payloadCots });
      return [a];
    });
    const newId = assessment?.id != null ? String(assessment.id) : null;
    if (!newId) throw new Error("Failed to create assessment");
    return res.status(201).json({ message: "Draft saved", assessmentId: newId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("saveBuyerCotsDraft:", message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default saveBuyerCotsDraft;
