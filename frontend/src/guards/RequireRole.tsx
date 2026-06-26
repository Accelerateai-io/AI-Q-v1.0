import { Navigate, Outlet } from "react-router-dom";
import { normalizeSystemRole } from "./rbacConfig";
import type { SystemRole } from "./rbacConfig";

const SYSTEM_ROLE_KEY = "systemRole";
const ACCESS_DENIED_PATH = "/accessDenied";

interface RequireRoleProps {
  /** Allowed roles for this route (user must have one of these). */
  roles: readonly SystemRole[];
  /** Where to redirect when role is not allowed (default: Access Denied). */
  fallbackTo?: string;
}

/**
 * Route guard: allows access only if the user's system role is in the allowed list.
 * Use for routes that should be restricted to specific roles (e.g. admin-only).
 * Assumes AuthGuard and RBACGuard have already run.
 */
export function RequireRole({ roles, fallbackTo = ACCESS_DENIED_PATH }: RequireRoleProps) {
  const systemRoleRaw = sessionStorage.getItem(SYSTEM_ROLE_KEY);
  const normalizedRole = normalizeSystemRole(systemRoleRaw);

  const allowed = normalizedRole && roles.includes(normalizedRole as SystemRole);

  if (!allowed) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <Outlet />;
}

export default RequireRole;
