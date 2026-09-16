import { getActiveBedrockModelId } from "./bedrockModelId.js";
import { resolveLlmModelDisplayName } from "./resolveLlmModelDisplayName.js";

export type ActiveLlmModelMeta = {
  modelId: string;
  modelLabel: string;
};

/** Active Controls LLM model id + display label for persisting on reports. */
export function getActiveLlmModelMeta(): ActiveLlmModelMeta {
  const modelId = getActiveBedrockModelId();
  return {
    modelId,
    modelLabel: resolveLlmModelDisplayName(modelId),
  };
}

/** Attach modelId / modelLabel onto a stored report JSON payload. */
export function stampActiveLlmModel<T extends Record<string, unknown>>(
  report: T,
): T & ActiveLlmModelMeta {
  const meta = getActiveLlmModelMeta();
  return {
    ...report,
    modelId: meta.modelId,
    modelLabel: meta.modelLabel,
  };
}

/** Ensure API report JSON exposes stored model fields (column values win over missing JSON). */
export function mergeLlmModelIntoReport(
  report: unknown,
  modelId?: string | null,
  modelLabel?: string | null,
): Record<string, unknown> | unknown {
  if (report == null || typeof report !== "object" || Array.isArray(report)) {
    return report;
  }
  const o = { ...(report as Record<string, unknown>) };
  const id = typeof modelId === "string" ? modelId.trim() : "";
  const label = typeof modelLabel === "string" ? modelLabel.trim() : "";
  if (id && (typeof o.modelId !== "string" || !String(o.modelId).trim())) {
    o.modelId = id;
  }
  if (label && (typeof o.modelLabel !== "string" || !String(o.modelLabel).trim())) {
    o.modelLabel = label;
  } else if (
    id &&
    (typeof o.modelLabel !== "string" || !String(o.modelLabel).trim())
  ) {
    o.modelLabel = id;
  }
  return o;
}
