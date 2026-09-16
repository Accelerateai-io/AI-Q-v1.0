import { Eye, SquarePen, Search } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import DataTable from "react-data-table-component";
import { useAppDispatch, useAppSelector } from "../../../Context/hooks";
import { getOrganizations } from "../../../Context/OrganizationsData";
import LoadingMessage from "../../UI/LoadingMessage";
import OrgNameWithLogo from "../../UI/OrgNameWithLogo";
import EditOrganization from "./EditOrganization";
import { getOrganizationTypeDisplay } from "../../../utils/organizationTypeDisplay";
import { premiumDataTableStyles } from "../../../styles/dataTableStyles";
import "../Assessments/assessments.css";

const LOADER_MIN_MS = 1500;

const OrganizationDataTable = ({ openPreview, viewOnly = false }) => {
  const [filterText, setFilterText] = React.useState("");
  const [statusScope, setStatusScope] = useState<"active" | "inactive">("active");
  const [resetPaginationToggle, setResetPaginationToggle] =
    React.useState(false);
  const [loading, setLoading] = useState(true);
  const startTimeRef = useRef(null);

  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.organizations);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  useEffect(() => {
    dispatch(getOrganizations());
    startTimeRef.current = Date.now();
  }, [dispatch]);

  useEffect(() => {
    if (status === "succeeded" || status === "failed") {
      const start = startTimeRef.current ?? Date.now();
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, LOADER_MIN_MS - elapsed);
      const t = setTimeout(() => setLoading(false), remaining);
      return () => clearTimeout(t);
    }
    if (status === "loading") setLoading(true);
  }, [status]);

  useEffect(() => {
    setResetPaginationToggle((r) => !r);
  }, [statusScope]);

  const filteredItems = (data ?? []).filter((item) => {
    const statusLower = (item.organizationStatus ?? "").toLowerCase().trim();
    const matchesStatus =
      statusScope === "active"
        ? statusLower === "active"
        : statusLower !== "active";
    const name = item.organizationName ?? "";
    if (!name) return false;
    const matchesName = name.toLowerCase().includes(filterText.toLowerCase());
    return matchesStatus && matchesName;
  });

  const editOrg = (id) => {
    setIsEdit(true);
    setSelectedOrgId(id);
  };

  const customStyles = premiumDataTableStyles;

  const columns = [
    {
      name: (
        <div
          className="tableHeader"
          style={{ textAlign: "center", width: "100%" }}
        >
          SL.No
        </div>
      ),
      selector: (row, index) => index + 1,
      sortable: true,
      width: "200px",
      minWidth: "200px",
      center: true,
    },

    {
      name: <div className="tableHeader">Organization Name</div>,
      selector: (row) => row.organizationName ?? "",
      cell: (row) => (
        <OrgNameWithLogo
          name={row.organizationName}
          id={row.id}
          onClick={() => openPreview?.(row)}
        />
      ),
      sortable: true,
    },

    {
      name: <div className="tableHeader">Type</div>,
      selector: (row) => getOrganizationTypeDisplay(row),
      cell: (row) => (
        <div style={{ width: "100%", textAlign: "left" }}>
          <p style={{ textTransform: "none" }}>{getOrganizationTypeDisplay(row)}</p>
        </div>
      ),
      sortable: true,
    },

    {
      name: <div className="tableHeader">Status</div>,
      selector: (row) => row.organizationStatus ?? "",
      cell: (row) => {
        const status = (row.organizationStatus ?? "").toString().toLowerCase();
        const isActive = status === "active";
        const isArchived = status === "archived";
        return (
          <span
            className={`pill pill_status ${
              isActive
                ? "pill_status_active"
                : isArchived
                  ? "pill_status_archived"
                  : "pill_status_inactive"
            } pill_status_with_dot`}
          >
            <span className="pill_status_dot" aria-hidden />
            {isActive ? "Active" : isArchived ? "Archived" : "Inactive"}
          </span>
        );
      },
      sortable: true,
    },
    {
      name: <div className="tableHeader">Actions</div>,
      center: true,
      cell: (row) => (
        <div className="user_table_actions">
          <button
            type="button"
            className="user_table_action_btn user_table_action_btn_icon"
            onClick={() => openPreview?.(row)}
            title="View"
            aria-label="View organization details"
          >
            <Eye size={14} />
          </button>
          {!viewOnly && (
            <button
              type="button"
              className="user_table_action_btn user_table_action_btn_icon"
              onClick={() => editOrg(row.id)}
              title="Edit"
              aria-label="Edit organization"
            >
              <SquarePen size={14} />
            </button>
          )}
        </div>
      ),
      ignoreRowClick: true,
      minWidth: "120px",
      width: "120px",
    },
  ];
  const selectedOrg = data?.find((org) => org.id === selectedOrgId);

  return (
    <>
      <div className="orgDataTable">
        <div className="assessments_ledger_toolbar org_organizations_toolbar">
          <div
            className="assessments_ledger_segmented assessments_ledger_segmented_inline"
            role="group"
            aria-label="Organization status"
          >
            <button
              type="button"
              className={
                statusScope === "active"
                  ? "assessments_ledger_segment active"
                  : "assessments_ledger_segment"
              }
              onClick={() => setStatusScope("active")}
            >
              Active
            </button>
            <button
              type="button"
              className={
                statusScope === "inactive"
                  ? "assessments_ledger_segment active"
                  : "assessments_ledger_segment"
              }
              onClick={() => setStatusScope("inactive")}
            >
              Inactive
            </button>
          </div>
          <div className="assessments_ledger_search">
            <Search
              size={18}
              className="assessments_ledger_search_icon"
              aria-hidden
            />
            <input
              type="search"
              id="org-search"
              className="assessments_ledger_search_input"
              placeholder="Search organizations…"
              aria-label="Search organizations"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <LoadingMessage message="Loading organizations…" />
        ) : (
          <DataTable
            customStyles={customStyles}
            columns={columns}
            data={filteredItems}
            pagination
            paginationResetDefaultPage={resetPaginationToggle}
            selectableRows
            persistTableHead
            striped
            highlightOnHover={false}
          />
        )}
      </div>
      {isEdit && selectedOrg && (
        <EditOrganization
          id={selectedOrgId}
          orgData={selectedOrg}
          allOrganizations={data ?? []}
          setIsEdit={setIsEdit}
        />
      )}
    </>
  );
};

export default OrganizationDataTable;
