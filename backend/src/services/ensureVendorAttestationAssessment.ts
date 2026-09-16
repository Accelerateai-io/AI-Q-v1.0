import { and, eq } from "drizzle-orm";
import { db } from "../database/db.js";
import { assessments } from "../schema/assessments/assessments.js";

/**
 * Type 01 lives on vendor_self_attestations but scoring risks hang off assessments.id.
 * Create/update the assessments row so assessment_risks can be stored.
 */
export async function ensureVendorAttestationAssessment(options: {
  organizationId: string | null;
  existingAssessmentId?: string | null;
  status: "draft" | "submitted";
}): Promise<string | null> {
  const org = options.organizationId?.trim() || "";
  const existing = options.existingAssessmentId?.trim() || "";
  if (existing) {
    await db
      .update(assessments)
      .set({
        status: options.status,
        updated_at: new Date(),
        ...(org ? { organization_id: org } : {}),
      })
      .where(and(eq(assessments.id, existing), eq(assessments.type, "vendor_self_attestation")));
    return existing;
  }
  if (!org) return null;
  const [row] = await db
    .insert(assessments)
    .values({
      type: "vendor_self_attestation",
      organization_id: org,
      status: options.status,
    })
    .returning({ id: assessments.id });
  return row?.id ?? null;
}
