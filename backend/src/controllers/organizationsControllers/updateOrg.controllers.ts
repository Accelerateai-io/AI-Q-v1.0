import type { Request, Response } from "express";
import { db } from "../../database/db.js";
import { createOrganization, organizationEditLogs } from "../../schema/schema.js";
import { eq } from "drizzle-orm";

const updateOrganization = async (req: Request, res: Response) => {
  const data = req.body as {
    isOrganization?: string;
    isStatus?: string;
    isReason?: string;
    userId?: string | number | null;
  };
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

  const organizationName = typeof data.isOrganization === "string" ? data.isOrganization.trim() : "";
  const organizationStatus = typeof data.isStatus === "string" ? data.isStatus.trim().toLowerCase() : "";
  const reason = typeof data.isReason === "string" ? data.isReason.trim() : "";

  if (orgId === 1 && (organizationStatus === "archived" || organizationStatus === "inactive")) {
    return res.status(403).json({
      success: false,
      message: "The platform organization cannot be set inactive or archived.",
    });
  }

  if (!organizationName) {
    return res.status(400).json({
      success: false,
      message: "Organization name is required",
    });
  }
  if (
    organizationStatus !== "active" &&
    organizationStatus !== "inactive" &&
    organizationStatus !== "archived"
  ) {
    return res.status(400).json({
      success: false,
      message: "Status must be active, inactive, or archived",
    });
  }

  // Audit actor comes from the authenticated session token, never the request body.
  const userIdFromToken = (req as { user?: { id?: number } }).user?.id;
  const updatedBy = userIdFromToken != null ? String(userIdFromToken) : null;
  if (!updatedBy) {
    return res.status(400).json({
      success: false,
      message: "User ID is required for audit log. Please log in again.",
    });
  }

  try {
    await db
      .update(createOrganization)
      .set({
        organizationName,
        organizationStatus: organizationStatus as "active" | "inactive" | "archived",
      })
      .where(eq(createOrganization.id, orgId));

    await db.insert(organizationEditLogs).values({
      organizationId: String(orgId),
      organizationName,
      organizationStatus: organizationStatus as "active" | "inactive" | "archived",
      updated_by: updatedBy,
      reason: reason || "—",
    });

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
    });
  } catch (error) {
    console.error("updateOrganization error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update organization",
    });
  }
};

export default updateOrganization;
