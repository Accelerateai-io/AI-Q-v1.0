import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../database/db.js";
import { usersTable } from "../schema/schema.js";

function isInternalPlatformRole(role: string): boolean {
  return (
    role === "system admin" ||
    role === "system_admin" ||
    role === "systemadmin" ||
    role === "system manager" ||
    role === "system_manager" ||
    role === "system user" ||
    role === "system_user"
  );
}

/**
 * Middleware: rejects non-internal users with 403.
 *
 * "Internal" means: organization_id = 1 (Accelerate AI org) AND a system-level platform role.
 * Must run after authenticateToken (which sets req.user).
 *
 * JWT only contains the org-level role, NOT user_platform_role, so this middleware
 * re-fetches the full user row from the DB — same pattern as listVendorVisibleProducts.
 */
export async function requireInternalUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = req.user as { id?: number; userId?: string | number } | undefined;
    const rawId = payload?.id ?? payload?.userId;
    const userId = rawId != null ? Number(rawId) : NaN;

    if (!Number.isInteger(userId) || userId < 1) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const [fullUser] = await db
      .select({
        user_platform_role: usersTable.user_platform_role,
        organization_id: usersTable.organization_id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!fullUser) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const platformRole = String(fullUser.user_platform_role ?? "").trim().toLowerCase();
    const orgId = Number(fullUser.organization_id ?? "");

    if (orgId !== 1 || !isInternalPlatformRole(platformRole)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    next();
  } catch (e) {
    console.error("requireInternalUser:", e);
    res.status(500).json({ error: "authorization_check_failed" });
  }
}
