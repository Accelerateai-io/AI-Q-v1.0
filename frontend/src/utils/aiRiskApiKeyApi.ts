import { getApiBaseUrl } from "./apiBaseUrl";

export type AiRiskApiKeyConfig = {
  configured: boolean;
  apiKey: string;
  baseUrlConfigured: boolean;
  baseUrl: string;
};

type ApiErrorBody = {
  error?: { message?: string };
  message?: string;
};

function errorMessage(data: ApiErrorBody, fallback: string): string {
  return data.error?.message ?? data.message ?? fallback;
}

async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = `${base}/admin${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers ?? undefined);
  const token = sessionStorage.getItem("bearerToken");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export async function fetchAiRiskApiKeyConfig(): Promise<
  | { ok: true; config: AiRiskApiKeyConfig }
  | { ok: false; message: string }
> {
  try {
    const res = await adminFetch("/services/ai-risk-api-key");
    const data = (await res.json().catch(() => ({}))) as ApiErrorBody &
      AiRiskApiKeyConfig;

    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(data, "Could not load AI Risk API key."),
      };
    }

    return {
      ok: true,
      config: {
        configured: Boolean(data.configured),
        apiKey: typeof data.apiKey === "string" ? data.apiKey : "",
        baseUrlConfigured: Boolean(data.baseUrlConfigured),
        baseUrl: typeof data.baseUrl === "string" ? data.baseUrl : "",
      },
    };
  } catch {
    return {
      ok: false,
      message: "Network error while loading AI Risk API key.",
    };
  }
}

export async function saveAiRiskApiKey(
  apiKey: string,
): Promise<
  | { ok: true; config: AiRiskApiKeyConfig; message: string }
  | { ok: false; message: string }
> {
  try {
    const res = await adminFetch("/services/ai-risk-api-key", {
      method: "PUT",
      body: JSON.stringify({ apiKey }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiErrorBody &
      AiRiskApiKeyConfig & { message?: string };

    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(data, "Could not save AI Risk API key."),
      };
    }

    return {
      ok: true,
      config: {
        configured: Boolean(data.configured),
        apiKey: typeof data.apiKey === "string" ? data.apiKey : apiKey.trim(),
        baseUrlConfigured: Boolean(data.baseUrlConfigured),
        baseUrl: typeof data.baseUrl === "string" ? data.baseUrl : "",
      },
      message: data.message ?? "AI Risk API key saved.",
    };
  } catch {
    return {
      ok: false,
      message: "Network error while saving AI Risk API key.",
    };
  }
}
