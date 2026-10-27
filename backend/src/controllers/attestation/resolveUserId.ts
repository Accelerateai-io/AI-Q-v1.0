import type { Request } from "express";

/**
 * Resolve the session user id from a verified session token (id/userId).
 *
 * No email-lookup fallback: an invite / reset / onboarding token must never be
 * able to act as a session by resolving a user id from its email. authenticateToken
 * already rejects non-session tokens, so a valid session always carries `id`.
 * Returns NaN when no usable session id is present.
 */
export async function resolveUserId(req: Request): Promise<number> {
  const payload = req.user as {
    id?: number;
    userId?: string | number;
  } | undefined;
  const rawId = payload?.id ?? payload?.userId;
  const userId = rawId != null ? Number(rawId) : NaN;
  return Number.isInteger(userId) && userId >= 1 ? userId : NaN;
}
