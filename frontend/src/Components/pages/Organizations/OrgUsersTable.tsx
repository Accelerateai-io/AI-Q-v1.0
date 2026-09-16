import { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import {
  Search,
  Shield,
  Eye,
  CircleX,
  User,
  Mail,
  Landmark,
  UserStar,
  UserCheck,
  ClipboardCheck,
  SquarePen,
  Send,
  RefreshCw,
  Ban,
} from "lucide-react";
import LoadingMessage from "../../UI/LoadingMessage";
import Button from "../../UI/Button";
import Modal from "../../UI/Modal";
import EditUsers from "../UserManagement/EditUsers";
import OrgNameWithLogo from "../../UI/OrgNameWithLogo";
import { toast } from "react-toastify";
import "../UserManagement/user_management.css";
import "../UserProfile/user_profile.css";
import "../Assessments/assessments.css";
import "../../../styles/popovers.css";
import { premiumDataTableStyles } from "../../../styles/dataTableStyles";

type OrgUserRow = {
  id?: number | string;
  email?: string;
  user_name?: string;
  organization_id?: number | string;
  organization_name?: string;
  role?: string;
  user_platform_role?: string;
  account_status?: string;
  onboarding_status?: string;
  userStatus?: string;
  user_signup_completed?: string | boolean;
};

type OrgUsersTableProps = {
  organizationId: string;
  organizationName?: string;
};

function getInitial(row: OrgUserRow): string {
  const name = (row.user_name ?? "").trim();
  if (name.length >= 2) return name.slice(0, 2).toUpperCase();
  if (name.length === 1) return name.toUpperCase();
  const email = (row.email ?? "").trim();
  if (email.length >= 2) return email.slice(0, 2).toUpperCase();
  return "—";
}

function getRoleLabel(row: OrgUserRow): string {
  const r = (row.role ?? row.user_platform_role ?? "").trim();
  if (!r) return "—";
  const platformRole = (row.user_platform_role ?? "").trim().toLowerCase();
  const roleLower = r.toLowerCase();

  const systemRoleMap: Record<string, string> = {
    "system admin": "System Admin",
    "system manager": "System Manager",
    "system viewer": "System Viewer",
    "system user": "System User",
    "ai directory curator": "AI Directory Curator",
  };
  if (systemRoleMap[platformRole] || systemRoleMap[roleLower]) {
    return (
      systemRoleMap[platformRole] ??
      systemRoleMap[roleLower] ??
      r.replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  const vendorRoleMap: Record<string, string> = {
    admin: "T&SA Admin",
    manager: "T&SA Manager",
    lead: "T&SA Lead",
    engineer: "T&SA Engineer",
    viewer: "T&SA Viewer",
    analyst: "T&SA Lead",
    user: "T&SA Engineer",
  };
  const buyerRoleMap: Record<string, string> = {
    admin: "AI Adoption Admin",
    manager: "AI Adoption Manager",
    lead: "AI Adoption Lead",
    engineer: "AI Adoption Engineer",
    viewer: "AI Adoption Viewer",
    analyst: "AI Adoption Lead",
    user: "AI Adoption Engineer",
  };

  if (platformRole === "vendor") {
    return vendorRoleMap[roleLower] ?? r.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (platformRole === "buyer") {
    return buyerRoleMap[roleLower] ?? r.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const defaultMap: Record<string, string> = {
    admin: "Org Admin",
    analyst: "Assessor",
    viewer: "Viewer",
    user: "User",
    manager: "Manager",
  };
  return defaultMap[roleLower] ?? r.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAccountStatusLabel(row: OrgUserRow): string {
  const accountStatus = (row.account_status ?? "invited").toString().toLowerCase();
  const onboardingStatus = (row.onboarding_status ?? "pending").toString().toLowerCase();
  if (accountStatus === "confirmed") return "Confirmed";
  if (
    accountStatus === "expired" ||
    (accountStatus === "invited" && onboardingStatus === "expired")
  ) {
    return "Expired";
  }
  return "Invited";
}

function getOnboardingStatusLabel(row: OrgUserRow): string {
  const status = (row.onboarding_status ?? "pending").toString().toLowerCase();
  if (status === "completed") return "Completed";
  if (status === "expired") return "Expired";
  return "Pending";
}

/**
 * Users table for an organization preview tab.
 * Same actions as User Management: View, Edit, Re-Invite, Resend onboarding.
 */
export default function OrgUsersTable({
  organizationId,
  organizationName,
}: OrgUsersTableProps) {
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const [users, setUsers] = useState<OrgUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [viewUser, setViewUser] = useState<OrgUserRow | null>(null);
  const [isUserId, setUserId] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [isSelectedUser, setSelectedUser] = useState<OrgUserRow | null>(null);
  const [resendConfirm, setResendConfirm] = useState<{
    type: "reinvite" | "resend";
    user: OrgUserRow;
  } | null>(null);
  const [resendSending, setResendSending] = useState(false);

  const reloadUsers = async (options?: { silent?: boolean }) => {
    if (!organizationId) return;
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("bearerToken");
      const response = await fetch(`${BASE_URL}/allUsers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Failed to fetch users");
      }
      const all = Array.isArray(result?.data) ? result.data : [];
      const orgId = String(organizationId).trim();
      setUsers(
        all.filter(
          (u: OrgUserRow) => String(u.organization_id ?? "").trim() === orgId,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      if (!silent) setUsers([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = sessionStorage.getItem("bearerToken");
        const response = await fetch(`${BASE_URL}/allUsers`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.message || "Failed to fetch users");
        }
        const all = Array.isArray(result?.data) ? result.data : [];
        const orgId = String(organizationId).trim();
        const filtered = all.filter(
          (u: OrgUserRow) => String(u.organization_id ?? "").trim() === orgId,
        );
        if (!cancelled) setUsers(filtered);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load users");
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, BASE_URL]);

  const handleUserUpdated = (patch?: {
    id?: string | number;
    role?: string;
    userStatus?: string;
  }) => {
    if (patch?.id != null) {
      setUsers((prev) =>
        prev.map((row) => {
          if (String(row.id) !== String(patch.id)) return row;
          return {
            ...row,
            ...(patch.role != null && patch.role !== ""
              ? {
                  role: patch.role,
                  ...(String(patch.role).toLowerCase().startsWith("system")
                    ? { user_platform_role: patch.role }
                    : {}),
                }
              : {}),
            ...(patch.userStatus != null && patch.userStatus !== ""
              ? { userStatus: patch.userStatus }
              : {}),
          };
        }),
      );
    }
    void reloadUsers({ silent: true });
  };

  const updateUser = (row: OrgUserRow) => {
    setUserId(String(row.id ?? ""));
    setIsEdit(true);
    setSelectedUser(row);
  };

  const openReinviteConfirm = (row: OrgUserRow) => {
    if (row.id == null) return;
    setResendConfirm({ type: "reinvite", user: row });
  };

  const openResendOnboardingConfirm = (row: OrgUserRow) => {
    if (row.id == null) return;
    setResendConfirm({ type: "resend", user: row });
  };

  const closeResendConfirm = () => {
    if (!resendSending) setResendConfirm(null);
  };

  const executeResend = async () => {
    if (!resendConfirm?.user?.id) return;
    setResendSending(true);
    const id = resendConfirm.user.id;
    const isReinvite = resendConfirm.type === "reinvite";
    const endpoint = isReinvite
      ? `${BASE_URL}/reinvite_user/${id}`
      : `${BASE_URL}/resend_onboarding/${id}`;
    const successMsg = isReinvite ? "Signup link resent." : "Onboarding link resent.";
    const errorMsg = isReinvite
      ? "Failed to resend signup link."
      : "Failed to resend onboarding link.";
    try {
      const token = sessionStorage.getItem("bearerToken");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message ?? successMsg);
        setResendConfirm(null);
        void reloadUsers({ silent: true });
      } else {
        toast.error(data.message ?? errorMsg);
      }
    } catch (e) {
      console.error(e);
      toast.error(errorMsg);
    } finally {
      setResendSending(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.user_name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const role = getRoleLabel(u).toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [users, filterText]);

  const customStyles = premiumDataTableStyles;

  const columns = [
    {
      name: <div className="tableHeader">User</div>,
      selector: (row: OrgUserRow) =>
        row.user_name?.trim() ? row.user_name : (row.email ?? "—"),
      sortable: true,
      grow: 1.6,
      minWidth: "200px",
      cell: (row: OrgUserRow) => (
        <div className="team_member_user_cell">
          <span className="team_member_initial">{getInitial(row)}</span>
          <div className="team_member_name_email">
            <span className="team_member_name">
              {row.user_name?.trim() ? row.user_name : "—"}
            </span>
            {row.email ? (
              <a
                href={`mailto:${row.email}`}
                className="team_member_email team_member_email_link"
              >
                {row.email}
              </a>
            ) : (
              <span className="team_member_email">—</span>
            )}
          </div>
        </div>
      ),
    },
    {
      name: <div className="tableHeader">Role</div>,
      selector: (row: OrgUserRow) => getRoleLabel(row),
      sortable: true,
      wrap: false,
      grow: 1.1,
      minWidth: "150px",
      cell: (row: OrgUserRow) => (
        <span className="pill pill_role pill_role_with_icon">
          <Shield size={14} aria-hidden />
          {getRoleLabel(row)}
        </span>
      ),
    },
    {
      name: <div className="tableHeader">Account status</div>,
      selector: (row: OrgUserRow) => getAccountStatusLabel(row).toLowerCase(),
      sortable: true,
      minWidth: "130px",
      cell: (row: OrgUserRow) => {
        const label = getAccountStatusLabel(row);
        const isConfirmed = label === "Confirmed";
        const isExpired = label === "Expired";
        const pillClass = isConfirmed
          ? "pill_status_active"
          : isExpired
            ? "pill_status_inactive"
            : "pill_status_invited";
        const showDot = isConfirmed || isExpired;
        return (
          <span
            className={`pill pill_status ${pillClass}${
              showDot ? " pill_status_with_dot" : ""
            }`}
          >
            {showDot ? <span className="pill_status_dot" aria-hidden /> : null}
            {label}
          </span>
        );
      },
    },
    {
      name: <div className="tableHeader">Onboarding status</div>,
      selector: (row: OrgUserRow) => getOnboardingStatusLabel(row).toLowerCase(),
      sortable: true,
      minWidth: "140px",
      cell: (row: OrgUserRow) => {
        const label = getOnboardingStatusLabel(row);
        const isCompleted = label === "Completed";
        const isExpired = label === "Expired";
        const pillClass = isCompleted
          ? "pill_status_active"
          : isExpired
            ? "pill_status_inactive"
            : "pill_status_pending";
        const showDot = isCompleted || isExpired;
        return (
          <span
            className={`pill pill_status ${pillClass}${
              showDot ? " pill_status_with_dot" : ""
            }`}
          >
            {showDot ? <span className="pill_status_dot" aria-hidden /> : null}
            {label}
          </span>
        );
      },
    },
    {
      name: <div className="tableHeader">Status</div>,
      selector: (row: OrgUserRow) =>
        (row.userStatus ?? "active").toString().toLowerCase(),
      sortable: true,
      minWidth: "110px",
      cell: (row: OrgUserRow) => {
        const status = (row.userStatus ?? "active").toString().toLowerCase();
        const isActive = status === "active";
        return (
          <span
            className={`pill pill_status ${
              isActive ? "pill_status_active" : "pill_status_inactive"
            } pill_status_with_dot`}
          >
            <span className="pill_status_dot" aria-hidden />
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      name: <div className="tableHeader">Actions</div>,
      ignoreRowClick: true,
      minWidth: "180px",
      width: "180px",
      cell: (row: OrgUserRow) => {
        const accountStatus = (row.account_status ?? "invited")
          .toString()
          .toLowerCase();
        const onboardingStatus = (row.onboarding_status ?? "pending")
          .toString()
          .toLowerCase();
        const signupCompleted =
          (row.user_signup_completed ?? "").toString().toLowerCase() === "true";
        const isExpiredStatus = accountStatus === "expired";
        const currentUserId = sessionStorage.getItem("userId") ?? "";
        const isCurrentUser =
          currentUserId !== "" && String(row.id) === String(currentUserId);
        const editEnabled = accountStatus === "confirmed" && !isCurrentUser;
        const reinviteEnabled = isExpiredStatus;
        const resendOnboardingEnabled =
          !isExpiredStatus && signupCompleted && onboardingStatus === "expired";
        return (
          <div className="user_table_actions">
            <button
              type="button"
              className="user_table_action_btn user_table_action_btn_icon"
              onClick={() => setViewUser(row)}
              title="View"
              aria-label="View user details"
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              className="user_table_action_btn user_table_action_btn_icon"
              onClick={() => editEnabled && updateUser(row)}
              title="Edit"
              aria-label="Edit user"
              disabled={!editEnabled}
              aria-disabled={!editEnabled}
            >
              <SquarePen size={14} />
            </button>
            <button
              type="button"
              className="user_table_action_btn user_table_action_btn_icon"
              onClick={() => reinviteEnabled && openReinviteConfirm(row)}
              title="Re-Invite"
              aria-label="Resend signup link"
              disabled={!reinviteEnabled}
              aria-disabled={!reinviteEnabled}
            >
              <Send size={14} />
            </button>
            <button
              type="button"
              className="user_table_action_btn user_table_action_btn_icon"
              onClick={() =>
                resendOnboardingEnabled && openResendOnboardingConfirm(row)
              }
              title="Resend - Onboarding"
              aria-label="Resend onboarding"
              disabled={!resendOnboardingEnabled}
              aria-disabled={!resendOnboardingEnabled}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <LoadingMessage message="Loading users…" />;
  }

  if (error) {
    return <div className="vendor_attestation_error">{error}</div>;
  }

  return (
    <>
      <div className="orgDataTable org_preview_users_table team_members_table_wrapper">
        <div className="assessments_ledger_toolbar org_preview_users_toolbar">
          <div className="assessments_ledger_search">
            <Search
              size={18}
              className="assessments_ledger_search_icon"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search by name, email, or role…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="assessments_ledger_search_input"
              aria-label="Search users by name, email, or role"
              autoComplete="off"
            />
          </div>
        </div>

        {users.length === 0 ? (
          <p className="organizationPreviewEmpty">No users for this organization.</p>
        ) : filteredUsers.length === 0 ? (
          <p className="assessment_search_no_results">No users match your search.</p>
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            customStyles={customStyles}
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[10, 20, 30]}
            striped
            highlightOnHover={false}
            pointerOnHover={false}
            noDataComponent={
              <p className="organizationPreviewEmpty">
                No users for this organization.
              </p>
            }
          />
        )}
      </div>

      {viewUser && (
        <div
          className="profile_modal_overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org_user_details_modal_title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewUser(null);
          }}
        >
          <div
            className="profile_modal_content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile_modal_header">
              <h2
                id="org_user_details_modal_title"
                className="profile_modal_title"
              >
                User details
              </h2>
              <button
                type="button"
                className="modal_close_btn"
                onClick={() => setViewUser(null)}
                aria-label="Close"
              >
                <CircleX size={20} />
              </button>
            </div>
            <div className="profile_modal_body profile_modal_preview">
              <div className="profile_form_sections">
                <section className="profile_form_section">
                  <div className="settings_form">
                    <div className="settings_form_row">
                      <div className="settings_form_group">
                        <label htmlFor="org_user_details_name">
                          <User size={16} aria-hidden />
                          Name
                        </label>
                        <input
                          id="org_user_details_name"
                          type="text"
                          className="settings_input settings_input_readonly"
                          value={
                            viewUser.user_name?.trim()
                              ? viewUser.user_name
                              : "—"
                          }
                          readOnly
                          aria-readonly="true"
                        />
                      </div>
                      <div className="settings_form_group">
                        <label htmlFor="org_user_details_email">
                          <Mail size={16} aria-hidden />
                          Email
                        </label>
                        <input
                          id="org_user_details_email"
                          type="text"
                          className="settings_input settings_input_readonly"
                          value={viewUser.email ?? "—"}
                          readOnly
                          aria-readonly="true"
                        />
                      </div>
                    </div>
                    <div className="settings_form_row">
                      <div className="settings_form_group">
                        <label htmlFor="org_user_details_organization">
                          <Landmark size={16} aria-hidden />
                          Organization
                        </label>
                        <div
                          id="org_user_details_organization"
                          className="settings_input settings_input_readonly team_member_org_field"
                          aria-readonly="true"
                        >
                          <OrgNameWithLogo
                            name={
                              viewUser.organization_name ||
                              organizationName ||
                              undefined
                            }
                            id={viewUser.organization_id ?? organizationId}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="settings_form_group">
                        <label htmlFor="org_user_details_role">
                          <UserStar size={16} aria-hidden />
                          Role
                        </label>
                        <input
                          id="org_user_details_role"
                          type="text"
                          className="settings_input settings_input_readonly"
                          value={getRoleLabel(viewUser)}
                          readOnly
                          aria-readonly="true"
                        />
                      </div>
                    </div>
                    <div className="settings_form_row">
                      <div className="settings_form_group">
                        <label htmlFor="org_user_details_account_status">
                          <UserCheck size={16} aria-hidden />
                          Account status
                        </label>
                        <input
                          id="org_user_details_account_status"
                          type="text"
                          className="settings_input settings_input_readonly"
                          value={getAccountStatusLabel(viewUser)}
                          readOnly
                          aria-readonly="true"
                        />
                      </div>
                      <div className="settings_form_group">
                        <label htmlFor="org_user_details_onboarding_status">
                          <ClipboardCheck size={16} aria-hidden />
                          Onboarding status
                        </label>
                        <input
                          id="org_user_details_onboarding_status"
                          type="text"
                          className="settings_input settings_input_readonly"
                          value={getOnboardingStatusLabel(viewUser)}
                          readOnly
                          aria-readonly="true"
                        />
                      </div>
                    </div>
                    <div className="settings_form_row">
                      <div className="settings_form_group">
                        <label htmlFor="org_user_details_status">
                          <Shield size={16} aria-hidden />
                          Status
                        </label>
                        <input
                          id="org_user_details_status"
                          type="text"
                          className="settings_input settings_input_readonly"
                          value={
                            (viewUser.userStatus ?? "active")
                              .toString()
                              .toLowerCase() === "active"
                              ? "Active"
                              : "Inactive"
                          }
                          readOnly
                          aria-readonly="true"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
              <div className="profile_modal_footer profile_modal_footer_center">
                <Button
                  type="button"
                  className="orgCancelBtn"
                  onClick={() => setViewUser(null)}
                  aria-label="Close"
                >
                  <CircleX size={16} aria-hidden />
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEdit && (
        <EditUsers
          isUserId={isUserId}
          setIsEdit={setIsEdit}
          isEdit={isEdit}
          isSelectedUser={isSelectedUser}
          onUpdated={handleUserUpdated}
        />
      )}

      <Modal isOpen={!!resendConfirm} onClose={closeResendConfirm}>
        {resendConfirm && (
          <div className="user_view_modal_content resend_confirm_modal">
            <div className="user_view_modal_header">
              <h2 className="user_view_modal_title">
                {resendConfirm.type === "reinvite"
                  ? "Resend signup link"
                  : "Resend onboarding link"}
              </h2>
              <button
                type="button"
                className="modal_close_btn"
                onClick={closeResendConfirm}
                aria-label="Close"
                disabled={resendSending}
              >
                <CircleX size={20} />
              </button>
            </div>
            <p className="resend_confirm_message">
              {resendConfirm.type === "reinvite"
                ? `Send a new signup link to ${resendConfirm.user.email ?? "this user"}?`
                : `Send a new onboarding link to ${resendConfirm.user.email ?? "this user"}?`}
            </p>
            <div className="fields_for_button_actions orgBtns user_view_modal_footer">
              <Button
                type="button"
                className="orgCancelBtn"
                onClick={closeResendConfirm}
                disabled={resendSending}
              >
                <Ban size={16} />
                Cancel
              </Button>
              <Button
                type="button"
                className="orgCreateBtn"
                onClick={executeResend}
                disabled={resendSending}
                aria-busy={resendSending}
              >
                <Send size={16} />
                {resendSending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
