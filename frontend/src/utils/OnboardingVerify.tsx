import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import {jwtDecode} from "jwt-decode";

interface TokenPayload {
  email: string;
  userId: string;
  exp: number;
}

const OnboardingAccess = () => {
  const { token } = useParams<{ token: string }>(); // token from URL
  const location = useLocation();

  const handleToken = (): boolean => {
    // Check sessionStorage first
    let sessionToken = sessionStorage.getItem("onboardingToken");

    // If token in URL, use it instead
    const activeToken = token || sessionToken;
    if (!activeToken) return false; // no token at all

    try {
      const decoded: TokenPayload = jwtDecode(activeToken);

      // Check expiration
      if (decoded.exp * 1000 < Date.now()) {
        sessionStorage.clear();
        return false; // expired
      }

      // Store details in session
      sessionStorage.setItem("onboardingToken", activeToken);
      sessionStorage.setItem("email", decoded.email);
      sessionStorage.setItem("userId", decoded.userId);

      return true; // valid token
    } catch (error) {
      console.error("Invalid token", error);
      sessionStorage.clear();
      return false;
    }
  };

  return handleToken() ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
};

export default OnboardingAccess;
