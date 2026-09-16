import { Ban, CircleX, Landmark, Plus, Mail, Tags, Shield } from "lucide-react";
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../Context/hooks";
import { toast } from "react-toastify";
import { getOrganizations } from "../../../Context/OrganizationsData";
import "../UserProfile/user_profile.css";
import "../../../styles/popovers.css";

const CreateOrganization = ({ setIsOrganization }) => {
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const [isOrganizationName, setIsOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("vendor");
  const [adminEmail, setAdminEmail] = useState("");
  const [isError, setIsError] = useState("");
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const dispatch = useAppDispatch();
  const { data: organizations } = useAppSelector((state) => state.organizations);

  const closeNewOrg = () => {
    setIsOrganization(false);
    setIsError("");
  };

  const canCreate =
    isOrganizationName.trim().length > 0 &&
    adminEmail.trim().length > 0 &&
    Boolean(organizationType);

  const createOrg = async (e) => {
    e.preventDefault();

    const nameTrimmed = isOrganizationName?.trim() ?? "";
    if (!nameTrimmed) {
      setIsError("Organization name is required");
      return;
    }

    const emailTrimmed = adminEmail?.trim() ?? "";
    if (!emailTrimmed) {
      setIsError("Admin email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setIsError("Please enter a valid email address");
      return;
    }

    const nameLower = nameTrimmed.toLowerCase();
    const duplicate = (organizations ?? []).some(
      (org) => (org.organizationName ?? "").trim().toLowerCase() === nameLower,
    );
    if (duplicate) {
      setIsError("An organization with this name already exists.");
      return;
    }

    const user = sessionStorage.getItem("userId");
    const orgData = {
      isOrganizationName: nameTrimmed,
      user,
      organizationType,
      adminEmail: emailTrimmed,
    };
    const token = sessionStorage.getItem("bearerToken");

    setIsCreateLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/newOrganization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orgData),
      });
      const result = await response.json();
      if (response.ok) {
        closeNewOrg();
        setIsOrganizationName("");
        setOrganizationType("vendor");
        setAdminEmail("");
        toast.success("Organization created successfully");
        dispatch(getOrganizations());
        setIsError("");
      } else {
        setIsError(result.message ?? "Failed to create organization");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network or server error. Please try again.");
    } finally {
      setIsCreateLoading(false);
    }
  };

  return (
    <div
      className="profile_modal_overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create_org_modal_title"
      onClick={(e) => e.target === e.currentTarget && closeNewOrg()}
    >
      <div className="profile_modal_content settings_modal_content" onClick={(e) => e.stopPropagation()}>
        <div className="profile_modal_header">
          <h2 id="create_org_modal_title" className="profile_modal_title">
            Create Organization
          </h2>
          <button
            type="button"
            className="modal_close_btn"
            onClick={closeNewOrg}
            aria-label="Close"
          >
            <CircleX size={20} />
          </button>
        </div>
        <div className="profile_modal_body">
          <form action="" autoComplete="off" onSubmit={createOrg} className="settings_form">
            <div className="settings_form_row">
              <div className="settings_form_group">
                <label htmlFor="create_org_name">
                  <Landmark size={16} aria-hidden />
                  Organization Name
                </label>
                <input
                  id="create_org_name"
                  type="text"
                  className="settings_input"
                  value={isOrganizationName}
                  onChange={(e) => {
                    setIsOrganizationName(e.target.value);
                    if (isError) setIsError("");
                  }}
                />
              </div>
              <div className="settings_form_group">
                <label htmlFor="create_org_type">
                  <Tags size={16} aria-hidden />
                  Organization Type
                </label>
                <select
                  id="create_org_type"
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  className="settings_input settings_input_cursor_pointer"
                  aria-label="Organization type"
                >
                  <option value="vendor">Vendor</option>
                  <option value="buyer">Buyer</option>
                </select>
              </div>
            </div>
            <div className="settings_form_row">
              <div className="settings_form_group">
                <label htmlFor="create_org_admin_email">
                  <Mail size={16} aria-hidden />
                  Admin email
                </label>
                <input
                  id="create_org_admin_email"
                  type="email"
                  className="settings_input"
                  autoComplete="email"
                  placeholder="admin@company.com"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    if (isError) setIsError("");
                  }}
                />
              </div>
              <div className="settings_form_group">
                <label htmlFor="create_org_admin_role">
                  <Shield size={16} aria-hidden />
                  Role
                </label>
                <input
                  id="create_org_admin_role"
                  type="text"
                  className="settings_input settings_input_readonly"
                  value="Admin"
                  readOnly
                  disabled
                  aria-readonly="true"
                />
              </div>
            </div>
            {isError && <p className="settings_error">{isError}</p>}
            <div className="settings_form_actions">
              <button type="button" className="orgCancelBtn" onClick={closeNewOrg}>
                <Ban size={16} aria-hidden />
                Cancel
              </button>
              <button
                type="submit"
                className={`orgCreateBtn ${isCreateLoading || !canCreate ? "disabled_css" : ""}`}
                disabled={isCreateLoading || !canCreate}
                aria-busy={isCreateLoading}
              >
                <Plus size={16} aria-hidden />
                {isCreateLoading ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateOrganization;
