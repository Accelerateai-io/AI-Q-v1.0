import { getApiBaseUrl } from "./apiBaseUrl";
import { publishActiveLlmModel } from "./activeLlmModelStore";

export type LlmModelOption = {
  id: string;
  label: string;
  backend: string;
};

export type LlmModelConfig = {
  modelId: string;
  modelLabel: string;
  backend: string;
  options: LlmModelOption[];
  requiresPythonRestart?: boolean;
  pythonSynced?: boolean;
  /** Model the Python scoring service reports as active. */
  pythonModelId?: string;
  /** Why Python is not on the same model as Node. */
  pythonSyncError?: string;
  inferenceProfiles?: boolean;
};

export type LlmModelValidationResponse = {
  success: boolean;
  message: string;
  modelId?: string;
  invokeModelId?: string;
  response?: string;
  workingVia?: string;
  fulfillmentResponse?: {
    status: "success" | "error";
    fulfillmentText: string;
    fulfillmentMessages: Array<{ text: { text: string[] } }>;
    outputContexts: Array<{
      name: string;
      lifespanCount: number;
      parameters: Record<string, unknown>;
    }>;
    endInteraction: boolean;
  };
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

export async function fetchLlmModelConfig(): Promise<
  | { ok: true; config: LlmModelConfig }
  | { ok: false; message: string }
> {
  try {
    const res = await adminFetch("/services/llm-model");
    const data = (await res.json().catch(() => ({}))) as ApiErrorBody &
      LlmModelConfig;

    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(data, "Could not load LLM models."),
      };
    }

    if (!Array.isArray(data.options)) {
      return {
        ok: false,
        message: "Invalid LLM model configuration from server.",
      };
    }

    const config: LlmModelConfig = {
      modelId: data.modelId ?? "",
      modelLabel: data.modelLabel ?? data.modelId ?? "",
      backend: data.backend ?? "bedrock",
      options: data.options,
      requiresPythonRestart: data.requiresPythonRestart,
      pythonSynced: data.pythonSynced,
      pythonModelId: data.pythonModelId,
      pythonSyncError: data.pythonSyncError,
      inferenceProfiles: data.inferenceProfiles,
    };
    if (config.modelId || config.modelLabel) {
      publishActiveLlmModel(config);
    }
    return { ok: true, config };
  } catch {
    return { ok: false, message: "Network error while loading LLM models." };
  }
}

export async function testLlmModel(
  modelId: string,
): Promise<
  | { ok: true; result: LlmModelValidationResponse }
  | { ok: false; message: string }
> {
  try {
    const res = await adminFetch("/services/llm-model/test", {
      method: "POST",
      body: JSON.stringify({ modelId }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiErrorBody &
      LlmModelValidationResponse;

    if (!res.ok) {
      return {
        ok: false,
        message: data.message ?? errorMessage(data, "This model is not supported"),
      };
    }

    return {
      ok: true,
      result: {
        success: data.success,
        message: data.message,
        modelId: data.modelId,
        invokeModelId: data.invokeModelId,
        response: data.response,
        workingVia: data.workingVia,
        fulfillmentResponse: data.fulfillmentResponse,
      },
    };
  } catch {
    return {
      ok: false,
      message: "Network error while validating the model.",
    };
  }
}

export async function applyLlmModel(
  modelId: string,
): Promise<
  | { ok: true; config: LlmModelConfig; message: string }
  | { ok: false; message: string }
> {
  try {
    const res = await adminFetch("/services/llm-model", {
      method: "PUT",
      body: JSON.stringify({ modelId }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiErrorBody &
      LlmModelConfig & { message?: string };

    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(data, "Could not update LLM model."),
      };
    }

    const config: LlmModelConfig = {
      modelId: data.modelId ?? "",
      modelLabel: data.modelLabel ?? data.modelId ?? "",
      backend: data.backend ?? "bedrock",
      options: Array.isArray(data.options) ? data.options : [],
      requiresPythonRestart: data.requiresPythonRestart,
      pythonSynced: data.pythonSynced,
      pythonModelId: data.pythonModelId,
      pythonSyncError: data.pythonSyncError,
      inferenceProfiles: data.inferenceProfiles,
    };
    if (config.modelId || config.modelLabel) {
      publishActiveLlmModel(config);
    }
    return {
      ok: true,
      config,
      message: data.message ?? "LLM model updated.",
    };
  } catch {
    return {
      ok: false,
      message: "Network error while updating LLM model.",
    };
  }
}
