import { Mail, Building2, Shield } from "lucide-react";
import "../../styles/popovers.css";

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

interface ProfileDetailPopoverProps {
  className?: string;
}

/** Reusable profile details block: name, first/last, email, organization, role. Reads from sessionStorage. */
function ProfileDetailPopover({ className = "" }: ProfileDetailPopoverProps) {
  const userName = getSession("userName");
  const firstName = getSession("userFirstName");
  const lastName = getSession("userLastName");
  const email = getSession("userEmail");
  const organizationName = getSession("organizationName");
  const systemRole = sessionStorage.getItem("systemRole");
  const userRole = sessionStorage.getItem("userRole");
  const isVendorOrBuyer =
    systemRole && ["vendor", "buyer"].includes(systemRole.trim().toLowerCase());
  const roleLabel =
    isVendorOrBuyer && userRole?.trim()
      ? formatRoleForDisplay(userRole)
      : formatRoleForDisplay(systemRole);
  const displayName =
    userName || [firstName, lastName].filter(Boolean).join(" ") || email || "—";

  return (
    <div className={`profile_detail_popover ${className}`.trim()}>
      <div className="profile_detail_popover_row">
        <label className="profile_detail_popover_label" htmlFor="popover_name">Name</label>
        <input
          id="popover_name"
          type="text"
          className="profile_detail_popover_input"
          value={displayName}
          readOnly
          aria-readonly="true"
        />
      </div>
      {userName && (
        <div className="profile_detail_popover_row">
          <label className="profile_detail_popover_label" htmlFor="popover_username">User name</label>
          <input
            id="popover_username"
            type="text"
            className="profile_detail_popover_input"
            value={userName}
            readOnly
            aria-readonly="true"
          />
        </div>
      )}
      {firstName && (
        <div className="profile_detail_popover_row">
          <label className="profile_detail_popover_label" htmlFor="popover_first_name">First name</label>
          <input
            id="popover_first_name"
            type="text"
            className="profile_detail_popover_input"
            value={firstName}
            readOnly
            aria-readonly="true"
          />
        </div>
      )}
      {lastName && (
        <div className="profile_detail_popover_row">
          <label className="profile_detail_popover_label" htmlFor="popover_last_name">Last name</label>
          <input
            id="popover_last_name"
            type="text"
            className="profile_detail_popover_input"
            value={lastName}
            readOnly
            aria-readonly="true"
          />
        </div>
      )}
      <div className="profile_detail_popover_row">
        <label className="profile_detail_popover_label" htmlFor="popover_email">
          <Mail size={12} aria-hidden /> Email
        </label>
        <input
          id="popover_email"
          type="text"
          className="profile_detail_popover_input profile_detail_popover_input--email"
          value={email || "—"}
          readOnly
          aria-readonly="true"
        />
      </div>
      {organizationName && (
        <div className="profile_detail_popover_row">
          <label className="profile_detail_popover_label" htmlFor="popover_organization">
            <Building2 size={12} aria-hidden /> Organization
          </label>
          <input
            id="popover_organization"
            type="text"
            className="profile_detail_popover_input"
            value={organizationName}
            readOnly
            aria-readonly="true"
          />
        </div>
      )}
      <div className="profile_detail_popover_row">
        <label className="profile_detail_popover_label" htmlFor="popover_role">
          <Shield size={12} aria-hidden /> Role
        </label>
        <input
          id="popover_role"
          type="text"
          className="profile_detail_popover_input"
          value={roleLabel}
          readOnly
          aria-readonly="true"
        />
      </div>
    </div>
  );
}

export default ProfileDetailPopover;
