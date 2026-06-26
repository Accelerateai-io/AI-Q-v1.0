import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  normalizeSystemRole,
  isPathAllowedForUserRole,
  type SystemRole,
} from "../guards/rbacConfig";

const AUTH_TOKEN_KEY = "bearerToken";
const SYSTEM_ROLE_KEY = "systemRole";
const USER_ROLE_KEY = "userRole";
const LOGIN_PATH = "/login";
const ACCESS_DENIED_PATH = "/accessDenied";

/**
 * Combined route guard: auth + RBAC (system role + user role).
 * e.g. vendor lead cannot access User Management.
 */
const RouteAccess = () => {
  const location = useLocation();
  const bearerToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const systemRoleRaw = sessionStorage.getItem(SYSTEM_ROLE_KEY);
  const userRoleRaw = sessionStorage.getItem(USER_ROLE_KEY) ?? "";
  const normalizedRole = normalizeSystemRole(systemRoleRaw) as SystemRole | "";
  const path = location.pathname;

  if (!bearerToken) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  const pathAllowed = isPathAllowedForUserRole(path, normalizedRole, userRoleRaw);

  if (!pathAllowed) {
    return <Navigate to={ACCESS_DENIED_PATH} replace />;
  }

  return <Outlet />;
};

export default RouteAccess;
