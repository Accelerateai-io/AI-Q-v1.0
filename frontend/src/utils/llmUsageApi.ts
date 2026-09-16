import { getApiBaseUrl } from "./apiBaseUrl";

export type LlmModelUsageRow = {
  id: number;
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  invokeCount: number;
  updatedAt: string | null;
};

export type LlmModelUsageEventRow = {
  id: number;
  usageId: number | null;
  modelId: string;
  date: string;
  organizationName: string;
  orgUser: string;
  totalTokens: number;
  estimatedCostUsd: number;
};

type ApiErrorBody = {
  error?: { message?: string };
  message?: string;
};

function errorMessage(data: ApiErrorBody, fallback: string): string {
  return data.error?.message ?? data.message ?? fallback;
}

async function adminUsageFetch(path: string): Promise<Response> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const token = sessionStorage.getItem("bearerToken");
  return fetch(`${base}/admin${path.startsWith("/") ? path : `/${path}`}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function fetchLlmModelUsage(): Promise<
  { ok: true; data: LlmModelUsageRow[] } | { ok: false; message: string }
> {
  try {
    const res = await adminUsageFetch("/services/llm-usage");
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
      ok?: boolean;
      data?: LlmModelUsageRow[];
    };

    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(body, "Could not load model usage."),
      };
    }

    return { ok: true, data: Array.isArray(body.data) ? body.data : [] };
  } catch {
    return {
      ok: false,
      message: "Network error while loading model usage.",
    };
  }
}

export async function fetchLlmModelUsageById(
  id: number,
): Promise<
  { ok: true; data: LlmModelUsageRow } | { ok: false; message: string }
> {
  try {
    const res = await adminUsageFetch(`/services/llm-usage/${id}`);
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
      ok?: boolean;
      data?: LlmModelUsageRow;
    };

    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(body, "Could not load model usage."),
      };
    }

    if (!body.data || typeof body.data !== "object") {
      return { ok: false, message: "Invalid model usage response." };
    }

    return { ok: true, data: body.data };
  } catch {
    return {
      ok: false,
      message: "Network error while loading model usage.",
    };
  }
}

export async function fetchLlmModelUsageEvents(
  usageId: number,
): Promise<
  { ok: true; data: LlmModelUsageEventRow[] } | { ok: false; message: string }
> {
  try {
    const res = await adminUsageFetch(`/services/llm-usage/${usageId}/events`);
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
      ok?: boolean;
      data?: LlmModelUsageEventRow[];
    };

    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(body, "Could not load usage events."),
      };
    }

    return { ok: true, data: Array.isArray(body.data) ? body.data : [] };
  } catch {
    return {
      ok: false,
      message: "Network error while loading usage events.",
    };
  }
}
