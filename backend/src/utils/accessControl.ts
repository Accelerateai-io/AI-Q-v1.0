/**
 * Pure, DB-free access-control helpers shared across controllers and middleware.
 *
 * Product rule: a customer user may only see and change their own organization's
 * data; only Accelerate AI system users (organization 1 + a system platform role)
 * may manage the platform.
 *
 * Keep these functions pure so every access rule has a unit test that fails if the
 * rule regresses. DB lookups live in getCallerContext() below.
 */
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "../database/db.js";
import { usersTable } from "../schema/schema.js";

/** Accelerate AI platform organization id. */
export const INTERNAL_ORG_ID = 1;

/** Platform roles that make a user an Accelerate AI system (internal) user. */
export function isInternalPlatformRole(role: string): boolean {
  const r = role.trim().toLowerCase().replace(/_/g, " ");
  return (
    r === "system admin" ||
    r === "system manager" ||
    r === "system user" ||
    r === "system viewer" ||
    r === "ai directory curator"
  );
}

/** A caller is internal only when in org 1 AND holding a system platform role. */
export function isInternalContext(input: {
  organizationId: number | null | undefined;
  platformRole: string | null | undefined;
}): boolean {
  const orgId = Number(input.organizationId ?? NaN);
  const role = String(input.platformRole ?? "");
  return orgId === INTERNAL_ORG_ID && isInternalPlatformRole(role);
}

/** Positive-integer coercion helper. */
function readPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * True only for login session tokens.
 *
 * Session tokens (login / onboarding-complete handoff) carry `id` and no
 * non-session marker. Invite and signup tokens carry only `email` (no `id`);
 * onboarding tokens carry `userId` + `organizationType` (no `id`); password
 * reset tokens carry `purpose: "password_reset"`. Any of those must be rejected
 * when presented as an API session.
 */
export function isSessionTokenPayload(decoded: unknown): boolean {
  if (decoded == null || typeof decoded !== "object" || Array.isArray(decoded)) {
    return false;
  }
  const p = decoded as Record<string, unknown>;

  // Explicit non-session markers.
  if (typeof p.purpose === "string" && p.purpose.trim() !== "") return false;
  if (typeof p.organizationType === "string" && p.organizationType.trim() !== "") return false;
  if (typeof p.type === "string" && p.type.trim() !== "" && p.type !== "session") return false;

  // Must carry the session `id` claim. Onboarding tokens use `userId`, not `id`.
  return readPositiveInt(p.id) != null;
}

/** Session user id from a verified session token. */
export function sessionUserId(decoded: unknown): number | null {
  if (decoded == null || typeof decoded !== "object" || Array.isArray(decoded)) return null;
  return readPositiveInt((decoded as Record<string, unknown>).id);
}

export interface CallerContext {
  userId: number;
  organizationId: number | null;
  platformRole: string;
  isInternal: boolean;
}

/**
 * Load the caller's org id + platform role from the DB using the session token id.
 * The JWT only carries the org-level role, so platform role must be re-read.
 * Returns null when the token has no usable session id or the user is gone.
 */
export async function getCallerContext(req: Request): Promise<CallerContext | null> {
  const payload = req.user as { id?: number; userId?: string | number } | undefined;
  const rawId = payload?.id ?? payload?.userId;
  const userId = rawId != null ? Number(rawId) : NaN;
  if (!Number.isInteger(userId) || userId < 1) return null;

  const [row] = await db
    .select({
      organization_id: usersTable.organization_id,
      user_platform_role: usersTable.user_platform_role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!row) return null;

  const organizationId = row.organization_id != null ? Number(row.organization_id) : null;
  const platformRole = String(row.user_platform_role ?? "").trim().toLowerCase();
  return {
    userId,
    organizationId,
    platformRole,
    isInternal: isInternalContext({ organizationId, platformRole }),
  };
}

const SYSTEM_ROLE_NAMES = new Set([
  "system admin",
  "system user",
  "system manager",
  "system viewer",
  "ai directory curator",
]);

/** True when a role name targets a system (platform) role. */
export function isSystemRoleName(role: string | null | undefined): boolean {
  return SYSTEM_ROLE_NAMES.has(String(role ?? "").trim().toLowerCase());
}

/**
 * Decide whether a caller may invite/update a user into a target org with a target role.
 * - Internal users: anything.
 * - Non-internal: only their own org, and never org 1 or a system role.
 */
export function canManageUserInOrg(input: {
  isInternal: boolean;
  callerOrgId: number | null | undefined;
  targetOrgId: number | null | undefined;
  targetRole?: string | null;
}): { allowed: boolean; reason?: string } {
  if (input.isInternal) return { allowed: true };

  const callerOrg = Number(input.callerOrgId ?? NaN);
  const targetOrg = Number(input.targetOrgId ?? NaN);

  if (!Number.isInteger(callerOrg) || callerOrg < 1) {
    return { allowed: false, reason: "forbidden" };
  }
  if (targetOrg === INTERNAL_ORG_ID) {
    return { allowed: false, reason: "cannot target the platform organization" };
  }
  if (!Number.isInteger(targetOrg) || targetOrg !== callerOrg) {
    return { allowed: false, reason: "cross-organization access denied" };
  }
  if (isSystemRoleName(input.targetRole)) {
    return { allowed: false, reason: "cannot assign a system role" };
  }
  return { allowed: true };
}

/**
 * Decide whether a caller may download an attestation document.
 * Allowed for: internal users, the owning org, or a buyer when the attestation
 * is visible to buyers.
 */
export function canDownloadAttestation(input: {
  isInternal: boolean;
  callerOrgId: number | null | undefined;
  ownerOrgId: number | null | undefined;
  callerPlatformRole: string | null | undefined;
  visibleToBuyer: boolean;
}): boolean {
  if (input.isInternal) return true;

  const callerOrg = Number(input.callerOrgId ?? NaN);
  const ownerOrg = Number(input.ownerOrgId ?? NaN);
  if (Number.isInteger(callerOrg) && Number.isInteger(ownerOrg) && callerOrg === ownerOrg) {
    return true;
  }

  const role = String(input.callerPlatformRole ?? "").trim().toLowerCase();
  return role === "buyer" && input.visibleToBuyer === true;
}
