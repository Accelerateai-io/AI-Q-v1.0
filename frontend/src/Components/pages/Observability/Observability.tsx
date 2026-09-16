import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, RefreshCw, Search } from "lucide-react";
import DataTable from "react-data-table-component";
import Button from "../../UI/Button";
import LoadingMessage from "../../UI/LoadingMessage";
import { premiumDataTableStyles } from "../../../styles/dataTableStyles";
import {
  fetchLlmModelUsage,
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

function Observability() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LlmModelUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchLlmModelUsage();
    if (result.ok === false) {
      setRows([]);
      setError(result.message);
      setLoading(false);
      return;
    }
    setRows(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = "AI-Q | Observability";
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const filteredRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = `${row.id} ${row.modelId} ${row.modelName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [filterText, rows]);

  const summary = useMemo(() => {
    const totalModels = rows.length;
    const totalTokens = rows.reduce(
      (sum, row) => sum + (Number(row.totalTokens) || 0),
      0,
    );
    const totalCost = rows.reduce(
      (sum, row) => sum + (Number(row.estimatedCostUsd) || 0),
      0,
    );
    const totalInvokes = rows.reduce(
      (sum, row) => sum + (Number(row.invokeCount) || 0),
      0,
    );
    const invokeSeries = rows.map((row) => Number(row.invokeCount) || 0);
    const tokenSeries = rows.map((row) => Number(row.totalTokens) || 0);
    const costSeries = rows.map((row) => Number(row.estimatedCostUsd) || 0);
    return {
      totalModels,
      totalTokens,
      totalCost,
      totalInvokes,
      invokeSeries,
      tokenSeries,
      costSeries,
    };
  }, [rows]);

  const openModel = useCallback(
    (row: LlmModelUsageRow) => {
      navigate(`/observability/model/${encodeURIComponent(String(row.id))}`);
    },
    [navigate],
  );

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
        selector: (row: LlmModelUsageRow) => row.id,
        cell: (row: LlmModelUsageRow) => (
          <div className="observabilityPage__idCell">{row.id}</div>
        ),
        sortable: true,
        width: "100px",
        minWidth: "100px",
        center: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            Model Name
          </div>
        ),
        selector: (row: LlmModelUsageRow) => row.modelName,
        cell: (row: LlmModelUsageRow) => (
          <div className="observabilityPage__centerCell">
            <button
              type="button"
              className="observabilityPage__modelLink"
              title={row.modelName}
              onClick={() => openModel(row)}
            >
              {row.modelName}
            </button>
          </div>
        ),
        sortable: true,
        grow: 2,
        minWidth: "200px",
        center: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            Model ID
          </div>
        ),
        selector: (row: LlmModelUsageRow) => row.modelId,
        cell: (row: LlmModelUsageRow) => (
          <div className="observabilityPage__centerCell">
            <button
              type="button"
              className="observabilityPage__modelLink observabilityPage__modelLink--muted"
              title={row.modelId}
              onClick={() => openModel(row)}
            >
              {row.modelId}
            </button>
          </div>
        ),
        sortable: true,
        grow: 2,
        minWidth: "220px",
        center: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Tokens Consumed
          </div>
        ),
        selector: (row: LlmModelUsageRow) => row.totalTokens,
        cell: (row: LlmModelUsageRow) => (
          <div className="observabilityPage__numericCell">
            <p>{formatTokens(row.totalTokens)}</p>
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
        selector: (row: LlmModelUsageRow) => row.estimatedCostUsd,
        cell: (row: LlmModelUsageRow) => (
          <div className="observabilityPage__numericCell">
            <p>{formatUsd(row.estimatedCostUsd)}</p>
          </div>
        ),
        sortable: true,
        minWidth: "140px",
        right: true,
      },
    ],
    [openModel],
  );

  return (
    <div className="observabilityPage sec_user_page org_settings_page org_admin_page">
      <div className="org_settings_header page_header_align heading_user_page">
        <div className="org_settings_headers page_header_row">
          <span className="icon_size_header" aria-hidden>
            <Activity size={24} className="header_icon_svg" />
          </span>
          <div className="page_header_title_block">
            <h1 className="org_settings_title page_header_title">
              Observability
            </h1>
            <p className="org_settings_subtitle page_header_subtitle">
              Monitor model usage, token consumption, and estimated cost.
            </p>
          </div>
        </div>
      </div>

      <div className="observabilityStats" aria-label="Usage summary">
        <article className="observabilityStatCard">
          <div className="observabilityStatCard__body">
            <p className="observabilityStatCard__label">Total Models</p>
            <p className="observabilityStatCard__value">
              {formatTokens(summary.totalModels)}
            </p>
            <p className="observabilityStatCard__meta">
              {formatTokens(summary.totalInvokes)} invokes
            </p>
          </div>
          <ObservabilityMiniChart
            values={summary.invokeSeries}
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
            <p className="observabilityStatCard__meta">Across all models</p>
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
            <h2 className="org_settings_card_title">LLM Model Usage</h2>
            <p className="org_settings_card_subtitle">
              Token consumption and estimated generation cost by model.
            </p>
          </div>
          <Button
            className="invite_user_btn org_invite_btn"
            onClick={() => void loadUsage()}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Refresh
          </Button>
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
                  id="observability-model-search"
                  className="assessments_ledger_search_input"
                  placeholder="Search by model id or name…"
                  aria-label="Search model usage"
                  value={filterText}
                  onChange={(e) => {
                    setFilterText(e.target.value);
                    setResetPaginationToggle((v) => !v);
                  }}
                />
              </div>
            </div>

            {loading ? (
              <LoadingMessage message="Loading model usage…" />
            ) : error ? (
              <p className="observabilityPage__error" role="alert">
                {error}
              </p>
            ) : (
              <DataTable
                customStyles={premiumDataTableStyles}
                columns={columns}
                data={filteredRows}
                pagination
                paginationResetDefaultPage={resetPaginationToggle}
                persistTableHead
                striped
                highlightOnHover={false}
                noDataComponent={
                  <p className="observabilityPage__emptyText">
                    No model usage recorded yet. Usage appears after LLM
                    invokes (reports, scoring, or Controls model tests).
                  </p>
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Observability;
