import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  normalizeSystemRole,
  isPathAllowedForUserRole,
  type SystemRole,
} from "./rbacConfig";
import { isValidProtectedPath } from "./validPaths";

const SYSTEM_ROLE_KEY = "systemRole";
const USER_ROLE_KEY = "userRole";
const ACCESS_DENIED_PATH = "/accessDenied";
const PAGE_NOT_FOUND_PATH = "/pageNotFound";

/**
 * Route guard: enforces RBAC by system role and user role.
 * - Route does not exist in the app → Page Not Found.
 * - Route exists but user does not have access → Access Denied.
 */
export function RBACGuard() {
  const location = useLocation();
  const path = location.pathname;

  if (!isValidProtectedPath(path)) {
    return <Navigate to={PAGE_NOT_FOUND_PATH} replace />;
  }

  const systemRoleRaw = sessionStorage.getItem(SYSTEM_ROLE_KEY);
  const userRoleRaw = sessionStorage.getItem(USER_ROLE_KEY);
  const normalizedRole = normalizeSystemRole(systemRoleRaw) as SystemRole | "";
  const allowed = isPathAllowedForUserRole(path, normalizedRole, userRoleRaw ?? "");

  if (!allowed) {
    return <Navigate to={ACCESS_DENIED_PATH} replace />;
  }

  return <Outlet />;
}

export default RBACGuard;
