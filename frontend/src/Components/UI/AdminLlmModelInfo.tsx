import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import ClickTooltip from "./ClickTooltip";
import { fetchLlmModelConfig } from "../../utils/llmModelApi";
import {
  getActiveLlmModelSnapshot,
  useActiveLlmModel,
} from "../../utils/activeLlmModelStore";

export function isSystemAdminRole(): boolean {
  const systemRole = (sessionStorage.getItem("systemRole") ?? "")
    .toLowerCase()
    .trim()
    .replace(/_/g, " ");
  return systemRole === "system admin";
}

/** Read model label/id stamped onto assessment report JSON (types 1–3). */
export function modelNameFromReportPayload(report: unknown): string | null {
  if (report == null || typeof report !== "object") return null;
  const o = report as Record<string, unknown>;
  const pick = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const top =
    pick(o.modelLabel) ||
    pick(o.model_label) ||
    pick(o.llmModelLabel) ||
    pick(o.llm_model_label) ||
    pick(o.modelName) ||
    pick(o.model_name) ||
    pick(o.aiModel) ||
    pick(o.ai_model) ||
    pick(o.modelId) ||
    pick(o.model_id) ||
    pick(o.llmModelId) ||
    pick(o.llm_model_id);
  if (top) return top;

  const gen = o.generatedAnalysis ?? o.generated_analysis;
  if (gen != null && typeof gen === "object") {
    const g = gen as Record<string, unknown>;
    return (
      pick(g.modelLabel) ||
      pick(g.model_label) ||
      pick(g.modelName) ||
      pick(g.model_name) ||
      pick(g.aiModel) ||
      pick(g.modelId) ||
      null
    );
  }
  return null;
}

/** Prefer API top-level stored model, then report JSON. No live Controls fallback. */
export function resolveStoredLlmModelName(options: {
  llmModelLabel?: string | null;
  llmModelId?: string | null;
  report?: unknown;
}): string | null {
  const label =
    typeof options.llmModelLabel === "string" ? options.llmModelLabel.trim() : "";
  if (label) return label;
  const id = typeof options.llmModelId === "string" ? options.llmModelId.trim() : "";
  if (id) return id;
  return modelNameFromReportPayload(options.report);
}

/** Read model id only from assessment/report JSON (never display labels). */
export function modelIdFromReportPayload(report: unknown): string | null {
  if (report == null || typeof report !== "object") return null;
  const o = report as Record<string, unknown>;
  const pick = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const top =
    pick(o.llmModelId) ||
    pick(o.llm_model_id) ||
    pick(o.modelId) ||
    pick(o.model_id);
  if (top) return top;

  const gen = o.generatedAnalysis ?? o.generated_analysis;
  if (gen != null && typeof gen === "object") {
    const g = gen as Record<string, unknown>;
    return pick(g.llmModelId) || pick(g.modelId) || pick(g.model_id) || null;
  }
  return null;
}

/**
 * Prefer stored model id for Type 1/2/3 explainability UI.
 * Never falls back to friendly model names/labels.
 */
export function resolveStoredLlmModelId(options: {
  llmModelId?: string | null;
  report?: unknown;
}): string | null {
  const id =
    typeof options.llmModelId === "string" ? options.llmModelId.trim() : "";
  if (id) return id;
  return modelIdFromReportPayload(options.report);
}

type AdminLlmModelInfoProps = {
  /** Model name from the stored report when available. */
  modelName?: string | null;
  /** Use live Controls model if report has no stamped name. Default false. */
  fallbackToActive?: boolean;
  className?: string;
  size?: number;
};

/**
 * System Admin only — info icon showing which LLM model produced (or is active for) the report.
 * When fallbackToActive is on, the label updates immediately after Controls → Apply (no refresh).
 */
export function AdminLlmModelInfo({
  modelName,
  fallbackToActive = false,
  className = "",
  size = 14,
}: AdminLlmModelInfoProps) {
  const isAdmin = isSystemAdminRole();
  const live = useActiveLlmModel();
  const [fetchedLabel, setFetchedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !fallbackToActive) return;
    if (modelName && modelName.trim()) return;
    if (live.modelLabel || getActiveLlmModelSnapshot()?.modelLabel) return;

    let cancelled = false;
    void (async () => {
      const result = await fetchLlmModelConfig();
      if (cancelled || !result.ok) return;
      const label =
        result.config.modelLabel?.trim() ||
        result.config.modelId?.trim() ||
        "";
      if (label) setFetchedLabel(label);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, fallbackToActive, modelName, live.modelLabel]);

  if (!isAdmin) return null;

  const display =
    (modelName && modelName.trim()) ||
    (fallbackToActive
      ? live.modelLabel?.trim() ||
        getActiveLlmModelSnapshot()?.modelLabel?.trim() ||
        fetchedLabel?.trim() ||
        ""
      : "") ||
    "";
  if (!display) return null;

  return (
    <ClickTooltip content={`LLM model: ${display}`} position="top" showOn="hover">
      <span
        className={`admin_llm_model_info ${className}`.trim()}
        role="img"
        aria-label={`LLM model: ${display}`}
      >
        <Info size={size} color="#6B7280" aria-hidden />
      </span>
    </ClickTooltip>
  );
}

type AdminLlmModelLabelProps = {
  modelName?: string | null;
  fallbackToActive?: boolean;
  /**
   * When resolving the live Controls model, prefer model id over display name.
   * Use on report tags / explainability (ids only).
   */
  preferModelId?: boolean;
  className?: string;
  /** Show info icon beside the label. Default true. */
  showIcon?: boolean;
};

/**
 * System Admin only — visible "LLM model: …" label (optional info icon).
 * Live Controls model updates instantly after Apply when fallbackToActive is on.
 */
export function AdminLlmModelLabel({
  modelName,
  fallbackToActive = false,
  preferModelId = false,
  className = "",
  showIcon = true,
}: AdminLlmModelLabelProps) {
  const isAdmin = isSystemAdminRole();
  const live = useActiveLlmModel();
  const [fetchedValue, setFetchedValue] = useState<string | null>(null);

  const liveValue = preferModelId
    ? live.modelId?.trim() ||
      getActiveLlmModelSnapshot()?.modelId?.trim() ||
      live.modelLabel?.trim() ||
      getActiveLlmModelSnapshot()?.modelLabel?.trim() ||
      ""
    : live.modelLabel?.trim() ||
      getActiveLlmModelSnapshot()?.modelLabel?.trim() ||
      live.modelId?.trim() ||
      getActiveLlmModelSnapshot()?.modelId?.trim() ||
      "";

  useEffect(() => {
    if (!isAdmin || !fallbackToActive) return;
    if (modelName && modelName.trim()) return;
    if (liveValue) return;

    let cancelled = false;
    void (async () => {
      const result = await fetchLlmModelConfig();
      if (cancelled || !result.ok) return;
      const value = preferModelId
        ? result.config.modelId?.trim() ||
          result.config.modelLabel?.trim() ||
          ""
        : result.config.modelLabel?.trim() ||
          result.config.modelId?.trim() ||
          "";
      if (value) setFetchedValue(value);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, fallbackToActive, modelName, liveValue, preferModelId]);

  if (!isAdmin) return null;

  const display =
    (modelName && modelName.trim()) ||
    (fallbackToActive ? liveValue || fetchedValue?.trim() || "" : "") ||
    "";
  if (!display) return null;

  return (
    <span
      className={`admin_llm_model_label ${className}`.trim()}
      title={`LLM model: ${display}`}
    >
      {showIcon ? (
        <AdminLlmModelInfo
          modelName={display}
          fallbackToActive={false}
          size={14}
          className="admin_llm_model_label_icon"
        />
      ) : null}
      <span className="admin_llm_model_label_text">
        LLM model: <strong>{display}</strong>
      </span>
    </span>
  );
}

export default AdminLlmModelInfo;
