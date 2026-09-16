import { useEffect, useMemo, useState } from "react";
import { Archive, Ban, RotateCcw, Search, SquarePen, X } from "lucide-react";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import Button from "../../UI/Button";
import LoadingMessage from "../../UI/LoadingMessage";
import OrgNameWithLogo from "../../UI/OrgNameWithLogo";
import { orgControlDataTableStyles } from "../../../styles/dataTableStyles";
import { getApiBaseUrl } from "../../../utils/apiBaseUrl";
import "../Assessments/assessments.css";
import "../Organizations/organization.css";
import "../UserProfile/user_profile.css";
import "./controls.css";

const PLATFORM_ORG_ID = 1;

export type OrgConfigListItem = {
  id: number;
  organizationName: string;
  organizationStatus?: string;
};

type OrganizationConfigurationProps = {
  onOpenOrg: (org: OrgConfigListItem) => void;
};

function isArchivedStatus(status?: string): boolean {
  return String(status ?? "").trim().toLowerCase() === "archived";
}

function OrganizationConfiguration({ onOpenOrg }: OrganizationConfigurationProps) {
  const [data, setData] = useState<OrgConfigListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [statusScope, setStatusScope] = useState<"current" | "archived">("current");
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<OrgConfigListItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);

  const loadOrgs = () => {
    const token = sessionStorage.getItem("bearerToken");
    setLoading(true);
    return fetch(`${getApiBaseUrl()}/allOrganizations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        const result = (await res.json().catch(() => ({}))) as {
          data?: OrgConfigListItem[];
        };
        setData(res.ok && Array.isArray(result.data) ? result.data : []);
      })
      .catch(() => {
        setData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const token = sessionStorage.getItem("bearerToken");
    void fetch(`${getApiBaseUrl()}/allOrganizations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        const result = (await res.json().catch(() => ({}))) as {
          data?: OrgConfigListItem[];
        };
        if (cancelled) return;
        setData(res.ok && Array.isArray(result.data) ? result.data : []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const closeArchiveDialog = () => {
    if (archiveSubmitting) return;
    setArchiveTarget(null);
    setArchiveReason("");
  };

  const submitArchive = async () => {
    if (!archiveTarget) return;
    const reason = archiveReason.trim();
    if (!reason) return;
    const token = sessionStorage.getItem("bearerToken");
    if (!token) {
      toast.error("Please log in again.");
      return;
    }
    const restoring = isArchivedStatus(archiveTarget.organizationStatus);
    setArchiveSubmitting(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/archiveOrganization/${archiveTarget.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ archived: !restoring, reason }),
        },
      );
      const result = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(result.message || "Failed to update organization.");
        return;
      }
      toast.success(
        restoring ? "Organization restored to active." : "Organization archived.",
      );
      setArchiveTarget(null);
      setArchiveReason("");
      await loadOrgs();
    } catch {
      toast.error("Network or server error. Please try again.");
    } finally {
      setArchiveSubmitting(false);
    }
  };

  const rows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return (data ?? []).filter((org) => {
      if (!org?.organizationName) return false;
      const archived = isArchivedStatus(org.organizationStatus);
      if (statusScope === "archived" ? !archived : archived) return false;
      if (!q) return true;
      return `${org.id} ${org.organizationName}`.toLowerCase().includes(q);
    });
  }, [data, filterText, statusScope]);

  const columns = useMemo(
    () => [
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            ID
          </div>
        ),
        selector: (_row: OrgConfigListItem, index: number) => index + 1,
        cell: (_row: OrgConfigListItem, index: number) => (
          <div className="orgControlTable__idCell">{index + 1}</div>
        ),
        sortable: true,
        width: "100px",
        center: true,
      },
      {
        name: <div className="tableHeader">Organization Name</div>,
        selector: (row: OrgConfigListItem) => row.organizationName,
        cell: (row: OrgConfigListItem) => (
          <OrgNameWithLogo
            name={row.organizationName}
            id={row.id}
            onClick={() => {
              if (!isArchivedStatus(row.organizationStatus)) onOpenOrg(row);
            }}
          />
        ),
        sortable: true,
        grow: 2,
      },
      {
        name: <div className="tableHeader">Actions</div>,
        cell: (row: OrgConfigListItem) => {
          const archived = isArchivedStatus(row.organizationStatus);
          const canArchive = row.id !== PLATFORM_ORG_ID;
          return (
            <div className="user_table_actions">
              {!archived && (
                <button
                  type="button"
                  className="user_table_action_btn user_table_action_btn_icon"
                  onClick={() => onOpenOrg(row)}
                  title="Edit"
                  aria-label={`Edit ${row.organizationName}`}
                >
                  <SquarePen size={14} />
                </button>
              )}
              {canArchive && (
                <button
                  type="button"
                  className="user_table_action_btn user_table_action_btn_icon"
                  onClick={() => {
                    setArchiveTarget(row);
                    setArchiveReason("");
                  }}
                  title={archived ? "Restore" : "Archive"}
                  aria-label={
                    archived
                      ? `Restore ${row.organizationName}`
                      : `Archive ${row.organizationName}`
                  }
                >
                  {archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                </button>
              )}
            </div>
          );
        },
        ignoreRowClick: true,
        minWidth: "120px",
        width: "120px",
      },
    ],
    [onOpenOrg],
  );

  const restoring = isArchivedStatus(archiveTarget?.organizationStatus);

  return (
    <div className="org_settings_card team_members_card org_admin_ledger_card orgControlList">
      <div className="team_members_card_header">
        <div>
          <h2 className="org_settings_card_title">Organizations</h2>
          <p className="org_settings_card_subtitle">
            Open an organization to view usage stats and configure token quotas.
          </p>
        </div>
      </div>

      <div className="team_members_table_wrapper org_admin_table_shell">
        <div className="orgDataTable">
          <div className="assessments_ledger_toolbar org_organizations_toolbar">
            <div
              className="assessments_ledger_segmented assessments_ledger_segmented_inline"
              role="group"
              aria-label="Organization archive status"
            >
              <button
                type="button"
                className={
                  statusScope === "current"
                    ? "assessments_ledger_segment active"
                    : "assessments_ledger_segment"
                }
                onClick={() => {
                  setStatusScope("current");
                  setResetPaginationToggle((v) => !v);
                }}
              >
                Current
              </button>
              <button
                type="button"
                className={
                  statusScope === "archived"
                    ? "assessments_ledger_segment active"
                    : "assessments_ledger_segment"
                }
                onClick={() => {
                  setStatusScope("archived");
                  setResetPaginationToggle((v) => !v);
                }}
              >
                Archived
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
                id="org-control-search"
                className="assessments_ledger_search_input"
                placeholder="Search organizations…"
                aria-label="Search organizations"
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  setResetPaginationToggle((v) => !v);
                }}
              />
            </div>
          </div>

          {loading ? (
            <LoadingMessage message="Loading organizations…" />
          ) : (
            <DataTable
              customStyles={orgControlDataTableStyles as never}
              columns={columns}
              data={rows}
              pagination
              paginationResetDefaultPage={resetPaginationToggle}
              persistTableHead
              responsive={false}
              striped
              highlightOnHover={false}
              noDataComponent={
                <p className="orgControlEmpty">
                  {statusScope === "archived"
                    ? "No archived organizations."
                    : "No organizations found."}
                </p>
              }
            />
          )}
        </div>
      </div>

      {archiveTarget && (
        <div
          className="usersPage__overlay"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !archiveSubmitting) {
              closeArchiveDialog();
            }
          }}
        >
          <div
            className="usersPage__dialog orgAllocateDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-archive-title"
          >
            <div className="usersPage__dialogHead">
              <h2 id="org-archive-title" className="usersPage__dialogTitle">
                {restoring ? "Restore organization" : "Archive organization"}
              </h2>
              <button
                type="button"
                className="usersPage__dialogClose"
                onClick={closeArchiveDialog}
                disabled={archiveSubmitting}
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="usersPage__dialogBody">
              <p className="org_settings_card_subtitle" style={{ margin: 0 }}>
                {archiveTarget.organizationName}
              </p>
              <p className="org_settings_card_subtitle" style={{ margin: 0 }}>
                {restoring
                  ? "This restores the organization to active. Users and assessments are not changed."
                  : "Only this organization will be archived. Users and assessments stay as they are."}
              </p>
              <div className="settings_form_group" style={{ marginTop: "0.75rem" }}>
                <label htmlFor="org-archive-reason">Reason</label>
                <textarea
                  id="org-archive-reason"
                  className="settings_input"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Please provide a reason for this change…"
                  rows={3}
                  disabled={archiveSubmitting}
                  style={{ resize: "none", minHeight: "4rem", width: "100%" }}
                />
              </div>
            </div>
            <div className="usersPage__dialogActions">
              <Button
                type="button"
                className="orgCancelBtn"
                onClick={closeArchiveDialog}
                disabled={archiveSubmitting}
              >
                <Ban size={16} aria-hidden />
                Cancel
              </Button>
              <Button
                type="button"
                className="orgCreateBtn"
                onClick={() => void submitArchive()}
                disabled={archiveSubmitting || !archiveReason.trim()}
              >
                {restoring ? (
                  <>
                    <RotateCcw size={16} aria-hidden />
                    {archiveSubmitting ? "Restoring…" : "Restore"}
                  </>
                ) : (
                  <>
                    <Archive size={16} aria-hidden />
                    {archiveSubmitting ? "Archiving…" : "Archive"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationConfiguration;
