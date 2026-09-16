import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getActiveBedrockModelId } from "./bedrockModelId.js";
import { recordLlmUsage } from "../services/observability/llmUsage.service.js";
import {
  prepareFeatureTokenInvoke,
  throwTokenQuotaExceeded,
} from "../services/admin/featureTokenQuota.service.js";
import type { OrgControlFeature } from "../services/admin/orgControlFeatures.js";

const REGION =
  process.env.AWS_REGION?.trim() ||
  process.env.AWS_DEFAULT_REGION?.trim() ||
  "us-east-1";

const sharedClient = new BedrockRuntimeClient({ region: REGION });

export type InvokeBedrockAnthropicOptions = {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  modelId?: string;
  /** Optional client (e.g. agent-local). Defaults to a shared regional client. */
  client?: BedrockRuntimeClient;
  /** When set, enforce that feature's per-user token quota before invoking. */
  feature?: OrgControlFeature;
};

const TRUNCATED_STOP_REASONS = new Set(["max_tokens", "length", "max_length"]);

function estimateInputTokens(prompt: string): number {
  return Math.max(1, Math.ceil((prompt || "").length / 4));
}

function generationHitQuota(
  capped: boolean,
  stopReason: string | undefined,
  outputTokens: number,
  allowedMax: number,
): boolean {
  if (!capped) return false;
  const reason = (stopReason || "").trim().toLowerCase();
  if (TRUNCATED_STOP_REASONS.has(reason)) return true;
  return allowedMax > 0 && outputTokens >= allowedMax;
}

/**
 * Invoke Anthropic-on-Bedrock and record token usage for Observability.
 * When `feature` is set, the call is blocked if the user quota is exhausted.
 * Truncated output from a capped call is never returned — generation stops.
 */
export async function invokeBedrockAnthropicText(
  options: InvokeBedrockAnthropicOptions,
): Promise<string> {
  const requestedMax = options.maxTokens ?? 4096;
  let maxTokens = requestedMax;
  let capped = false;
  let gateBalance: Awaited<ReturnType<typeof prepareFeatureTokenInvoke>>["balance"] =
    null;
  if (options.feature) {
    const gate = await prepareFeatureTokenInvoke(
      options.feature,
      requestedMax,
      estimateInputTokens(options.prompt),
    );
    maxTokens = gate.maxTokens;
    capped = gate.capped;
    gateBalance = gate.balance;
  }
  const modelId = (options.modelId?.trim() || getActiveBedrockModelId()).trim();
  const temperature = options.temperature ?? 0.3;
  const client = options.client ?? sharedClient;

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content: [{ type: "text", text: options.prompt }] }],
  });

  const response = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body,
    }),
  );

  const result = JSON.parse(new TextDecoder().decode(response.body)) as {
    content?: Array<{ text?: string }>;
    stop_reason?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };

  const inputTokens = Number(result.usage?.input_tokens) || 0;
  const outputTokens = Number(result.usage?.output_tokens) || 0;
  if (inputTokens > 0 || outputTokens > 0) {
    await recordLlmUsage({
      modelId,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      feature: options.feature ?? null,
    });
  }

  if (
    options.feature &&
    generationHitQuota(capped, result.stop_reason, outputTokens, maxTokens)
  ) {
    const balance = gateBalance ?? {
      allocated: 0,
      consumed: inputTokens + outputTokens,
      inputExceeded: false,
      outputExceeded: true,
    };
    throwTokenQuotaExceeded(options.feature, {
      allocated: balance.allocated,
      consumed: (balance.consumed ?? 0) + inputTokens + outputTokens,
      inputExceeded: balance.inputExceeded,
      outputExceeded: true,
    });
  }

  return result.content?.[0]?.text ?? "";
}
