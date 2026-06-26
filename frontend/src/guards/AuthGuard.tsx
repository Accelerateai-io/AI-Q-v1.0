import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isValidProtectedPath } from "./validPaths";

const AUTH_TOKEN_KEY = "bearerToken";
const LOGIN_PATH = "/login";
const PAGE_NOT_FOUND_PATH = "/pageNotFound";

/**
 * Route guard: requires an authenticated session (bearer token).
 * Redirects to login if not authenticated and path is valid; to Page Not Found if path is invalid.
 */
export function AuthGuard() {
  const { pathname } = useLocation();
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    if (!isValidProtectedPath(pathname)) {
      return <Navigate to={PAGE_NOT_FOUND_PATH} replace />;
    }
    return <Navigate to={LOGIN_PATH} replace />;
  }
  return <Outlet />;
}

export default AuthGuard;
