import { useEffect, useState } from "react";
import {
  Landmark,
  LockKeyhole,
  User,
  UserCircle,
  Eye,
  EyeOff,
  Loader2,
  CircleArrowUp,
  Ban,
} from "lucide-react";
import { toast } from "react-toastify";
import "../VendorOnboarding/StepVendorOnboardingPreview.css";
import "../UserManagement/user_management.css";
import "../UserProfile/user_profile.css";
import Button from "../../UI/Button";
import LoadingMessage from "../../UI/LoadingMessage";
import {
  buildOnboardingFields,
  formatOnboardingDate,
  formatPreviewValue,
} from "../../../utils/orgOnboardingDisplay";

type OrgOnboardingPayload = Record<string, unknown> | null;

function getSession(key: string): string {
  const v = sessionStorage.getItem(key);
  return v != null ? String(v).trim() : "";
}

function formatRoleForDisplay(role: string | null): string {
  if (!role || typeof role !== "string") return "—";
  return role
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type AccountTab = "organization" | "personal" | "password";

/** Which detail row is expanded into its editor; only one at a time */
type EditableRow = "name" | "username" | "password" | null;

type MyAccountProps = {
  /** Hide the page title block when the content is shown inside the settings modal */
  hidePageHeader?: boolean;
};

const MyAccount = ({ hidePageHeader = false }: MyAccountProps) => {
  const [, bump] = useState(0);
  const [activeTab, setActiveTab] = useState<AccountTab>("personal");
  const [editingRow, setEditingRow] = useState<EditableRow>(null);

  const [pUsername, setPUsername] = useState("");
  const [pFirst, setPFirst] = useState("");
  const [pLast, setPLast] = useState("");
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalError, setPersonalError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [orgOnboardingLoading, setOrgOnboardingLoading] = useState(false);
  const [orgOnboardingError, setOrgOnboardingError] = useState<string | null>(
    null,
  );
  const [orgOnboardingData, setOrgOnboardingData] = useState<{
    buyer: OrgOnboardingPayload;
    vendor: OrgOnboardingPayload;
  }>({ buyer: null, vendor: null });

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const systemRole = sessionStorage.getItem("systemRole");
  const systemRoleNormalized = (systemRole ?? "").trim().toLowerCase();
  const isVendorOrg = systemRoleNormalized === "vendor";
  const isBuyerOrg = systemRoleNormalized === "buyer";
  /** Vendor portal: vendor onboarding only; buyer portal: buyer only; system/other: both */
  const showBuyerOnboardingSection = !isVendorOrg;
  const showVendorOnboardingSection = !isBuyerOrg;
  const userRole = sessionStorage.getItem("userRole");
  const isVendorOrBuyer =
    systemRole && ["vendor", "buyer"].includes(systemRole.trim().toLowerCase());
  const roleLabel =
    isVendorOrBuyer && userRole?.trim()
      ? formatRoleForDisplay(userRole)
      : formatRoleForDisplay(systemRole);

  const userName = getSession("userName");
  const firstName = getSession("userFirstName");
  const lastName = getSession("userLastName");
  const email = getSession("userEmail");
  const organizationName = getSession("organizationName");
  const organizationId = getSession("organizationId");

  const hasPersonalChanges =
    pUsername.trim() !== (userName || "") ||
    pFirst.trim() !== (firstName || "") ||
    pLast.trim() !== (lastName || "");

  const canSubmitPasswordChange =
    newPassword.trim().length > 0 && confirmPassword.trim().length > 0;

  useEffect(() => {
    document.title = "AI-Q | My Account";
  }, []);

  useEffect(() => {
    const onUpdated = () => bump((n) => n + 1);
    window.addEventListener("userProfileUpdated", onUpdated);
    return () => window.removeEventListener("userProfileUpdated", onUpdated);
  }, []);

  useEffect(() => {
    setPUsername(getSession("userName"));
    setPFirst(getSession("userFirstName"));
    setPLast(getSession("userLastName"));
  }, [bump]);

  useEffect(() => {
    if (activeTab !== "organization") return;
    if (!organizationId) {
      setOrgOnboardingData({ buyer: null, vendor: null });
      setOrgOnboardingError(null);
      setOrgOnboardingLoading(false);
      return;
    }
    const token = sessionStorage.getItem("bearerToken");
    if (!token) return;
    setOrgOnboardingLoading(true);
    setOrgOnboardingError(null);
    const base = String(BASE_URL ?? "").replace(/\/$/, "");
    const url = `${base}/orgOnboarding/${encodeURIComponent(organizationId)}`;
    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) {
          throw new Error(
            result.message || "Failed to load organization onboarding data",
          );
        }
        const data = result.data ?? { buyer: null, vendor: null };
        setOrgOnboardingData({
          buyer:
            data.buyer && typeof data.buyer === "object"
              ? (data.buyer as Record<string, unknown>)
              : null,
          vendor:
            data.vendor && typeof data.vendor === "object"
              ? (data.vendor as Record<string, unknown>)
              : null,
        });
      })
      .catch((err) => {
        setOrgOnboardingError(
          err instanceof Error ? err.message : "Failed to load onboarding data",
        );
        setOrgOnboardingData({ buyer: null, vendor: null });
      })
      .finally(() => setOrgOnboardingLoading(false));
  }, [activeTab, BASE_URL, organizationId, bump]);

  useEffect(() => {
    if (activeTab !== "personal" && activeTab !== "password") return;
    const token = sessionStorage.getItem("bearerToken");
    if (!token) return;
    fetch(`${BASE_URL}/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.user_name != null) {
          setPUsername(String(data.user_name));
          sessionStorage.setItem("userName", String(data.user_name));
        }
        if (data?.user_first_name != null) {
          setPFirst(String(data.user_first_name));
          sessionStorage.setItem("userFirstName", String(data.user_first_name));
        }
        if (data?.user_last_name != null) {
          setPLast(String(data.user_last_name));
          sessionStorage.setItem("userLastName", String(data.user_last_name));
        }
        if (data?.email != null)
          sessionStorage.setItem("userEmail", String(data.email));
      })
      .catch(() => {});
  }, [activeTab, BASE_URL]);

  const resetPasswordForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const resetPersonalForm = () => {
    setPUsername(getSession("userName"));
    setPFirst(getSession("userFirstName"));
    setPLast(getSession("userLastName"));
    setPersonalError("");
  };

  const closeEditingRow = () => {
    if (editingRow === "password") resetPasswordForm();
    else resetPersonalForm();
    setEditingRow(null);
  };

  const handlePersonalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPersonalError("");
    const user_name = pUsername.trim() || null;
    const user_first_name = pFirst.trim() || null;
    const user_last_name = pLast.trim() || null;
    const usernameUnchanged = pUsername.trim() === (userName || "");
    const firstUnchanged = pFirst.trim() === (firstName || "");
    const lastUnchanged = pLast.trim() === (lastName || "");
    if (usernameUnchanged && firstUnchanged && lastUnchanged) {
      setPersonalError("Change at least one field to update.");
      return;
    }
    if (user_name === null && user_first_name === null && user_last_name === null) {
      setPersonalError("Enter a value for username, first name, and/or last name.");
      return;
    }
    setPersonalSaving(true);
    try {
      const token = sessionStorage.getItem("bearerToken");
      const res = await fetch(`${BASE_URL}/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_name: user_name ?? undefined,
          user_first_name: user_first_name ?? undefined,
          user_last_name: user_last_name ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const u = data.user;
        if (u) {
          if (u.user_name != null)
            sessionStorage.setItem("userName", String(u.user_name));
          if (u.user_first_name != null)
            sessionStorage.setItem("userFirstName", String(u.user_first_name));
          if (u.user_last_name != null)
            sessionStorage.setItem("userLastName", String(u.user_last_name));
          if (u.email != null)
            sessionStorage.setItem("userEmail", String(u.email));
        }
        window.dispatchEvent(
          new CustomEvent("userProfileUpdated", { detail: u ?? {} }),
        );
        toast.success(data.message ?? "Profile updated.");
        setEditingRow(null);
        bump((n) => n + 1);
      } else {
        setPersonalError(data.message ?? "Update failed.");
      }
    } catch {
      setPersonalError("Something went wrong. Please try again.");
    } finally {
      setPersonalSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    const newPass = newPassword.trim();
    const confirmPass = confirmPassword.trim();
    if (!newPass) {
      setPasswordError("Enter a new password.");
      return;
    }
    if (newPass.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const token = sessionStorage.getItem("bearerToken");
      const res = await fetch(`${BASE_URL}/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message ?? "Password updated.");
        resetPasswordForm();
        setEditingRow(null);
      } else {
        setPasswordError(data.message ?? "Update failed.");
      }
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  function onboardingCompletedMeta(row: OrgOnboardingPayload): {
    label: string;
    dateLabel: string | null;
  } {
    if (
      !row ||
      row.completedBy == null ||
      typeof row.completedBy !== "object" ||
      Array.isArray(row.completedBy)
    ) {
      return { label: "—", dateLabel: null };
    }
    const o = row.completedBy as { name?: string; email?: string };
    const label = (o.name || o.email || "—").trim();
    const dateLabel =
      row.completedAt != null
        ? formatOnboardingDate(row.completedAt)
        : null;
    return { label, dateLabel };
  }

  return (
    <div className="sec_user_page org_settings_page">
      {!hidePageHeader && (
        <div className="org_settings_header page_header_align">
          <div className="org_settings_headers page_header_row">
            <span className="icon_size_header" aria-hidden>
              <UserCircle size={24} className="header_icon_svg" />
            </span>
            <div className="page_header_title_block">
              <h1 className="org_settings_title page_header_title">
                My Account
              </h1>
              <p className="org_settings_subtitle page_header_subtitle">
                View your organization, update personal details, or change your
                password.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="account_settings_shell">
        <nav className="account_settings_nav" aria-label="Account settings">
          <p className="account_settings_nav_title">Account settings</p>
          <ul className="account_settings_nav_list">
            <li>
              <button
                type="button"
                className={`account_settings_nav_item ${activeTab === "personal" ? "account_settings_nav_item--active" : ""}`}
                aria-current={activeTab === "personal"}
                onClick={() => setActiveTab("personal")}
              >
                <User size={18} aria-hidden />
                Personal information
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`account_settings_nav_item ${activeTab === "password" ? "account_settings_nav_item--active" : ""}`}
                aria-current={activeTab === "password"}
                onClick={() => {
                  setActiveTab("password");
                  resetPasswordForm();
                }}
              >
                <LockKeyhole size={18} aria-hidden />
                Login & security
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`account_settings_nav_item ${activeTab === "organization" ? "account_settings_nav_item--active" : ""}`}
                aria-current={activeTab === "organization"}
                onClick={() => setActiveTab("organization")}
              >
                <Landmark size={18} aria-hidden />
                Organization
              </button>
            </li>
          </ul>
        </nav>

        <div className="account_settings_pane">
          {activeTab === "organization" && (
            <section
              className="profile_form_section"
              aria-labelledby="tab-organization-heading"
            >
              <h2 id="tab-organization-heading" className="account_settings_heading">
                Organization
              </h2>
              <div className="account_rows">
                <div className="account_row">
                  <div className="account_row_main">
                    <p className="account_row_label">Organization</p>
                    <p className="account_row_value">
                      {organizationName || "Not provided"}
                    </p>
                  </div>
                  <span className="account_row_note">
                    Managed by your administrator
                  </span>
                </div>
                <div className="account_row account_row--role">
                  <div className="account_row_main">
                    <p className="account_row_label">Role</p>
                    <p className="account_row_value">{roleLabel}</p>
                  </div>
                  <span className="account_row_note">
                    Managed by your administrator
                  </span>
                </div>
              </div>

              {!organizationId && (
                <p className="vendor_preview_not_done my_account_onboarding_notice">
                  No organization is linked to your account, so onboarding
                  details cannot be loaded.
                </p>
              )}

              {organizationId && orgOnboardingLoading && (
                <LoadingMessage message="Loading onboarding data…" compact />
              )}
              {organizationId && orgOnboardingError && (
                <p className="settings_error my_account_onboarding_notice" role="alert">
                  {orgOnboardingError}
                </p>
              )}

              {organizationId && !orgOnboardingLoading && !orgOnboardingError && (
                <div
                  className="vendor_preview_sections my_account_onboarding_sections"
                  aria-label="Organization onboarding"
                >
                  {showBuyerOnboardingSection && (
                    <section className="vendor_preview_card">
                      <h3 className="vendor_preview_card_title">Buyer onboarding</h3>
                      {orgOnboardingData.buyer ? (
                        <>
                          {(() => {
                            const row = orgOnboardingData.buyer;
                            const { label, dateLabel } =
                              onboardingCompletedMeta(row);
                            return (
                              <div className="org_preview_completed_by">
                                <User size={16} aria-hidden />
                                <span>
                                  Completed by <strong>{label}</strong>
                                  {dateLabel ? <> on {dateLabel}</> : null}
                                </span>
                              </div>
                            );
                          })()}
                          <dl className="vendor_preview_list">
                            {buildOnboardingFields(orgOnboardingData.buyer).map(
                              (field) => {
                                const row = orgOnboardingData.buyer as Record<
                                  string,
                                  unknown
                                >;
                                return (
                                  <div
                                    key={field.label}
                                    className="vendor_preview_row"
                                  >
                                    <dt className="vendor_preview_label">
                                      {field.label}
                                    </dt>
                                    <dd className="vendor_preview_value">
                                      {formatPreviewValue(
                                        field.value(row),
                                        field.label,
                                      )}
                                    </dd>
                                  </div>
                                );
                              },
                            )}
                          </dl>
                        </>
                      ) : (
                        <p className="vendor_preview_not_done">
                          Not completed for this organization.
                        </p>
                      )}
                    </section>
                  )}

                  {showVendorOnboardingSection && (
                    <section className="vendor_preview_card">
                      <h3 className="vendor_preview_card_title">Vendor onboarding</h3>
                      {orgOnboardingData.vendor ? (
                        <>
                          {(() => {
                            const row = orgOnboardingData.vendor;
                            const { label, dateLabel } =
                              onboardingCompletedMeta(row);
                            return (
                              <div className="org_preview_completed_by">
                                <User size={16} aria-hidden />
                                <span>
                                  Completed by <strong>{label}</strong>
                                  {dateLabel ? <> on {dateLabel}</> : null}
                                </span>
                              </div>
                            );
                          })()}
                          <dl className="vendor_preview_list">
                            {buildOnboardingFields(orgOnboardingData.vendor).map(
                              (field) => {
                                const row = orgOnboardingData.vendor as Record<
                                  string,
                                  unknown
                                >;
                                return (
                                  <div
                                    key={field.label}
                                    className="vendor_preview_row"
                                  >
                                    <dt className="vendor_preview_label">
                                      {field.label}
                                    </dt>
                                    <dd className="vendor_preview_value">
                                      {formatPreviewValue(
                                        field.value(row),
                                        field.label,
                                      )}
                                    </dd>
                                  </div>
                                );
                              },
                            )}
                          </dl>
                        </>
                      ) : (
                        <p className="vendor_preview_not_done">
                          Not completed for this organization.
                        </p>
                      )}
                    </section>
                  )}

                  {showBuyerOnboardingSection &&
                    showVendorOnboardingSection &&
                    !orgOnboardingData.buyer &&
                    !orgOnboardingData.vendor && (
                      <p className="vendor_preview_not_done">
                        No onboarding data has been saved for this organization
                        yet.
                      </p>
                    )}
                </div>
              )}
            </section>
          )}

          {activeTab === "personal" && (
            <section className="profile_form_section" aria-labelledby="tab-personal-heading">
              <h2 id="tab-personal-heading" className="account_settings_heading">
                Personal info
              </h2>
              <div className="account_rows">
                <div
                  className={`account_row ${editingRow === "name" ? "account_row--editing" : ""}`}
                >
                  {editingRow === "name" ? (
                    <form onSubmit={handlePersonalSubmit}>
                      <p className="account_row_label">Legal name</p>
                      <div className="account_row_fields">
                        <div className="settings_form_group">
                          <label htmlFor="my_account_first_name">First name</label>
                          <input
                            id="my_account_first_name"
                            type="text"
                            className="settings_input"
                            value={pFirst}
                            onChange={(ev) => setPFirst(ev.target.value)}
                            placeholder="First name"
                            autoComplete="given-name"
                          />
                        </div>
                        <div className="settings_form_group">
                          <label htmlFor="my_account_last_name">Last name</label>
                          <input
                            id="my_account_last_name"
                            type="text"
                            className="settings_input"
                            value={pLast}
                            onChange={(ev) => setPLast(ev.target.value)}
                            placeholder="Last name"
                            autoComplete="family-name"
                          />
                        </div>
                      </div>
                      {personalError && (
                        <p className="settings_error" role="alert">
                          {personalError}
                        </p>
                      )}
                      <div className="account_row_actions">
                        <Button
                          type="button"
                          className="orgCancelBtn"
                          onClick={closeEditingRow}
                          disabled={personalSaving}
                        >
                          <Ban size={16} aria-hidden />
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="orgCreateBtn"
                          disabled={personalSaving || !hasPersonalChanges}
                          aria-busy={personalSaving}
                        >
                          {personalSaving ? (
                            <>
                              Saving…
                              <Loader2 size={18} className="auth_spinner" aria-hidden />
                            </>
                          ) : (
                            <>
                              <CircleArrowUp size={16} aria-hidden />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="account_row_main">
                        <p className="account_row_label">Legal name</p>
                        <p className="account_row_value">
                          {[firstName, lastName].filter(Boolean).join(" ") ||
                            "Not provided"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="account_row_edit"
                        onClick={() => {
                          resetPersonalForm();
                          setEditingRow("name");
                        }}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>

                <div
                  className={`account_row ${editingRow === "username" ? "account_row--editing" : ""}`}
                >
                  {editingRow === "username" ? (
                    <form onSubmit={handlePersonalSubmit}>
                      <p className="account_row_label">User name</p>
                      <div className="account_row_fields">
                        <div className="settings_form_group">
                          <label htmlFor="my_account_username">User name</label>
                          <input
                            id="my_account_username"
                            type="text"
                            className="settings_input"
                            value={pUsername}
                            onChange={(ev) => setPUsername(ev.target.value)}
                            placeholder="Username (must be unique)"
                            autoComplete="username"
                          />
                        </div>
                      </div>
                      {personalError && (
                        <p className="settings_error" role="alert">
                          {personalError}
                        </p>
                      )}
                      <div className="account_row_actions">
                        <Button
                          type="button"
                          className="orgCancelBtn"
                          onClick={closeEditingRow}
                          disabled={personalSaving}
                        >
                          <Ban size={16} aria-hidden />
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="orgCreateBtn"
                          disabled={personalSaving || !hasPersonalChanges}
                          aria-busy={personalSaving}
                        >
                          {personalSaving ? (
                            <>
                              Saving…
                              <Loader2 size={18} className="auth_spinner" aria-hidden />
                            </>
                          ) : (
                            <>
                              <CircleArrowUp size={16} aria-hidden />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="account_row_main">
                        <p className="account_row_label">User name</p>
                        <p className="account_row_value">
                          {userName || "Not provided"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="account_row_edit"
                        onClick={() => {
                          resetPersonalForm();
                          setEditingRow("username");
                        }}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>

                <div className="account_row">
                  <div className="account_row_main">
                    <p className="account_row_label">Email address</p>
                    <p className="account_row_value">{email || "Not provided"}</p>
                  </div>
                  <span className="account_row_note">
                    Contact your administrator to change
                  </span>
                </div>

                <div className="account_row account_row--role">
                  <div className="account_row_main">
                    <p className="account_row_label">Role</p>
                    <p className="account_row_value">{roleLabel}</p>
                  </div>
                  <span className="account_row_note">
                    Managed by your administrator
                  </span>
                </div>
              </div>
            </section>
          )}

          {activeTab === "password" && (
            <section className="profile_form_section" aria-labelledby="tab-password-heading">
              <h2 id="tab-password-heading" className="account_settings_heading">
                Login &amp; security
              </h2>
              <div className="account_rows">
                <div
                  className={`account_row ${editingRow === "password" ? "account_row--editing" : ""}`}
                >
                  {editingRow === "password" ? (
                    <form onSubmit={handlePasswordSubmit}>
                      <p className="account_row_label">Password</p>
                      <p className="account_row_value">
                        Choose a strong password you do not use elsewhere.
                      </p>
                      <div className="account_row_fields">
                        <div className="settings_form_group">
                          <label htmlFor="my_account_new_password">
                            <LockKeyhole size={16} aria-hidden />
                            New password
                          </label>
                          <div className="settings_password_wrap">
                            <input
                              id="my_account_new_password"
                              type={showNewPassword ? "text" : "password"}
                              className="settings_input"
                              value={newPassword}
                              onChange={(ev) => setNewPassword(ev.target.value)}
                              placeholder="Min 6 characters"
                              autoComplete="new-password"
                              minLength={6}
                            />
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => setShowNewPassword((v) => !v)}
                              onKeyDown={(ev) =>
                                ev.key === "Enter" && setShowNewPassword((v) => !v)
                              }
                              className="passwordVisible"
                              aria-label={
                                showNewPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showNewPassword ? (
                                <Eye size={20} strokeWidth={1.5} aria-hidden />
                              ) : (
                                <EyeOff size={20} strokeWidth={1.5} aria-hidden />
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="settings_form_group">
                          <label htmlFor="my_account_confirm_password">
                            <LockKeyhole size={16} aria-hidden />
                            Confirm password
                          </label>
                          <div className="settings_password_wrap">
                            <input
                              id="my_account_confirm_password"
                              type={showConfirmPassword ? "text" : "password"}
                              className="settings_input"
                              value={confirmPassword}
                              onChange={(ev) =>
                                setConfirmPassword(ev.target.value)
                              }
                              placeholder="Confirm password"
                              autoComplete="new-password"
                            />
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              onKeyDown={(ev) =>
                                ev.key === "Enter" &&
                                setShowConfirmPassword((v) => !v)
                              }
                              className="passwordVisible"
                              aria-label={
                                showConfirmPassword
                                  ? "Hide password"
                                  : "Show password"
                              }
                            >
                              {showConfirmPassword ? (
                                <Eye size={20} strokeWidth={1.5} aria-hidden />
                              ) : (
                                <EyeOff size={20} strokeWidth={1.5} aria-hidden />
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      {passwordError && (
                        <p className="settings_error" role="alert">
                          {passwordError}
                        </p>
                      )}
                      <div className="account_row_actions">
                        <Button
                          type="button"
                          className="orgCancelBtn"
                          onClick={closeEditingRow}
                          disabled={passwordSaving}
                        >
                          <Ban size={16} aria-hidden />
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="orgCreateBtn"
                          disabled={passwordSaving || !canSubmitPasswordChange}
                          aria-busy={passwordSaving}
                        >
                          {passwordSaving ? (
                            <>
                              Updating…
                              <Loader2
                                size={18}
                                className="auth_spinner"
                                aria-hidden
                              />
                            </>
                          ) : (
                            <>
                              <CircleArrowUp size={16} aria-hidden />
                              Update password
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="account_row_main">
                        <p className="account_row_label">Password</p>
                        <p className="account_row_value">
                          Last updated password is hidden for security
                        </p>
                      </div>
                      <button
                        type="button"
                        className="account_row_edit"
                        onClick={() => {
                          resetPasswordForm();
                          setEditingRow("password");
                        }}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAccount;
