import type { Request, Response } from "express";
import { db } from "../../database/db.js";
import { vendorSelfAttestations, usersTable } from "../../schema/schema.js";
import { eq } from "drizzle-orm";
import { canAccessOrgAttestation } from "../../utils/attestationAccess.js";

/**
 * PATCH /vendorSelfAttestation/visibility
 * Body: { attestationId: string, visible: boolean }
 * Sets visible_to_buyer for the given attestation. Only the attestation owner can update.
 * Attestation must exist and belong to the logged-in user.
 *
 * IMPORTANT: Product Profile toggle – must NOT update attestation submission metadata.
 * We only set visible_to_buyer. Do NOT set updated_at or submitted_at here.
 * submitted_at is set only in submitVendorSelfAttestation when status becomes COMPLETED.
 */
const updateAttestationVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.user as { id?: number; userId?: string | number } | undefined;
    const rawId = payload?.id ?? payload?.userId;
    const userId = rawId != null ? Number(rawId) : NaN;

    if (!Number.isInteger(userId) || userId < 1) {
      res.status(401).json({ success: false, message: "User not authenticated" });
      return;
    }

    const body = req.body ?? {};
    const attestationId =
      typeof body.attestationId === "string" ? body.attestationId.trim() : null;
    const visible =
      typeof body.visible === "boolean"
        ? body.visible
        : body.visible === "true" || body.visible === true;

    if (!attestationId) {
      res.status(400).json({ success: false, message: "attestationId is required" });
      return;
    }

    // Any user in the owning organization may change visibility (not just the
    // author). Match on the caller's org, keeping owner-id as a fallback for older
    // rows that predate organization_id.
    const [caller] = await db
      .select({ orgId: usersTable.organization_id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const callerOrgId = caller?.orgId != null ? String(caller.orgId) : null;

    const [existing] = await db
      .select({
        id: vendorSelfAttestations.id,
        organization_id: vendorSelfAttestations.organization_id,
        user_id: vendorSelfAttestations.user_id,
      })
      .from(vendorSelfAttestations)
      .where(eq(vendorSelfAttestations.id, attestationId))
      .limit(1);
    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Attestation not found or you do not have permission to update it.",
      });
      return;
    }
    if (!canAccessOrgAttestation(existing.organization_id, existing.user_id, callerOrgId, userId)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to update this attestation.",
      });
      return;
    }

    // Only update visibility; do not touch updated_at so attestation "Submitted" date is unchanged
    const result = await db
      .update(vendorSelfAttestations)
      .set({ visible_to_buyer: Boolean(visible) })
      .where(eq(vendorSelfAttestations.id, attestationId))
      .returning({ id: vendorSelfAttestations.id });

    if (!result || result.length === 0) {
      res.status(404).json({
        success: false,
        message: "Attestation not found or you do not have permission to update it.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: visible
        ? "Product is now visible to buyers."
        : "Product is now hidden from buyers.",
    });
  } catch (error) {
    console.error("updateAttestationVisibility error:", error);
    res.status(500).json({ success: false, message: "Could not update. Try again." });
  }
};

export default updateAttestationVisibility;
