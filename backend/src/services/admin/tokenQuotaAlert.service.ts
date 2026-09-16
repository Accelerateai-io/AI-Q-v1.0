import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../database/db.js";
import {
  TOKEN_QUOTA_EXHAUSTED_TYPE,
  adminNotifications,
} from "../../schema/admin/adminNotifications.js";
import { getFeatureTokenBalance } from "./featureTokenQuota.service.js";
import {
  ORG_CONTROL_FEATURE_LABELS,
  type OrgControlFeature,
} from "./orgControlFeatures.js";

export type AdminNotificationRow = {
  id: number;
  type: string;
  title: string;
  body: string;
  organizationId: number | null;
  organizationName: string;
  subjectUserId: number | null;
  subjectUserName: string;
  allocatedTokens: number;
  consumedTokens: number;
  readAt: string | null;
  createdAt: string;
};

function asNonNegInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function mapRow(row: typeof adminNotifications.$inferSelect): AdminNotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    organizationId: row.organizationId ?? null,
    organizationName: (row.organizationName ?? "").trim() || "—",
    subjectUserId: row.subjectUserId ?? null,
    subjectUserName: (row.subjectUserName ?? "").trim() || "—",
    allocatedTokens: asNonNegInt(row.allocatedTokens),
    consumedTokens: asNonNegInt(row.consumedTokens),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** After recording usage, alert platform admin if this user has used their full allocation for a feature. */
export async function maybeNotifyTokenQuotaExhausted(input: {
  userId: number;
  organizationId: number;
  userName?: string | null;
  organizationName?: string | null;
  feature: OrgControlFeature;
}): Promise<void> {
  try {
    const userId = asNonNegInt(input.userId);
    const organizationId = asNonNegInt(input.organizationId);
    if (userId < 1 || organizationId < 1) return;

    const balance = await getFeatureTokenBalance({
      userId,
      organizationId,
      feature: input.feature,
    });
    if (!balance.exhausted || balance.allocated <= 0) return;

    const userName = (input.userName ?? "").trim() || "A user";
    const organizationName = (input.organizationName ?? "").trim() || "an organization";
    const featureLabel = ORG_CONTROL_FEATURE_LABELS[input.feature];
    const exhaustedParts = [
      balance.inputExceeded ? "input" : null,
      balance.outputExceeded ? "output" : null,
    ].filter(Boolean);
    const exhaustedLabel = exhaustedParts.length
      ? exhaustedParts.join(" and ")
      : "token";

    await db
      .insert(adminNotifications)
      .values({
        type: `${TOKEN_QUOTA_EXHAUSTED_TYPE}:${input.feature}`,
        title: `${featureLabel} quota exhausted`,
        body: `${userName} at ${organizationName} used their ${featureLabel} ${exhaustedLabel} token allocation. Open Controls to allocate more.`,
        organizationId,
        organizationName,
        subjectUserId: userId,
        subjectUserName: userName,
        allocatedTokens: balance.allocated,
        consumedTokens: balance.consumed,
      })
      .onConflictDoNothing({
        target: [
          adminNotifications.type,
          adminNotifications.subjectUserId,
          adminNotifications.allocatedTokens,
        ],
      });
  } catch (err) {
    console.error(
      "[tokenQuotaAlert] failed to notify:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function listAdminNotifications(limit = 50): Promise<{
  items: AdminNotificationRow[];
  unreadCount: number;
}> {
  const cap = Math.min(100, Math.max(1, Math.floor(limit) || 50));
  const [rows, unreadRows] = await Promise.all([
    db
      .select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt), desc(adminNotifications.id))
      .limit(cap),
    db
      .select({ count: sql<number>`count(*)` })
      .from(adminNotifications)
      .where(sql`${adminNotifications.readAt} is null`),
  ]);

  return {
    items: rows.map(mapRow),
    unreadCount: asNonNegInt(unreadRows[0]?.count),
  };
}

export async function markAdminNotificationRead(
  id: number,
): Promise<AdminNotificationRow | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const [row] = await db
    .update(adminNotifications)
    .set({ readAt: new Date() })
    .where(eq(adminNotifications.id, id))
    .returning();
  return row ? mapRow(row) : null;
}

export async function markAllAdminNotificationsRead(): Promise<number> {
  const rows = await db
    .update(adminNotifications)
    .set({ readAt: new Date() })
    .where(sql`${adminNotifications.readAt} is null`)
    .returning({ id: adminNotifications.id });
  return rows.length;
}
