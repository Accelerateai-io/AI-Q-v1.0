import { Navigate } from "react-router-dom";
import MainLayout from "./MainLayout";
import LayoutWithoutNav from "./LayoutWithoutNav";
import { isVendorAttestationOnlyRole } from "../../guards/rbacConfig";

const ACCESS_DENIED_PATH = "/accessDenied";

/**
 * Renders Vendor Self Attestation with side + top nav when the user has a session
 * (e.g. after vendor onboarding auto-login), otherwise without nav.
 * View-only users (vendor Engineer/Viewer) who try to access the attestation form
 * (e.g. via edit link) are redirected to access denied.
 */
function VendorSelfAttestationLayout() {
  const hasSession = !!sessionStorage.getItem("bearerToken");

  if (hasSession) {
    const systemRole = (sessionStorage.getItem("systemRole") ?? "").toLowerCase().trim();
    const userRole = sessionStorage.getItem("userRole");
    const isViewOnlyVendor =
      systemRole === "vendor" && isVendorAttestationOnlyRole(userRole);
    if (isViewOnlyVendor) {
      return <Navigate to={ACCESS_DENIED_PATH} replace />;
    }
    return <MainLayout />;
  }
  return <LayoutWithoutNav />;
}

export default VendorSelfAttestationLayout;
