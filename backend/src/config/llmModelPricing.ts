import { stripUsModelPrefix } from "../utils/bedrockModelId.js";

export type LlmTokenPricing = {
  /** USD per 1M input tokens */
  inputPer1M: number;
  /** USD per 1M output tokens */
  outputPer1M: number;
};

/**
 * Approximate on-demand Bedrock prices (USD / 1M tokens).
 * Used only for Observability estimates — not billing.
 */
const PRICING_BY_SUBSTRING: Array<{ match: RegExp; pricing: LlmTokenPricing }> = [
  { match: /claude-opus-4/i, pricing: { inputPer1M: 15, outputPer1M: 75 } },
  { match: /claude-sonnet-4/i, pricing: { inputPer1M: 3, outputPer1M: 15 } },
  { match: /claude-haiku-4/i, pricing: { inputPer1M: 1, outputPer1M: 5 } },
  { match: /claude-3-5-sonnet|claude-3\.5-sonnet/i, pricing: { inputPer1M: 3, outputPer1M: 15 } },
  { match: /claude-3-5-haiku|claude-3\.5-haiku/i, pricing: { inputPer1M: 0.8, outputPer1M: 4 } },
  { match: /claude-3-opus/i, pricing: { inputPer1M: 15, outputPer1M: 75 } },
  { match: /claude-3-sonnet/i, pricing: { inputPer1M: 3, outputPer1M: 15 } },
  { match: /claude-3-haiku/i, pricing: { inputPer1M: 0.25, outputPer1M: 1.25 } },
  { match: /nova-pro/i, pricing: { inputPer1M: 0.8, outputPer1M: 3.2 } },
  { match: /nova-lite/i, pricing: { inputPer1M: 0.06, outputPer1M: 0.24 } },
  { match: /nova-micro/i, pricing: { inputPer1M: 0.035, outputPer1M: 0.14 } },
  { match: /llama.?3\.3.?70b|llama3-3-70b/i, pricing: { inputPer1M: 0.72, outputPer1M: 0.72 } },
  { match: /llama.?3\.1.?70b|llama3-1-70b/i, pricing: { inputPer1M: 0.72, outputPer1M: 0.72 } },
  { match: /llama.?3\.1.?8b|llama3-1-8b/i, pricing: { inputPer1M: 0.22, outputPer1M: 0.22 } },
  { match: /mistral|mixtral/i, pricing: { inputPer1M: 0.7, outputPer1M: 0.7 } },
];

/** Fallback when the model id is unknown. */
export const DEFAULT_LLM_PRICING: LlmTokenPricing = {
  inputPer1M: 3,
  outputPer1M: 15,
};

export function resolveLlmPricing(modelId: string): LlmTokenPricing {
  const id = stripUsModelPrefix(modelId.trim());
  if (!id) return DEFAULT_LLM_PRICING;
  for (const row of PRICING_BY_SUBSTRING) {
    if (row.match.test(id)) return row.pricing;
  }
  return DEFAULT_LLM_PRICING;
}

export function estimateTokenCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = resolveLlmPricing(modelId);
  const input = Math.max(0, Number(inputTokens) || 0);
  const output = Math.max(0, Number(outputTokens) || 0);
  const cost =
    (input / 1_000_000) * pricing.inputPer1M +
    (output / 1_000_000) * pricing.outputPer1M;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
