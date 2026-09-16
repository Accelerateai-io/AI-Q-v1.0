import { useState, useEffect } from "react";
import { NAV_SECTIONS } from "../../constants/navConfig"; // the grouped list of side navigation bar
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { normalizeSystemRole, isPathAllowedForUserRole } from "../../guards/rbacConfig";
import type { SystemRole } from "../../guards/rbacConfig";
import "../../styles/layout/sideNav.css";
import aiQLogoBlue from "../../assets/images/mainLogo/new_logo/ai_q_logo_blue.png";
import aiQLogoGray from "../../assets/images/mainLogo/new_logo/ai_q_logo_gray.png";

const ASSESSMENT_PATHS = ["/assessments", "/vendorcots", "/buyerAssessment"];
const isAssessmentArea = (pathname: string) =>
  ASSESSMENT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

const isAttestationArea = (pathname: string) =>
  pathname === "/attestation_details" ||
  pathname.startsWith("/attestation_details/") ||
  pathname.startsWith("/vendorSelfAttestation");

const SideNavBar = () => {
  const location = useLocation();
  const reportsLibraryMatch = useMatch({ path: "/reports/*" });
  const isReportsNavActive =
    location.pathname === "/reports" ||
    reportsLibraryMatch != null ||
    location.pathname.startsWith("/buyer-vendor-risk-report/");
  const [, setProfileRefresh] = useState(0);
  useEffect(() => {
    const onProfileUpdated = () => setProfileRefresh((n) => n + 1);
    window.addEventListener("userProfileUpdated", onProfileUpdated);
    return () => window.removeEventListener("userProfileUpdated", onProfileUpdated);
  }, []);
  const rawSystemRole = sessionStorage.getItem("systemRole") ?? "";
  const rawUserRole = sessionStorage.getItem("userRole") ?? "";
  const normalizedSystemRole = normalizeSystemRole(rawSystemRole) as SystemRole | "";

  // Only show nav items for routes this role is allowed to access (same rules as RBACGuard).
  // e.g. vendor lead does not see User Management; only admin/manager do.
  const seenPaths = new Set<string>();
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (seenPaths.has(item.path)) return false;
      if (!isPathAllowedForUserRole(item.path, normalizedSystemRole, rawUserRole)) return false;
      seenPaths.add(item.path);
      return true;
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <div className="side_nav_content">
        <nav className="side_nav_sections">
          {visibleSections.map((section) => (
            <div className="side_nav_section" key={section.id}>
              {section.heading && (
                <p className="side_nav_section_heading" id={`side_nav_section_${section.id}`}>
                  {section.heading}
                </p>
              )}
              <ul
                className="side_nav_list"
                aria-labelledby={section.heading ? `side_nav_section_${section.id}` : undefined}
              >
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isAssessmentsItem = item.path === "/assessments";
                  const isAttestationItem = item.path === "/attestation_details";
                  const isReportsItem = item.path === "/reports";
                  const isObservabilityItem = item.path === "/observability";
                  const showActive =
                    (isAssessmentsItem && isAssessmentArea(location.pathname)) ||
                    (isAttestationItem && isAttestationArea(location.pathname)) ||
                    (isReportsItem && isReportsNavActive) ||
                    (isObservabilityItem &&
                      location.pathname.startsWith("/observability/"));
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          ["side_nav_link", showActive || isActive ? "active" : ""]
                            .filter(Boolean)
                            .join(" ")
                        }
                      >
                        <span className="side_nav_icon">
                          <Icon size={18} />
                        </span>
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="side_nav_logo_footer">
          <NavLink to="/" className="side_nav_logo_footer_link" aria-label="AI-Q home">
            <div className="side_nav_logo_icon">
              <img
                src={aiQLogoBlue}
                alt="AI-Q"
                className="side_nav_logo_img side_nav_logo_img--light"
              />
              <img
                src={aiQLogoGray}
                alt=""
                className="side_nav_logo_img side_nav_logo_img--dark"
                aria-hidden
              />
            </div>
          </NavLink>
        </div>
      </div>
    </>
  );
};

export default SideNavBar;
