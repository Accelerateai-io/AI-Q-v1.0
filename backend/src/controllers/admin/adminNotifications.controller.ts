import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../database/db.js";
import { usersTable } from "../../schema/user_management/invite_user_schema.js";
import {
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../services/admin/tokenQuotaAlert.service.js";

function parseUserId(req: Request): number | null {
  const payload = req.user as { id?: number; userId?: string | number } | undefined;
  const rawId = payload?.id ?? payload?.userId;
  const userId = rawId != null ? Number(rawId) : NaN;
  if (!Number.isInteger(userId) || userId < 1) return null;
  return userId;
}

async function isPlatformAdmin(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ user_platform_role: usersTable.user_platform_role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const role = String(row?.user_platform_role ?? "").trim().toLowerCase();
  return role === "system admin" || role === "system_admin" || role === "systemadmin";
}

/** GET /admin/services/notifications */
export async function getAdminNotificationsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = parseUserId(req);
    if (userId == null) {
      res.status(401).json({ ok: false, message: "Unauthorized." });
      return;
    }
    if (!(await isPlatformAdmin(userId))) {
      res.status(200).json({ ok: true, data: { items: [], unreadCount: 0 } });
      return;
    }
    const data = await listAdminNotifications();
    res.status(200).json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getAdminNotificationsHandler:", message);
    res.status(500).json({ ok: false, message: "Failed to load notifications." });
  }
}

/** PATCH /admin/services/notifications/:id/read */
export async function markAdminNotificationReadHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = parseUserId(req);
    if (userId == null) {
      res.status(401).json({ ok: false, message: "Unauthorized." });
      return;
    }
    if (!(await isPlatformAdmin(userId))) {
      res.status(403).json({ ok: false, message: "Forbidden." });
      return;
    }
    const id = Number(req.params.id);
    const row = await markAdminNotificationRead(id);
    if (!row) {
      res.status(404).json({ ok: false, message: "Notification not found." });
      return;
    }
    res.status(200).json({ ok: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("markAdminNotificationReadHandler:", message);
    res.status(500).json({
      ok: false,
      message: "Failed to mark notification as read.",
    });
  }
}

/** POST /admin/services/notifications/read-all */
export async function markAllAdminNotificationsReadHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = parseUserId(req);
    if (userId == null) {
      res.status(401).json({ ok: false, message: "Unauthorized." });
      return;
    }
    if (!(await isPlatformAdmin(userId))) {
      res.status(403).json({ ok: false, message: "Forbidden." });
      return;
    }
    const updated = await markAllAdminNotificationsRead();
    res.status(200).json({ ok: true, data: { updated } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("markAllAdminNotificationsReadHandler:", message);
    res.status(500).json({
      ok: false,
      message: "Failed to mark notifications as read.",
    });
  }
}
