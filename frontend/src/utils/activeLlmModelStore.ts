import { useEffect, useState } from "react";
import type { LlmModelConfig } from "./llmModelApi";

export type ActiveLlmModelSnapshot = {
  modelId: string;
  modelLabel: string;
  backend?: string;
  updatedAt: number;
};

type Listener = (snapshot: ActiveLlmModelSnapshot) => void;

const CHANNEL_NAME = "aiq-active-llm-model";
const STORAGE_KEY = "aiq.activeLlmModel";

let snapshot: ActiveLlmModelSnapshot | null = null;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function readStoredSnapshot(): ActiveLlmModelSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveLlmModelSnapshot>;
    const modelId =
      typeof parsed.modelId === "string" ? parsed.modelId.trim() : "";
    const modelLabel =
      typeof parsed.modelLabel === "string" ? parsed.modelLabel.trim() : "";
    if (!modelId && !modelLabel) return null;
    return {
      modelId,
      modelLabel: modelLabel || modelId,
      backend: typeof parsed.backend === "string" ? parsed.backend : undefined,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeStoredSnapshot(next: ActiveLlmModelSnapshot): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function ensureChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (channel) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<ActiveLlmModelSnapshot>) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      applySnapshot(data, { broadcast: false, persist: true });
    };
  } catch {
    channel = null;
  }
  return channel;
}

function applySnapshot(
  next: ActiveLlmModelSnapshot,
  options: { broadcast: boolean; persist: boolean },
): void {
  const modelId = next.modelId?.trim() || "";
  const modelLabel = next.modelLabel?.trim() || modelId;
  if (!modelId && !modelLabel) return;

  const normalized: ActiveLlmModelSnapshot = {
    modelId,
    modelLabel,
    backend: next.backend,
    updatedAt: next.updatedAt || Date.now(),
  };

  const same =
    snapshot?.modelId === normalized.modelId &&
    snapshot?.modelLabel === normalized.modelLabel &&
    snapshot?.backend === normalized.backend;
  if (same) return;

  snapshot = normalized;
  if (options.persist) writeStoredSnapshot(normalized);
  if (options.broadcast) {
    try {
      ensureChannel()?.postMessage(normalized);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((listener) => listener(normalized));
}

/** Current in-memory snapshot (may be null until first fetch/apply). */
export function getActiveLlmModelSnapshot(): ActiveLlmModelSnapshot | null {
  if (snapshot) return snapshot;
  const stored = readStoredSnapshot();
  if (stored) snapshot = stored;
  return snapshot;
}

/** Publish a new active model (Controls Apply / successful config fetch). */
export function publishActiveLlmModel(
  config: Pick<LlmModelConfig, "modelId" | "modelLabel"> &
    Partial<Pick<LlmModelConfig, "backend">>,
): void {
  ensureChannel();
  applySnapshot(
    {
      modelId: config.modelId ?? "",
      modelLabel: config.modelLabel ?? config.modelId ?? "",
      backend: config.backend,
      updatedAt: Date.now(),
    },
    { broadcast: true, persist: true },
  );
}

export function subscribeActiveLlmModel(listener: Listener): () => void {
  ensureChannel();
  listeners.add(listener);
  const current = getActiveLlmModelSnapshot();
  if (current) listener(current);
  return () => {
    listeners.delete(listener);
  };
}

/** React helper — live label/id for System Admin UI that tracks Controls Apply. */
export function useActiveLlmModel(): {
  modelId: string | null;
  modelLabel: string | null;
} {
  const [state, setState] = useState<{
    modelId: string | null;
    modelLabel: string | null;
  }>(() => {
    const current = getActiveLlmModelSnapshot();
    return {
      modelId: current?.modelId ?? null,
      modelLabel: current?.modelLabel ?? null,
    };
  });

  useEffect(() => {
    return subscribeActiveLlmModel((next) => {
      setState({
        modelId: next.modelId || null,
        modelLabel: next.modelLabel || null,
      });
    });
  }, []);

  return state;
}
