/**
 * Bedrock model IDs are used exactly as selected (Controls / env).
 * No geo prefix is added — e.g. global.anthropic.… or us.anthropic.… as chosen.
 */

/** Default / fallback Bedrock model — keep in sync with python config defaults */
export const DEFAULT_BEDROCK_MODEL =
  "us.anthropic.claude-3-sonnet-20240229-v1:0";

const BEDROCK_MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9.:-]*$/i;

/** Pass through configured model id; use default when env is empty. */
export function normalizeBedrockModelAlias(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) return DEFAULT_BEDROCK_MODEL;
  return trimmed;
}

/**
 * Strip Bedrock geo / cross-region inference prefixes
 * (us., global., eu., apac., …) so catalog ids match.
 */
export function stripBedrockGeoPrefix(modelId: string): string {
  let id = modelId.trim();
  // e.g. global.anthropic.… → anthropic.… ; us.amazon.… → amazon.…
  id = id.replace(
    /^(us|global|eu|eusc|apac|ap|jp|ca|me|sa|il|af)\./i,
    "",
  );
  return id;
}

export function stripUsModelPrefix(modelId: string): string {
  return stripBedrockGeoPrefix(modelId);
}

/** True for provider-style Bedrock ids (anthropic.*, meta.*, …), not short aliases. */
export function isBedrockProviderModelId(modelId: string): boolean {
  const trimmed = modelId.trim();
  if (!trimmed || trimmed.includes("/")) return false;
  return BEDROCK_MODEL_ID_PATTERN.test(trimmed);
}

/** Passthrough — use the selected id as-is (no `us.` prepend). */
export function withUsModelPrefix(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) return trimmed;
  // Previously prepended `us.` to foundation-model ids; that broke global.* profiles.
  // if (trimmed.toLowerCase().startsWith("us.")) return trimmed;
  // if (isBedrockProviderModelId(trimmed)) {
  //   return `us.${trimmed}`;
  // }
  return trimmed;
}

/** Catalog ids like …:v1:0:200k are not valid for bedrock-runtime invoke. */
const INVOKE_CONTEXT_SUFFIX = /:(?:28|48|200)k$/i;

/** Use the selected model id directly (no prefix rewrite). */
export function resolveBedrockInvokeModelId(modelId: string): string {
  const trimmed = modelId.trim();
  // const trimmed = withUsModelPrefix(modelId.trim());
  if (!trimmed) return trimmed;
  return trimmed.replace(INVOKE_CONTEXT_SUFFIX, "");
}

/**
 * Active Bedrock chat model for app-wide invokes.
 * Reads process.env at call time so Controls → Apply takes effect without restart.
 */
export function getActiveBedrockModelId(): string {
  const fromBedrockModel = process.env.BEDROCK_MODEL?.trim() || "";
  const fromBedrockModelId = process.env.BEDROCK_MODEL_ID?.trim() || "";
  const raw = fromBedrockModel || fromBedrockModelId || "";
  const resolved = resolveBedrockInvokeModelId(normalizeBedrockModelAlias(raw));
  const source = fromBedrockModel
    ? "BEDROCK_MODEL"
    : fromBedrockModelId
      ? "BEDROCK_MODEL_ID"
      : "DEFAULT_BEDROCK_MODEL";
  console.log(`[LLM] taking model from ${source}: ${resolved}`);
  return resolved;
}
