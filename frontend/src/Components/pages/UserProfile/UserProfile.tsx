import {
  Ban,
  CircleX,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  User,
} from "lucide-react";
import UserPopup from "../../UI/UserPopup";
import Modal from "../../UI/Modal";
import Button from "../../UI/Button";
import aiqLogoBlue from "../../../assets/images/mainLogo/new_logo/ai_q_logo_blue.png";
import aiqLogoGray from "../../../assets/images/mainLogo/new_logo/ai_q_logo_gray.png";
import "../../../styles/popovers.css";
import "../VendorOnboarding/StepVendorOnboardingPreview.css";
import "./user_profile.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  type AppTheme,
  getStoredTheme,
  setTheme,
} from "../../../utils/theme";

type UserProfileProps = {
  onClose?: () => void;
  /** Opens the account settings popup; falls back to the My Account page when omitted */
  onOpenSettings?: () => void;
};

function getSession(key: string): string {
  const value = sessionStorage.getItem(key);
  return value != null ? String(value).trim() : "";
}

const THEME_OPTIONS: {
  value: AppTheme;
  label: string;
  icon: typeof Monitor;
}[] = [
  { value: "system", label: "SYSTEM", icon: Monitor },
  { value: "dark", label: "DARK", icon: Moon },
  { value: "light", label: "LIGHT", icon: Sun },
];

const UserProfile = ({ onClose, onOpenSettings }: UserProfileProps) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [theme, setThemeState] = useState<AppTheme>(() => getStoredTheme());

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const LOGOUT_SPINNER_MIN_MS = 2500; // 2.5 seconds so spinner is visible 2–3s

  const organizationName = getSession("organizationName");
  const displayName =
    getSession("userName") ||
    [getSession("userFirstName"), getSession("userLastName")]
      .filter(Boolean)
      .join(" ") ||
    getSession("userEmail") ||
    "User";
  const orgLabel = organizationName || displayName;

  const formatRoleLabel = (raw: string): string => {
    const cleaned = raw.trim().replace(/_/g, " ");
    if (!cleaned) return "";
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const systemRoleRaw = getSession("systemRole").trim().toLowerCase().replace(/_/g, " ");
  const userRoleLabel = formatRoleLabel(getSession("userRole"));
  const systemRoleLabel = formatRoleLabel(getSession("systemRole"));
  const isVendorOrBuyer = systemRoleRaw === "vendor" || systemRoleRaw === "buyer";
  const isSystemAdmin = systemRoleRaw === "system admin";
  const isSystemPortal = systemRoleRaw.startsWith("system ");
  const portalTag =
    systemRoleRaw === "vendor"
      ? "VENDOR"
      : systemRoleRaw === "buyer"
        ? "BUYER"
        : isSystemAdmin
          ? "Platform Owner"
          : isSystemPortal
            ? formatRoleLabel(systemRoleRaw)
            : null;
  const roleTag =
    userRoleLabel ||
    (isVendorOrBuyer
      ? "User"
      : isSystemPortal
        ? formatRoleLabel(systemRoleRaw.replace(/^system\s+/, "")) || systemRoleLabel
        : systemRoleLabel) ||
    "User";

  const closeLogoutConfirm = () => {
    if (isLoggingOut) return;
    setIsLogoutConfirmOpen(false);
  };

  const logout = async () => {
    setIsLoggingOut(true);
    const startTime = Date.now();

    const token = sessionStorage.getItem("bearerToken");

    try {
      const response = await fetch(`${BASE_URL}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result) {
          sessionStorage.removeItem("bearerToken");
          sessionStorage.removeItem("userEmail");
          sessionStorage.removeItem("userRole");
          sessionStorage.removeItem("userId");
          sessionStorage.removeItem("systemRole");
          sessionStorage.removeItem("user_signup_completed");
          sessionStorage.removeItem("user_onboarding_completed");
          // Keep spinner visible for at least 2–3 seconds before redirecting
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, LOGOUT_SPINNER_MIN_MS - elapsed);
          await new Promise((r) => setTimeout(r, remaining));
          toast.success("Logged out successfully");
          navigate("/login");
          return;
        }
      }
    } catch (err) {
      console.log("Request failed: ", err);
    }

    // Ensure spinner shows for at least 2–3s before re-enabling button on error
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, LOGOUT_SPINNER_MIN_MS - elapsed);
    await new Promise((r) => setTimeout(r, remaining));
    setIsLoggingOut(false);
    setIsLogoutConfirmOpen(false);
  };

  const openSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    onClose?.();
    navigate("/account");
  };

  const selectTheme = (next: AppTheme) => {
    setThemeState(next);
    setTheme(next);
  };

  const onRowKeyDown = (
    event: React.KeyboardEvent<HTMLLIElement>,
    action: () => void,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <>
      <UserPopup className="user_popup user_popup--account">
        <div className="account_menu_header">
          <span className="account_menu_avatar_wrap">
            <img
              src={aiqLogoBlue}
              alt=""
              className="account_menu_avatar account_menu_avatar--light"
              width={44}
              height={44}
              aria-hidden
            />
            <img
              src={aiqLogoGray}
              alt=""
              className="account_menu_avatar account_menu_avatar--dark"
              width={44}
              height={44}
              aria-hidden
            />
          </span>
          <p className="account_menu_org" title={orgLabel}>
            {orgLabel}
          </p>
        </div>

        <ul className="account_menu_list">
          <li
            className="account_menu_item"
            role="button"
            tabIndex={0}
            onClick={openSettings}
            onKeyDown={(e) => onRowKeyDown(e, openSettings)}
          >
            <Settings aria-hidden />
            <span className="account_menu_label">Settings</span>
          </li>
          <li className="account_menu_item account_menu_item--static">
            <Palette aria-hidden />
            <span className="account_menu_label">Theme</span>
          </li>
          <li className="account_menu_theme">
            <div
              className="account_theme_options"
              role="radiogroup"
              aria-label="Theme"
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  className={`account_theme_option ${theme === value ? "account_theme_option--active" : ""}`}
                  onClick={() => selectTheme(value)}
                >
                  <Icon size={14} aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </li>
          <li className="account_menu_item account_menu_item--static account_menu_item--user">
            <User size={18} aria-hidden />
            <span className="account_menu_user_block">
              <span className="account_menu_user_name_row">
                <span className="account_menu_label" title={displayName}>
                  {displayName}
                </span>
                {!portalTag ? (
                  <span
                    className="account_menu_user_tag account_menu_user_tag--inline"
                    title={`Role: ${roleTag}`}
                  >
                    {roleTag}
                  </span>
                ) : null}
              </span>
              {portalTag ? (
                <span
                  className="account_menu_user_role"
                  title={`Role: ${roleTag}`}
                >
                  <span className="account_menu_user_role_text">
                    <span className="account_menu_user_role_label">Role</span>
                    <span className="account_menu_user_role_dot" aria-hidden>
                      ·
                    </span>
                    <span className="account_menu_user_tag">{roleTag}</span>
                  </span>
                </span>
              ) : null}
            </span>
            {portalTag ? (
              <span className="account_menu_portal_tag" title={portalTag}>
                {portalTag}
              </span>
            ) : null}
          </li>
          <li className="account_menu_logout_item">
            <button
              type="button"
              className="logout_btn orgCancelBtn"
              disabled={isLoggingOut}
              onClick={() => {
                if (!isLoggingOut) setIsLogoutConfirmOpen(true);
              }}
            >
              <LogOut aria-hidden />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </UserPopup>

      {isLogoutConfirmOpen
        ? createPortal(
            <Modal
              isOpen={isLogoutConfirmOpen}
              onClose={closeLogoutConfirm}
              overlayClassName="profile_modal_overlay logout_confirm_modal_overlay"
              popupClassName=""
            >
              <div className="profile_modal_content settings_modal_content logout_confirm_modal_content">
                <div className="profile_modal_header">
                  <h2 className="profile_modal_title">Confirm logout</h2>
                  <button
                    type="button"
                    className="modal_close_btn"
                    onClick={closeLogoutConfirm}
                    disabled={isLoggingOut}
                    aria-label="Close"
                  >
                    <CircleX size={20} />
                  </button>
                </div>
                <div className="profile_modal_body">
                  <p className="logout_confirm_modal_message">
                    Are you sure you want to log out?
                  </p>
                  <div className="settings_form_actions">
                    <Button
                      type="button"
                      className="orgCancelBtn logout_confirm_cancel_btn"
                      onClick={closeLogoutConfirm}
                      disabled={isLoggingOut}
                    >
                      <Ban size={16} aria-hidden />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className={`logout_confirm_btn orgCreateBtn ${isLoggingOut ? "auth_btn_loading" : ""}`}
                      onClick={logout}
                      disabled={isLoggingOut}
                      aria-busy={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <>
                          Logging out…
                          <Loader2 size={18} className="auth_spinner" aria-hidden />
                        </>
                      ) : (
                        <>
                          <LogOut size={16} aria-hidden />
                          Logout
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Modal>,
            document.body,
          )
        : null}
    </>
  );
};

export default UserProfile;
