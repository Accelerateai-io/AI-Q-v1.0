import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import DataTable from "react-data-table-component";
import Breadcrumbs from "../../UI/Breadcrumbs";
import LoadingMessage from "../../UI/LoadingMessage";
import { premiumDataTableStyles } from "../../../styles/dataTableStyles";
import {
  fetchLlmModelUsageById,
  fetchLlmModelUsageEvents,
  type LlmModelUsageEventRow,
  type LlmModelUsageRow,
} from "../../../utils/llmUsageApi";
import { ObservabilityMiniChart } from "./ObservabilityMiniChart";
import "../UserManagement/user_management.css";
import "../Organizations/organization.css";
import "../Assessments/assessments.css";
import "./observability.css";

function formatTokens(value: number): string {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return n.toLocaleString("en-US", {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
}

function formatUsd(value: number): string {
  const n = Number(value) || 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatEventDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ObservabilityModelDetail() {
  const navigate = useNavigate();
  const { usageId } = useParams<{ usageId: string }>();
  const [row, setRow] = useState<LlmModelUsageRow | null>(null);
  const [events, setEvents] = useState<LlmModelUsageEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = Number(usageId);
    if (!Number.isInteger(id) || id < 1) {
      setLoading(false);
      setError("Invalid model usage id.");
      return;
    }

    setLoading(true);
    setError("");
    void (async () => {
      const [usageResult, eventsResult] = await Promise.all([
        fetchLlmModelUsageById(id),
        fetchLlmModelUsageEvents(id),
      ]);
      if (cancelled) return;

      if (usageResult.ok === false) {
        setRow(null);
        setEvents([]);
        setError(usageResult.message);
        setLoading(false);
        return;
      }

      setRow(usageResult.data);
      if (eventsResult.ok === false) {
        setEvents([]);
        setError(eventsResult.message);
      } else {
        setEvents(eventsResult.data);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [usageId]);

  useEffect(() => {
    const label = row?.modelName?.trim() || "Model details";
    document.title = `AI-Q | ${label}`;
  }, [row?.modelName]);

  const breadcrumbItems = useMemo(
    () => [
      { label: "Observability", path: "/observability" },
      row?.modelName?.trim() || "Model details",
    ],
    [row?.modelName],
  );

  const filteredEvents = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => {
      const haystack =
        `${event.id} ${event.organizationName} ${event.orgUser} ${event.date}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [events, filterText]);

  const summary = useMemo(() => {
    const totalEvents = events.length;
    const totalTokens = events.reduce(
      (sum, event) => sum + (Number(event.totalTokens) || 0),
      0,
    );
    const totalCost = events.reduce(
      (sum, event) => sum + (Number(event.estimatedCostUsd) || 0),
      0,
    );
    // Events are newest-first; reverse for chronological sparklines.
    const chronological = [...events].reverse();
    const eventSeries = chronological.map(() => 1);
    const tokenSeries = chronological.map(
      (event) => Number(event.totalTokens) || 0,
    );
    const costSeries = chronological.map(
      (event) => Number(event.estimatedCostUsd) || 0,
    );
    return {
      totalEvents,
      totalTokens,
      totalCost,
      eventSeries,
      tokenSeries,
      costSeries,
    };
  }, [events]);

  const columns = useMemo(
    () => [
      {
        name: (
          <div
            className="tableHeader"
            style={{ textAlign: "center", width: "100%" }}
          >
            S.No
          </div>
        ),
        selector: (event: LlmModelUsageEventRow) => event.id,
        cell: (event: LlmModelUsageEventRow) => (
          <div className="observabilityPage__idCell">{event.id}</div>
        ),
        sortable: true,
        width: "100px",
        minWidth: "100px",
        center: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            Date
          </div>
        ),
        selector: (event: LlmModelUsageEventRow) => event.date,
        cell: (event: LlmModelUsageEventRow) => (
          <div className="observabilityPage__centerCell">
            <p>{formatEventDate(event.date)}</p>
          </div>
        ),
        sortable: true,
        minWidth: "170px",
        center: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            Organization Name
          </div>
        ),
        selector: (event: LlmModelUsageEventRow) => event.organizationName,
        cell: (event: LlmModelUsageEventRow) => (
          <div className="observabilityPage__centerCell">
            <p>{event.organizationName}</p>
          </div>
        ),
        sortable: true,
        grow: 2,
        minWidth: "180px",
        center: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            Org User
          </div>
        ),
        selector: (event: LlmModelUsageEventRow) => event.orgUser,
        cell: (event: LlmModelUsageEventRow) => (
          <div className="observabilityPage__centerCell">
            <p>{event.orgUser}</p>
          </div>
        ),
        sortable: true,
        minWidth: "140px",
        center: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Tokens Consumed
          </div>
        ),
        selector: (event: LlmModelUsageEventRow) => event.totalTokens,
        cell: (event: LlmModelUsageEventRow) => (
          <div className="observabilityPage__numericCell">
            <p>{formatTokens(event.totalTokens)}</p>
          </div>
        ),
        sortable: true,
        minWidth: "150px",
        right: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Estimated Cost
          </div>
        ),
        selector: (event: LlmModelUsageEventRow) => event.estimatedCostUsd,
        cell: (event: LlmModelUsageEventRow) => (
          <div className="observabilityPage__numericCell">
            <p>{formatUsd(event.estimatedCostUsd)}</p>
          </div>
        ),
        sortable: true,
        minWidth: "140px",
        right: true,
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="observabilityDetailPage sec_user_page org_settings_page org_admin_page">
        <Breadcrumbs items={breadcrumbItems} />
        <LoadingMessage message="Loading model usage…" />
      </div>
    );
  }

  if (error && !row) {
    return (
      <div className="observabilityDetailPage sec_user_page org_settings_page org_admin_page">
        <Breadcrumbs items={breadcrumbItems} />
        <p className="observabilityPage__error" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="invite_user_btn org_invite_btn"
          onClick={() => navigate("/observability")}
        >
          Back to Observability
        </button>
      </div>
    );
  }

  if (!row) {
    return null;
  }

  return (
    <div className="observabilityDetailPage sec_user_page org_settings_page org_admin_page">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="observabilityStats" aria-label="Model usage summary">
        <article className="observabilityStatCard">
          <div className="observabilityStatCard__body">
            <p className="observabilityStatCard__label">Events</p>
            <p className="observabilityStatCard__value">
              {formatTokens(summary.totalEvents)}
            </p>
            <p className="observabilityStatCard__meta">For this model</p>
          </div>
          <ObservabilityMiniChart
            values={summary.eventSeries}
            tone="blue"
            variant="bars"
          />
        </article>
        <article className="observabilityStatCard">
          <div className="observabilityStatCard__body">
            <p className="observabilityStatCard__label">Tokens Consumed</p>
            <p className="observabilityStatCard__value">
              {formatTokens(summary.totalTokens)}
            </p>
            <p className="observabilityStatCard__meta" title={row.modelId}>
              {row.modelId}
            </p>
          </div>
          <ObservabilityMiniChart
            values={summary.tokenSeries}
            tone="green"
            variant="area"
          />
        </article>
        <article className="observabilityStatCard">
          <div className="observabilityStatCard__body">
            <p className="observabilityStatCard__label">Estimated Cost</p>
            <p className="observabilityStatCard__value">
              {formatUsd(summary.totalCost)}
            </p>
            <p className="observabilityStatCard__meta">
              Approximate Bedrock pricing
            </p>
          </div>
          <ObservabilityMiniChart
            values={summary.costSeries}
            tone="amber"
            variant="bars"
          />
        </article>
      </div>

      <div className="org_settings_card team_members_card org_admin_ledger_card">
        <div className="team_members_card_header">
          <div>
            <h2 className="org_settings_card_title">{row.modelName}</h2>
            <p className="org_settings_card_subtitle">
              Per-user token usage and estimated cost for this model.
            </p>
          </div>
        </div>

        <div className="team_members_table_wrapper org_admin_table_shell">
          <div className="orgDataTable">
            <div className="assessments_ledger_toolbar org_organizations_toolbar">
              <div className="assessments_ledger_search">
                <Search
                  size={18}
                  className="assessments_ledger_search_icon"
                  aria-hidden
                />
                <input
                  type="search"
                  id="observability-event-search"
                  className="assessments_ledger_search_input"
                  placeholder="Search by organization or user…"
                  aria-label="Search usage events"
                  value={filterText}
                  onChange={(e) => {
                    setFilterText(e.target.value);
                    setResetPaginationToggle((v) => !v);
                  }}
                />
              </div>
            </div>

            {error ? (
              <p className="observabilityPage__error" role="alert">
                {error}
              </p>
            ) : null}

            <DataTable
              customStyles={premiumDataTableStyles}
              columns={columns}
              data={filteredEvents}
              pagination
              paginationResetDefaultPage={resetPaginationToggle}
              persistTableHead
              striped
              highlightOnHover={false}
              noDataComponent={
                <p className="observabilityPage__emptyText">
                  No per-user usage events recorded for this model yet.
                </p>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ObservabilityModelDetail;
