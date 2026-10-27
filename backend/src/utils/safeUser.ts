/**
 * Allowlisted (safe) user columns for API responses.
 *
 * `user_password` (the bcrypt hash) must never leave the backend. Use SAFE_USER_COLUMNS
 * in drizzle selects and pickSafeUser() when echoing a full user row to the client.
 */
import { usersTable } from "../schema/schema.js";

/** Drizzle column map: every users column EXCEPT user_password. */
export const SAFE_USER_COLUMNS = {
  id: usersTable.id,
  email: usersTable.email,
  organization_id: usersTable.organization_id,
  role: usersTable.role,
  invited_at: usersTable.invited_at,
  invited_by: usersTable.invited_by,
  account_status: usersTable.account_status,
  user_name: usersTable.user_name,
  user_first_name: usersTable.user_first_name,
  user_last_name: usersTable.user_last_name,
  userStatus: usersTable.userStatus,
  user_signup_completed: usersTable.user_signup_completed,
  user_onboarding_completed: usersTable.user_onboarding_completed,
  onboarding_status: usersTable.onboarding_status,
  onboarding_link_sent_at: usersTable.onboarding_link_sent_at,
  user_platform_role: usersTable.user_platform_role,
} as const;

/** Allowlisted response field names (keys of SAFE_USER_COLUMNS). */
export const SAFE_USER_FIELDS = Object.keys(SAFE_USER_COLUMNS) as (keyof typeof SAFE_USER_COLUMNS)[];

/**
 * Return a copy of a user row containing only allowlisted fields.
 * Drops user_password (and any other non-allowlisted column) by construction.
 */
export function pickSafeUser<T extends Record<string, unknown>>(
  row: T | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!row) return out;
  for (const key of SAFE_USER_FIELDS) {
    if (key in row) out[key] = (row as Record<string, unknown>)[key];
  }
  return out;
}
