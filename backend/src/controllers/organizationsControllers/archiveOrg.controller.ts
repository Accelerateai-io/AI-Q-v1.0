import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../database/db.js";
import { createOrganization, organizationEditLogs } from "../../schema/schema.js";

const AI_EVAL_ORG_ID = 1;

type OrgStatus = "active" | "inactive" | "archived";

/**
 * Archive or restore an organization row only.
 * Does not change users, assessments, or attestations.
 */
const archiveOrganization = async (req: Request, res: Response) => {
  const idParam = req.params?.id;
  const rawId = Array.isArray(idParam) ? idParam[0] : idParam;
  const orgId =
    rawId != null && String(rawId).trim() !== "" ? Number(String(rawId).trim()) : NaN;

  if (!Number.isInteger(orgId) || orgId < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid organization id",
    });
  }

  if (orgId === AI_EVAL_ORG_ID) {
    return res.status(403).json({
      success: false,
      message: "The platform organization cannot be archived.",
    });
  }

  const body = req.body as { archived?: unknown; reason?: unknown };
  const archived = body.archived === true;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return res.status(400).json({
      success: false,
      message: "Reason is required",
    });
  }

  const userIdFromToken = (req as { user?: { id?: number } }).user?.id;
  const updatedBy = userIdFromToken != null ? String(userIdFromToken) : null;
  if (!updatedBy) {
    return res.status(400).json({
      success: false,
      message: "User ID is required for audit log. Please log in again.",
    });
  }

  const nextStatus: OrgStatus = archived ? "archived" : "active";

  try {
    const [existing] = await db
      .select({
        id: createOrganization.id,
        organizationName: createOrganization.organizationName,
        organizationStatus: createOrganization.organizationStatus,
      })
      .from(createOrganization)
      .where(eq(createOrganization.id, orgId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    await db
      .update(createOrganization)
      .set({ organizationStatus: nextStatus })
      .where(eq(createOrganization.id, orgId));

    await db.insert(organizationEditLogs).values({
      organizationId: String(orgId),
      organizationName: existing.organizationName,
      organizationStatus: nextStatus,
      updated_by: updatedBy,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: archived
        ? "Organization archived"
        : "Organization restored to active",
      data: {
        id: orgId,
        organizationName: existing.organizationName,
        organizationStatus: nextStatus,
      },
    });
  } catch (error) {
    console.error("archiveOrganization error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update organization archive status",
    });
  }
};

export default archiveOrganization;
