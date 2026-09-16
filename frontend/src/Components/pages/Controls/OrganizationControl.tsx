import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  BarChart3,
  ClipboardList,
  Coins,
  FileCheck,
  FileText,
  History,
  Layers,
  LayoutGrid,
  MessageSquare,
  Save,
  Search,
  Settings2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import Breadcrumbs from "../../UI/Breadcrumbs";
import Button from "../../UI/Button";
import LoadingMessage from "../../UI/LoadingMessage";
import { premiumDataTableStyles } from "../../../styles/dataTableStyles";
import {
  fetchOrgTokenConfig,
  fetchOrgUsage,
  formatAllocatedAt,
  formatTokenCount,
  formatTokenPreset,
  formatUsd,
  ORG_CONTROL_FEATURE_LABELS,
  ORG_CONTROL_FEATURES,
  ORG_TOKEN_PRESETS,
  saveOrgTokenConfig,
  type OrgControlFeature,
  type OrgTokenConfigPayload,
  type OrgTokenUserRow,
  type OrgUsagePayload,
} from "../../../utils/orgControlsApi";
import { OrgUsageChart } from "./OrgUsageChart";
import { ObservabilityMiniChart } from "../Observability/ObservabilityMiniChart";
import type { OrgConfigListItem } from "./OrganizationConfiguration";
import "../UserManagement/user_management.css";
import "../Organizations/organization.css";
import "../Assessments/assessments.css";
import "../Observability/observability.css";
import "../../../styles/page_tabs.css";

type OrganizationControlProps = {
  org: OrgConfigListItem;
  onBack: () => void;
  onControls: () => void;
};

type OrgControlTab = "stats" | "config";
type TokenMode = "input" | "output";
type AllocateDialogTab = "allocate" | "history";

function TokenAmountInput({
  value,
  onChange,
  onFocus,
  ariaLabel,
  className,
  emptyWhenZero = false,
}: {
  value: number;
  onChange: (next: number) => void;
  onFocus?: () => void;
  ariaLabel: string;
  className: string;
  emptyWhenZero?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      value={
        focused
          ? draft === ""
            ? ""
            : formatTokenCount(Number(draft) || 0)
          : value > 0
            ? formatTokenCount(value)
            : emptyWhenZero
              ? ""
              : formatTokenCount(value)
      }
      onFocus={() => {
        setFocused(true);
        setDraft(value > 0 ? String(value) : "");
        onFocus?.();
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
        setDraft(digits);
        onChange(digits === "" ? 0 : Number(digits));
      }}
      onBlur={() => setFocused(false)}
    />
  );
}

const FEATURE_ICONS = {
  attestation: FileCheck,
  assessment: ClipboardList,
  sales_agent: MessageSquare,
  reports: FileText,
} as const;

type OrgStatsCategory = "all" | OrgControlFeature;

const STATS_CATEGORIES: OrgStatsCategory[] = ["all", ...ORG_CONTROL_FEATURES];

const STATS_CATEGORY_LABELS: Record<OrgStatsCategory, string> = {
  all: "All",
  ...ORG_CONTROL_FEATURE_LABELS,
};

const STATS_CATEGORY_ICONS = {
  all: LayoutGrid,
  ...FEATURE_ICONS,
} as const;

function UserNameEmailCell({
  name,
  email,
}: {
  name: string;
  email?: string | null;
}) {
  const displayName = name?.trim() || "—";
  const displayEmail = email?.trim() || "";
  return (
    <div className="orgControlUserCell">
      <span className="orgControlUserCell__name">{displayName}</span>
      {displayEmail ? (
        <a
          href={`mailto:${displayEmail}`}
          className="orgControlUserCell__email"
        >
          {displayEmail}
        </a>
      ) : (
        <span className="orgControlUserCell__email orgControlUserCell__email--empty">
          —
        </span>
      )}
    </div>
  );
}

function AllocateTokensDialog({
  orgId,
  user,
  initialFeature,
  onClose,
  onSaved,
}: {
  orgId: number;
  user: { userId: number; userName: string; email: string };
  initialFeature?: OrgControlFeature;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [feature, setFeature] = useState<OrgControlFeature>(
    initialFeature ?? "attestation",
  );
  const [tokenMode, setTokenMode] = useState<TokenMode>("input");
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [config, setConfig] = useState<OrgTokenConfigPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogTab, setDialogTab] = useState<AllocateDialogTab>("allocate");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      const result = await fetchOrgTokenConfig(orgId);
      if (cancelled) return;
      if (result.ok === false) {
        setError(result.message);
        setLoading(false);
        return;
      }
      setConfig(result.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    setInputTokens(0);
    setOutputTokens(0);
  }, [feature]);

  const currentUser = config?.users.find((item) => item.userId === user.userId);
  const currentAllocation = currentUser?.allocations[feature];
  const currentInput = currentAllocation?.inputTokens ?? 0;
  const currentOutput = currentAllocation?.outputTokens ?? 0;
  const history = (currentUser?.allocationHistory ?? []).filter(
    (item) => item.feature === feature,
  );

  const canAllocate = inputTokens > 0 && outputTokens > 0;

  const applyPreset = (amount: number) => {
    if (tokenMode === "input") setInputTokens(amount);
    else setOutputTokens(amount);
  };

  const save = async () => {
    if (!config) return;
    if (inputTokens <= 0 || outputTokens <= 0) {
      toast.error("Enter both input and output tokens before allocating.");
      return;
    }
    setSaving(true);
    const result = await saveOrgTokenConfig(orgId, {
      feature,
      inputTokenQuota: inputTokens,
      outputTokenQuota: outputTokens,
      users: [{ userId: user.userId, inputTokens, outputTokens }],
    });
    setSaving(false);
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    toast.success(
      `Added ${formatTokenPreset(inputTokens)} input and ${formatTokenPreset(outputTokens)} output tokens to ${user.userName}.`,
    );
    onSaved();
    onClose();
  };

  return (
    <div
      className="usersPage__overlay"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="usersPage__dialog orgAllocateDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="usersPage__dialogHead orgAllocateDialog__head">
          <div className="orgAllocateDialog__headText">
            <h2 id={titleId} className="usersPage__dialogTitle">
              Allocate tokens
            </h2>
            <p className="orgAllocateDialog__user">
              <span>{user.userName}</span>
              {user.email.trim() ? (
                <>
                  <span className="orgAllocateDialog__userDot" aria-hidden>
                    ·
                  </span>
                  <span>{user.email.trim()}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            className="usersPage__dialogClose"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
        {loading || error ? null : (
          <div
            className="page_tabs orgAllocateDialog__tabs"
            role="tablist"
            aria-label="Allocate tokens"
          >
            <button
              type="button"
              role="tab"
              id={`${titleId}-tab-allocate`}
              aria-selected={dialogTab === "allocate"}
              aria-controls={`${titleId}-panel-allocate`}
              className={`page_tab ${dialogTab === "allocate" ? "page_tab_active" : ""}`}
              onClick={() => setDialogTab("allocate")}
            >
              <Coins size={15} />
              Allocate
            </button>
            <button
              type="button"
              role="tab"
              id={`${titleId}-tab-history`}
              aria-selected={dialogTab === "history"}
              aria-controls={`${titleId}-panel-history`}
              className={`page_tab ${dialogTab === "history" ? "page_tab_active" : ""}`}
              onClick={() => setDialogTab("history")}
            >
              <History size={15} />
              History
            </button>
          </div>
        )}
        <div className="usersPage__dialogBody orgAllocateDialog__body">
          {loading ? (
            <LoadingMessage message="Loading current allocation…" />
          ) : error ? (
            <p className="orgControlError" role="alert">
              {error}
            </p>
          ) : (
            <>
              <label className="orgAllocateDialog__feature" htmlFor={`${titleId}-feature`}>
                <span>Feature</span>
                <select
                  id={`${titleId}-feature`}
                  value={feature}
                  onChange={(e) =>
                    setFeature(e.target.value as OrgControlFeature)
                  }
                >
                  {ORG_CONTROL_FEATURES.map((item) => (
                    <option key={item} value={item}>
                      {ORG_CONTROL_FEATURE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
              {dialogTab === "allocate" ? (
                <div
                  role="tabpanel"
                  id={`${titleId}-panel-allocate`}
                  aria-labelledby={`${titleId}-tab-allocate`}
                  className="orgAllocateDialog__panel"
                >
                  <div className="orgAllocateStats" aria-label="Current allocation">
                    <div className="orgAllocateStats__item">
                      <span>Input</span>
                      <strong>{formatTokenCount(currentInput)}</strong>
                    </div>
                    <div className="orgAllocateStats__item">
                      <span>Output</span>
                      <strong>{formatTokenCount(currentOutput)}</strong>
                    </div>
                    <div className="orgAllocateStats__item">
                      <span>Total</span>
                      <strong>
                        {formatTokenCount(currentInput + currentOutput)}
                      </strong>
                    </div>
                  </div>
                  <div className="orgAllocateDialog__quotas">
                    <label
                      className={`orgAllocateField ${
                        tokenMode === "input" ? "orgAllocateField--active" : ""
                      }`}
                    >
                      <span className="orgAllocateField__label">
                        <ArrowDownToLine size={14} strokeWidth={2} aria-hidden />
                        Add input
                      </span>
                      <TokenAmountInput
                        className="orgAllocateField__input"
                        ariaLabel="Input tokens to add"
                        emptyWhenZero
                        value={inputTokens}
                        onFocus={() => setTokenMode("input")}
                        onChange={setInputTokens}
                      />
                    </label>
                    <label
                      className={`orgAllocateField ${
                        tokenMode === "output" ? "orgAllocateField--active" : ""
                      }`}
                    >
                      <span className="orgAllocateField__label">
                        <ArrowUpFromLine size={14} strokeWidth={2} aria-hidden />
                        Add output
                      </span>
                      <TokenAmountInput
                        className="orgAllocateField__input"
                        ariaLabel="Output tokens to add"
                        emptyWhenZero
                        value={outputTokens}
                        onFocus={() => setTokenMode("output")}
                        onChange={setOutputTokens}
                      />
                    </label>
                  </div>
                  <div className="orgAllocateDialog__presets" role="group" aria-label="Token presets">
                    <p className="orgAllocateDialog__presetsLabel">
                      Preset {tokenMode === "input" ? "input" : "output"}
                    </p>
                    <div className="orgAllocateDialog__presetsRow">
                      {ORG_TOKEN_PRESETS.map((amount) => {
                        const selected =
                          tokenMode === "input" ? inputTokens : outputTokens;
                        return (
                          <button
                            key={amount}
                            type="button"
                            className={`orgAllocateDialog__preset ${
                              selected === amount
                                ? "orgAllocateDialog__preset--active"
                                : ""
                            }`}
                            onClick={() => applyPreset(amount)}
                          >
                            {formatTokenPreset(amount)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {inputTokens > 0 || outputTokens > 0 ? (
                    <p className="orgAllocatePreview">
                      After this grant:{" "}
                      {formatTokenCount(currentInput + inputTokens)} input ·{" "}
                      {formatTokenCount(currentOutput + outputTokens)} output ·{" "}
                      {formatTokenCount(
                        currentInput + currentOutput + inputTokens + outputTokens,
                      )}{" "}
                      total
                    </p>
                  ) : null}
                </div>
              ) : (
                <div
                  role="tabpanel"
                  id={`${titleId}-panel-history`}
                  aria-labelledby={`${titleId}-tab-history`}
                  className="orgAllocateHistory"
                >
                  {history.length === 0 ? (
                    <div className="orgAllocateHistory__empty">
                      <History size={20} strokeWidth={1.75} aria-hidden />
                      <p>No allocations yet for this feature.</p>
                    </div>
                  ) : (
                    <div className="orgAllocateHistory__tableWrap">
                      <table className="orgAllocateHistory__table">
                        <thead>
                          <tr>
                            <th>Date and time</th>
                            <th>Input</th>
                            <th>Output</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item) => (
                            <tr key={item.id}>
                              <td>{formatAllocatedAt(item.allocatedAt)}</td>
                              <td>{formatTokenCount(item.inputTokens)}</td>
                              <td>{formatTokenCount(item.outputTokens)}</td>
                              <td>
                                {formatTokenCount(
                                  item.inputTokens + item.outputTokens,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="usersPage__dialogActions orgAllocateDialog__actions">
          <Button
            type="button"
            className="orgCancelBtn"
            onClick={onClose}
            disabled={saving}
          >
            {dialogTab === "history" ? (
              <>
                <X size={16} aria-hidden />
                Close
              </>
            ) : (
              <>
                <Ban size={16} aria-hidden />
                Cancel
              </>
            )}
          </Button>
          {dialogTab === "allocate" ? (
            <Button
              type="button"
              className="orgCreateBtn"
              onClick={() => void save()}
              disabled={loading || saving || Boolean(error) || !canAllocate}
            >
              <Coins size={16} aria-hidden />
              {saving ? "Saving…" : "Allocate"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

// function yearBounds(year: number): { from: string; to: string } {
//   const current = new Date().getUTCFullYear();
//   const from = `${year}-01-01`;
//   const to = year === current ? isoToday() : `${year}-12-31`;
//   return { from, to };
// }

function emptyUsageSummary() {
  return {
    tokenConsumption: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    totalUsers: 0,
  };
}

function selectUsageSlice(
  payload: OrgUsagePayload | null,
  category: OrgStatsCategory,
) {
  const empty = {
    summary: emptyUsageSummary(),
    series: [] as OrgUsagePayload["series"],
    rows: [] as OrgUsagePayload["rows"],
  };
  if (!payload) return empty;
  if (category === "all") {
    return {
      summary: payload.summary ?? emptyUsageSummary(),
      series: payload.series ?? [],
      rows: payload.rows ?? [],
    };
  }
  const features = payload.features;
  const slice =
    features?.[category] ??
    (features
      ? Object.values(features).find((item) => item?.feature === category)
      : undefined);
  if (!slice) return empty;
  return {
    summary: slice.summary ?? emptyUsageSummary(),
    series: slice.series ?? [],
    rows: slice.rows ?? [],
  };
}

function OrganizationStatsPanel({
  org,
  idPrefix,
}: {
  org: OrgConfigListItem;
  idPrefix: string;
}) {
  const [category, setCategory] = useState<OrgStatsCategory>("all");
  const [from, setFrom] = useState(isoDaysAgo(29));
  const [to, setTo] = useState(isoToday());
  // const [year, setYear] = useState("");
  const [appliedFrom, setAppliedFrom] = useState(isoDaysAgo(29));
  const [appliedTo, setAppliedTo] = useState(isoToday());
  const [payload, setPayload] = useState<OrgUsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);

  // const years = useMemo(() => {
  //   const current = new Date().getUTCFullYear();
  //   return Array.from({ length: 6 }, (_, i) => current - i);
  // }, []);

  const applyFilters = useCallback(() => {
    setAppliedFrom(from);
    setAppliedTo(to);
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      const result = await fetchOrgUsage(org.id, appliedFrom, appliedTo);
      if (cancelled) return;
      if (result.ok === false) {
        setPayload(null);
        setError(result.message);
        setLoading(false);
        return;
      }
      setPayload(result.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [org.id, appliedFrom, appliedTo]);

  const usageView = useMemo(
    () => selectUsageSlice(payload, category),
    [category, payload],
  );

  const filteredRows = useMemo(() => {
    const rows = usageView.rows;
    const q = filterText.trim().toLowerCase();
    const matched = q
      ? rows.filter((row) =>
          `${row.userId ?? ""} ${row.userName} ${row.email}`
            .toLowerCase()
            .includes(q),
        )
      : rows;
    return [...matched]
      .sort((a, b) => {
        if (b.consumedTokens !== a.consumedTokens) {
          return b.consumedTokens - a.consumedTokens;
        }
        const bUsed = b.inputTokens + b.outputTokens;
        const aUsed = a.inputTokens + a.outputTokens;
        if (bUsed !== aUsed) return bUsed - aUsed;
        return a.userName.localeCompare(b.userName);
      })
      .map((row) => ({
        ...row,
        rowKey:
          row.userId != null ? `id:${row.userId}` : `unknown:${row.userName}`,
      }));
  }, [filterText, usageView.rows]);

  const consumptionRankByKey = useMemo(() => {
    const ranks = new Map<string, number>();
    filteredRows.forEach((row, index) => {
      const key =
        row.userId != null ? `id:${row.userId}` : `unknown:${row.userName}`;
      ranks.set(key, index + 1);
    });
    return ranks;
  }, [filteredRows]);

  const summary = usageView.summary;
  const series = usageView.series;
  const labels = series.map((p) => p.date);
  const tokenSeries = series.map((p) => p.tokens);
  const inputSeries = series.map((p) => p.inputTokens);
  const outputSeries = series.map((p) => p.outputTokens);
  const costSeries = series.map((p) => p.estimatedCostUsd);
  const categoryLabel = STATS_CATEGORY_LABELS[category];
  const usageScopeLabel = category === "all" ? "all features" : categoryLabel.toLowerCase();

  const columns = useMemo(
    () => [
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            ID
          </div>
        ),
        selector: (row: OrgUsagePayload["rows"][number]) => {
          const key =
            row.userId != null ? `id:${row.userId}` : `unknown:${row.userName}`;
          return consumptionRankByKey.get(key) ?? 0;
        },
        cell: (row: OrgUsagePayload["rows"][number]) => {
          const key =
            row.userId != null ? `id:${row.userId}` : `unknown:${row.userName}`;
          return (
            <div className="orgControlTable__idCell">
              {consumptionRankByKey.get(key) ?? "—"}
            </div>
          );
        },
        sortable: true,
        width: "90px",
        center: true,
      },
      {
        name: <div className="tableHeader">Name</div>,
        selector: (row: OrgUsagePayload["rows"][number]) => row.userName,
        cell: (row: OrgUsagePayload["rows"][number]) => (
          <UserNameEmailCell name={row.userName} email={row.email} />
        ),
        sortable: true,
        grow: 1.6,
        minWidth: "180px",
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Total tokens allocated
          </div>
        ),
        selector: (row: OrgUsagePayload["rows"][number]) => row.allocatedTokens,
        cell: (row: OrgUsagePayload["rows"][number]) => (
          <div className="orgControlTable__numeric">
            {formatTokenCount(row.allocatedTokens)}
          </div>
        ),
        sortable: true,
        minWidth: "160px",
        right: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Input tokens
          </div>
        ),
        selector: (row: OrgUsagePayload["rows"][number]) => row.inputTokens,
        cell: (row: OrgUsagePayload["rows"][number]) => (
          <div className="orgControlTable__numeric">
            {formatTokenCount(row.inputTokens)}
          </div>
        ),
        sortable: true,
        minWidth: "130px",
        right: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Output tokens
          </div>
        ),
        selector: (row: OrgUsagePayload["rows"][number]) => row.outputTokens,
        cell: (row: OrgUsagePayload["rows"][number]) => (
          <div className="orgControlTable__numeric">
            {formatTokenCount(row.outputTokens)}
          </div>
        ),
        sortable: true,
        minWidth: "140px",
        right: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Cost
          </div>
        ),
        selector: (row: OrgUsagePayload["rows"][number]) => row.estimatedCostUsd,
        cell: (row: OrgUsagePayload["rows"][number]) => (
          <div className="orgControlTable__numeric">
            {formatUsd(row.estimatedCostUsd)}
          </div>
        ),
        sortable: true,
        minWidth: "110px",
        right: true,
      },
      {
        id: "consumedTokens",
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Consumed tokens
          </div>
        ),
        selector: (row: OrgUsagePayload["rows"][number]) => row.consumedTokens,
        cell: (row: OrgUsagePayload["rows"][number]) => (
          <div className="orgControlTable__numeric">
            {formatTokenCount(row.consumedTokens)}
          </div>
        ),
        sortable: true,
        minWidth: "150px",
        right: true,
      },
    ],
    [category, consumptionRankByKey],
  );

  return (
    <div className="orgControlStats">
      <section className="orgControlCategories" aria-label="Usage categories">
        <div className="orgControlCategories__head">
          <span className="orgControlCategories__headIcon" aria-hidden>
            <Layers size={18} strokeWidth={2} />
          </span>
          <div className="orgControlCategories__headText">
            <h2 className="orgControlCategories__title">Categories</h2>
            <p className="orgControlCategories__hint">
              Token usage is shown for the selected category.
            </p>
          </div>
        </div>
        <div className="orgControlCategories__pills" role="group" aria-label="Usage categories">
          {STATS_CATEGORIES.map((item) => {
            const Icon = STATS_CATEGORY_ICONS[item];
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                className={`orgControlCategories__pill ${
                  active ? "orgControlCategories__pill--active" : ""
                }`}
                aria-pressed={active}
                onClick={() => {
                  setCategory(item);
                  setResetPaginationToggle((v) => !v);
                }}
              >
                <span className="orgControlCategories__pillIcon" aria-hidden>
                  <Icon size={15} strokeWidth={2} />
                </span>
                <span className="orgControlCategories__pillLabel">
                  {STATS_CATEGORY_LABELS[item]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div
        key={`cards-${category}`}
        className="orgControlStats__cards"
        aria-label={`${categoryLabel} usage summary`}
      >
        <article className="orgControlStat">
          <div className="orgControlStat__top">
            <span className="orgControlStat__icon" aria-hidden>
              <Coins size={16} strokeWidth={2} />
            </span>
            <p className="orgControlStat__label">Token consumption</p>
          </div>
          <div className="orgControlStat__row">
            <div className="orgControlStat__copy">
              <p className="orgControlStat__value">
                {formatTokenCount(summary.tokenConsumption)}
              </p>
              <p className="orgControlStat__meta">
                Total {usageScopeLabel} tokens used
              </p>
            </div>
            <ObservabilityMiniChart
              values={tokenSeries}
              tone="blue"
              variant="area"
            />
          </div>
        </article>
        <article className="orgControlStat">
          <div className="orgControlStat__top">
            <span className="orgControlStat__icon" aria-hidden>
              <ArrowDownToLine size={16} strokeWidth={2} />
            </span>
            <p className="orgControlStat__label">Input tokens</p>
          </div>
          <div className="orgControlStat__row">
            <div className="orgControlStat__copy">
              <p className="orgControlStat__value">
                {formatTokenCount(summary.inputTokens)}
              </p>
              <p className="orgControlStat__meta">Prompt tokens</p>
            </div>
            <ObservabilityMiniChart
              values={inputSeries}
              tone="blue"
              variant="bars"
            />
          </div>
        </article>
        <article className="orgControlStat">
          <div className="orgControlStat__top">
            <span className="orgControlStat__icon" aria-hidden>
              <ArrowUpFromLine size={16} strokeWidth={2} />
            </span>
            <p className="orgControlStat__label">Output tokens</p>
          </div>
          <div className="orgControlStat__row">
            <div className="orgControlStat__copy">
              <p className="orgControlStat__value">
                {formatTokenCount(summary.outputTokens)}
              </p>
              <p className="orgControlStat__meta">Completion tokens</p>
            </div>
            <ObservabilityMiniChart
              values={outputSeries}
              tone="green"
              variant="bars"
            />
          </div>
        </article>
        <article className="orgControlStat">
          <div className="orgControlStat__top">
            <span className="orgControlStat__icon" aria-hidden>
              <Wallet size={16} strokeWidth={2} />
            </span>
            <p className="orgControlStat__label">Est. cost</p>
          </div>
          <div className="orgControlStat__row">
            <div className="orgControlStat__copy">
              <p className="orgControlStat__value">
                {formatUsd(summary.estimatedCostUsd)}
              </p>
              <p className="orgControlStat__meta">Approximate Bedrock pricing</p>
            </div>
            <ObservabilityMiniChart
              values={costSeries}
              tone="amber"
              variant="area"
            />
          </div>
        </article>
        <article className="orgControlStat">
          <div className="orgControlStat__top">
            <span className="orgControlStat__icon" aria-hidden>
              <Users size={16} strokeWidth={2} />
            </span>
            <p className="orgControlStat__label">Total users</p>
          </div>
          <div className="orgControlStat__row">
            <div className="orgControlStat__copy">
              <p className="orgControlStat__value">
                {formatTokenCount(summary.totalUsers)}
              </p>
              <p className="orgControlStat__meta">In this organization</p>
            </div>
          </div>
        </article>
      </div>

      <div className="orgControlFilters">
        <label className="orgControlFilters__field" htmlFor={`${idPrefix}-from`}>
          <span>From date</span>
          <input
            id={`${idPrefix}-from`}
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              // setYear("");
            }}
          />
        </label>
        <label className="orgControlFilters__field" htmlFor={`${idPrefix}-to`}>
          <span>To date</span>
          <input
            id={`${idPrefix}-to`}
            type="date"
            value={to}
            min={from}
            max={isoToday()}
            onChange={(e) => {
              setTo(e.target.value);
              // setYear("");
            }}
          />
        </label>
        {/* <label className="orgControlFilters__field" htmlFor={`${idPrefix}-year`}>
          <span>Year</span>
          <select
            id={`${idPrefix}-year`}
            value={year}
            onChange={(e) => {
              const next = e.target.value;
              setYear(next);
              if (!next) {
                setFrom(isoDaysAgo(29));
                setTo(isoToday());
                return;
              }
              const bounds = yearBounds(Number(next));
              setFrom(bounds.from);
              setTo(bounds.to);
            }}
          >
            <option value="">Last 30 days</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label> */}
        <button
          type="button"
          className="orgControlFilters__apply"
          onClick={applyFilters}
        >
          Apply
        </button>
      </div>

      {loading ? (
        <LoadingMessage message="Loading organization usage…" />
      ) : error ? (
        <p className="orgControlError" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div className="orgControlCharts">
            <OrgUsageChart
              key={`${category}-consumption`}
              title={`${categoryLabel} token consumption`}
              hint="Daily totals for the selected date range"
              labels={labels}
              series={[{ name: "Tokens", values: tokenSeries, color: "#225bff" }]}
              yFormat={formatTokenCount}
            />
            <OrgUsageChart
              key={`${category}-io`}
              title={`${categoryLabel} input vs output`}
              hint="Prompt tokens compared with completion tokens"
              labels={labels}
              variant="bars"
              series={[
                { name: "Input", values: inputSeries, color: "#225bff" },
                { name: "Output", values: outputSeries, color: "#64748b" },
              ]}
              yFormat={formatTokenCount}
            />
            <OrgUsageChart
              key={`${category}-cost`}
              title={`${categoryLabel} estimated cost`}
              hint="Approximate Bedrock pricing"
              labels={labels}
              series={[{ name: "Cost", values: costSeries, color: "#d97706" }]}
              yFormat={formatUsd}
            />
          </div>

          <div className="org_settings_card team_members_card org_admin_ledger_card">
            <div className="team_members_card_header">
              <div>
                <h2 className="org_settings_card_title">Usage by user</h2>
                <p className="org_settings_card_subtitle">
                  {categoryLabel} allocated quotas and consumed tokens for {appliedFrom} to {appliedTo}.
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
                      className="assessments_ledger_search_input"
                      placeholder="Search by name or email…"
                      aria-label="Search usage by user"
                      value={filterText}
                      onChange={(e) => {
                        setFilterText(e.target.value);
                        setResetPaginationToggle((v) => !v);
                      }}
                    />
                  </div>
                </div>
                <DataTable
                  key={`usage-${category}-${appliedFrom}-${appliedTo}`}
                  customStyles={premiumDataTableStyles as never}
                  columns={columns}
                  data={filteredRows}
                  defaultSortFieldId="consumedTokens"
                  defaultSortAsc={false}
                  pagination
                  paginationResetDefaultPage={resetPaginationToggle}
                  persistTableHead
                  striped
                  highlightOnHover={false}
                  noDataComponent={
                    <p className="orgControlEmpty">
                      No usage recorded for this period.
                    </p>
                  }
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrganizationConfigPanel({
  org,
}: {
  org: OrgConfigListItem;
}) {
  const [feature, setFeature] = useState<OrgControlFeature>("attestation");
  const [tokenMode, setTokenMode] = useState<TokenMode>("input");
  const [quotas, setQuotas] = useState<
    Record<OrgControlFeature, { inputTokenQuota: number; outputTokenQuota: number }>
  >({
    attestation: { inputTokenQuota: 0, outputTokenQuota: 0 },
    assessment: { inputTokenQuota: 0, outputTokenQuota: 0 },
    sales_agent: { inputTokenQuota: 0, outputTokenQuota: 0 },
    reports: { inputTokenQuota: 0, outputTokenQuota: 0 },
  });
  const [users, setUsers] = useState<OrgTokenUserRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allocateUser, setAllocateUser] = useState<{
    userId: number;
    userName: string;
    email: string;
  } | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchOrgTokenConfig(org.id);
    if (result.ok === false) {
      setUsers([]);
      setError(result.message);
      setLoading(false);
      return;
    }
    setUsers(result.data.users);
    setSelectedIds(result.data.users.map((u) => u.userId));
    setLoading(false);
  }, [org.id]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const inputQuota = quotas[feature].inputTokenQuota;
  const outputQuota = quotas[feature].outputTokenQuota;
  const canAllocateAndSave = inputQuota > 0 && outputQuota > 0;

  const applyPreset = (amount: number) => {
    setQuotas((prev) => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        ...(tokenMode === "input"
          ? { inputTokenQuota: amount }
          : { outputTokenQuota: amount }),
      },
    }));
  };

  const setQuota = (key: "inputTokenQuota" | "outputTokenQuota", value: number) => {
    setQuotas((prev) => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        [key]: Math.max(0, Math.floor(value) || 0),
      },
    }));
  };

  const allocateAndSave = async () => {
    if (inputQuota <= 0 || outputQuota <= 0) {
      toast.error("Enter both input and output tokens before allocating.");
      return;
    }
    const targets = users.filter((user) => selectedIds.includes(user.userId));
    if (targets.length === 0) {
      toast.error("Select at least one user to allocate tokens.");
      return;
    }
    setSaving(true);
    const result = await saveOrgTokenConfig(org.id, {
      feature,
      inputTokenQuota: inputQuota,
      outputTokenQuota: outputQuota,
      users: targets.map((user) => ({
        userId: user.userId,
        inputTokens: inputQuota,
        outputTokens: outputQuota,
      })),
    });
    setSaving(false);
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    setQuotas((prev) => ({
      ...prev,
      [feature]: { inputTokenQuota: 0, outputTokenQuota: 0 },
    }));
    setUsers(result.data.users);
    toast.success(
      `Added ${formatTokenPreset(inputQuota)} input and ${formatTokenPreset(outputQuota)} output tokens to ${targets.length} users.`,
    );
  };

  const allSelected = users.length > 0 && selectedIds.length === users.length;

  const columns = useMemo(
    () => [
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            <input
              type="checkbox"
              checked={allSelected}
              aria-label="Select all users"
              onChange={(e) => {
                setSelectedIds(e.target.checked ? users.map((u) => u.userId) : []);
              }}
            />
          </div>
        ),
        cell: (row: OrgTokenUserRow) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.userId)}
            aria-label={`Select ${row.userName}`}
            onChange={(e) => {
              setSelectedIds((prev) =>
                e.target.checked
                  ? [...prev, row.userId]
                  : prev.filter((id) => id !== row.userId),
              );
            }}
          />
        ),
        width: "70px",
        center: true,
        ignoreRowClick: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "center", width: "100%" }}>
            ID
          </div>
        ),
        selector: (_row: OrgTokenUserRow, index: number) => index + 1,
        cell: (_row: OrgTokenUserRow, index: number) => (
          <div className="orgControlTable__idCell">{index + 1}</div>
        ),
        width: "80px",
        center: true,
        sortable: true,
      },
      {
        name: <div className="tableHeader">Name</div>,
        selector: (row: OrgTokenUserRow) => row.userName,
        cell: (row: OrgTokenUserRow) => (
          <UserNameEmailCell name={row.userName} email={row.email} />
        ),
        sortable: true,
        grow: 1.6,
        minWidth: "180px",
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Total tokens
          </div>
        ),
        selector: (row: OrgTokenUserRow) =>
          row.allocations[feature].inputTokens + row.allocations[feature].outputTokens,
        cell: (row: OrgTokenUserRow) => (
          <div className="orgControlTable__numeric">
            {formatTokenCount(
              row.allocations[feature].inputTokens +
                row.allocations[feature].outputTokens,
            )}
          </div>
        ),
        sortable: true,
        minWidth: "130px",
        right: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Input tokens
          </div>
        ),
        cell: (row: OrgTokenUserRow) => (
          <div className="orgControlTable__numeric">
            {formatTokenCount(row.allocations[feature].inputTokens)}
          </div>
        ),
        minWidth: "140px",
        right: true,
      },
      {
        name: (
          <div className="tableHeader" style={{ textAlign: "right", width: "100%" }}>
            Output tokens
          </div>
        ),
        cell: (row: OrgTokenUserRow) => (
          <div className="orgControlTable__numeric">
            {formatTokenCount(row.allocations[feature].outputTokens)}
          </div>
        ),
        minWidth: "140px",
        right: true,
        ignoreRowClick: true,
      },
      {
        name: <div className="tableHeader">Last allocated</div>,
        selector: (row: OrgTokenUserRow) => {
          const last = (row.allocationHistory ?? []).find(
            (item) => item.feature === feature,
          );
          return last?.allocatedAt ?? "";
        },
        cell: (row: OrgTokenUserRow) => {
          const last = (row.allocationHistory ?? []).find(
            (item) => item.feature === feature,
          );
          return (
            <div className="orgControlTable__history">
              {last ? formatAllocatedAt(last.allocatedAt) : "—"}
            </div>
          );
        },
        sortable: true,
        minWidth: "170px",
      },
      {
        name: <div className="tableHeader">Actions</div>,
        cell: (row: OrgTokenUserRow) => (
          <div className="user_table_actions">
            <button
              type="button"
              className="user_table_action_btn user_table_action_btn_icon"
              onClick={() =>
                setAllocateUser({
                  userId: row.userId,
                  userName: row.userName,
                  email: row.email,
                })
              }
              title="Allocate tokens and view history"
              aria-label={`Allocate tokens for ${row.userName}`}
            >
              <Coins size={14} />
            </button>
          </div>
        ),
        ignoreRowClick: true,
        minWidth: "90px",
        width: "90px",
      },
    ],
    [allSelected, feature, selectedIds, users],
  );

  if (loading) {
    return <LoadingMessage message="Loading token configuration…" />;
  }

  if (error) {
    return (
      <p className="orgControlError" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="orgControlConfig">
      <div className="orgControlConfig__layout">
        <section className="orgControlFeatureList" aria-label="Features">
          <div className="orgControlPanelHead">
            <span className="controlsPage__cardIconWrap" aria-hidden>
              <Layers size={20} strokeWidth={2} />
            </span>
            <div className="orgControlPanelHead__text">
              <h2 className="orgControlPanelHead__title">Features</h2>
              <p className="orgControlPanelHead__hint">
                Select a product area to set token quotas.
              </p>
            </div>
          </div>
          <div className="orgControlFeatureList__items">
            {ORG_CONTROL_FEATURES.map((item) => {
              const Icon = FEATURE_ICONS[item];
              const active = feature === item;
              return (
                <button
                  key={item}
                  type="button"
                  className={`orgControlFeatureList__item ${
                    active ? "orgControlFeatureList__item--active" : ""
                  }`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => setFeature(item)}
                >
                  <span className="orgControlFeatureList__icon" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="orgControlFeatureList__label">
                    {ORG_CONTROL_FEATURE_LABELS[item]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="orgControlDistribute" aria-label="Token distribution">
          <div className="orgControlPanelHead">
            <span className="controlsPage__cardIconWrap" aria-hidden>
              <Settings2 size={20} strokeWidth={2} />
            </span>
            <div className="orgControlPanelHead__text">
              <h2 className="orgControlPanelHead__title">
                {ORG_CONTROL_FEATURE_LABELS[feature]} quotas
              </h2>
              <p className="orgControlPanelHead__hint">
                Set input and output amounts to add, select users, then allocate and save.
              </p>
            </div>
          </div>

          <div className="orgControlDistribute__quotas">
            <label
              className={`orgControlQuota ${
                tokenMode === "input" ? "orgControlQuota--active" : ""
              }`}
            >
              <span className="orgControlQuota__icon" aria-hidden>
                <ArrowDownToLine size={16} strokeWidth={2} />
              </span>
              <span className="orgControlQuota__copy">
                <span className="orgControlQuota__label">Add input tokens</span>
                <TokenAmountInput
                  className="orgControlQuota__input"
                  ariaLabel="Input token quota"
                  emptyWhenZero
                  value={inputQuota}
                  onFocus={() => setTokenMode("input")}
                  onChange={(next) => setQuota("inputTokenQuota", next)}
                />
              </span>
            </label>
            <label
              className={`orgControlQuota ${
                tokenMode === "output" ? "orgControlQuota--active" : ""
              }`}
            >
              <span className="orgControlQuota__icon" aria-hidden>
                <ArrowUpFromLine size={16} strokeWidth={2} />
              </span>
              <span className="orgControlQuota__copy">
                <span className="orgControlQuota__label">Add output tokens</span>
                <TokenAmountInput
                  className="orgControlQuota__input"
                  ariaLabel="Output token quota"
                  emptyWhenZero
                  value={outputQuota}
                  onFocus={() => setTokenMode("output")}
                  onChange={(next) => setQuota("outputTokenQuota", next)}
                />
              </span>
            </label>
          </div>

          <div className="orgControlPresets" role="group" aria-label="Token presets">
                <p className="orgControlPresets__label">
                  Preset {tokenMode === "input" ? "input" : "output"} amount to add
                </p>
            <div className="orgControlPresets__row">
              {ORG_TOKEN_PRESETS.map((amount) => {
                const current = tokenMode === "input" ? inputQuota : outputQuota;
                return (
                  <button
                    key={amount}
                    type="button"
                    className={`orgControlPresets__btn ${
                      current === amount ? "orgControlPresets__btn--active" : ""
                    }`}
                    onClick={() => applyPreset(amount)}
                  >
                    {formatTokenPreset(amount)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="orgControlDistribute__footer">
            <Button
              className="invite_user_btn org_invite_btn"
              onClick={() => void allocateAndSave()}
              disabled={saving || !canAllocateAndSave}
            >
              <Save size={18} />
              {saving ? "Saving…" : "Allocate and Save"}
            </Button>
          </div>
        </section>
      </div>

      <div className="org_settings_card team_members_card org_admin_ledger_card">
        <div className="team_members_card_header">
          <div>
            <h2 className="org_settings_card_title">
              {ORG_CONTROL_FEATURE_LABELS[feature]} users
            </h2>
            <p className="org_settings_card_subtitle">
              Running totals by grant. Open allocate to add tokens or view history.
            </p>
          </div>
        </div>
        <div className="team_members_table_wrapper org_admin_table_shell">
          <div className="orgDataTable">
            <DataTable
              customStyles={premiumDataTableStyles as never}
              columns={columns}
              data={users}
              keyField="userId"
              pagination
              persistTableHead
              striped
              highlightOnHover={false}
              noDataComponent={
                <p className="orgControlEmpty">
                  No users in this organization yet.
                </p>
              }
            />
          </div>
        </div>
      </div>
      {allocateUser ? (
        <AllocateTokensDialog
          orgId={org.id}
          user={allocateUser}
          initialFeature={feature}
          onClose={() => setAllocateUser(null)}
          onSaved={() => void loadConfig()}
        />
      ) : null}
    </div>
  );
}

function OrganizationControl({ org, onBack, onControls }: OrganizationControlProps) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<OrgControlTab>("stats");

  return (
    <div className="orgControl">
      <Breadcrumbs
        items={[
          { label: "Controls", onClick: onControls },
          { label: "Organization Configuration", onClick: onBack },
          org.organizationName,
        ]}
      />

      <div className="page_tabs orgControl__tabs" role="tablist" aria-label="Organization control">
        <button
          type="button"
          role="tab"
          id={`${baseId}-tab-stats`}
          aria-selected={activeTab === "stats"}
          aria-controls={`${baseId}-panel-stats`}
          className={`page_tab ${activeTab === "stats" ? "page_tab_active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          <BarChart3 size={18} />
          Stats
        </button>
        <button
          type="button"
          role="tab"
          id={`${baseId}-tab-config`}
          aria-selected={activeTab === "config"}
          aria-controls={`${baseId}-panel-config`}
          className={`page_tab ${activeTab === "config" ? "page_tab_active" : ""}`}
          onClick={() => setActiveTab("config")}
        >
          <Settings2 size={18} />
          Configure
        </button>
      </div>

      {activeTab === "stats" ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-stats`}
          aria-labelledby={`${baseId}-tab-stats`}
        >
          <OrganizationStatsPanel org={org} idPrefix={`${baseId}-stats`} />
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`${baseId}-panel-config`}
          aria-labelledby={`${baseId}-tab-config`}
        >
          <OrganizationConfigPanel org={org} />
        </div>
      )}
    </div>
  );
}

export default OrganizationControl;
