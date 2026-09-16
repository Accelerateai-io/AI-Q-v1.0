import * as fs from "node:fs";
import * as path from "node:path";
import {
  normalizeBedrockModelAlias,
  stripUsModelPrefix,
  stripBedrockGeoPrefix,
  // withUsModelPrefix,
} from "../utils/bedrockModelId.js";
import { backendRoot } from "../utils/backendRoot.js";

export type LlmModelOption = {
  id: string;
  label: string;
  backend: "bedrock";
};

export type BedrockCatalogModel = {
  modelId: string;
  name: string;
  provider?: string;
  inputModalities: string[];
  outputModalities: string[];
  lifecycleStatus?: string;
};

const modelsJsonPath = path.join(backendRoot, "models.json");

let cachedOptions: LlmModelOption[] | null = null;
let cachedById: Map<string, BedrockCatalogModel> | null = null;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseCatalogModel(raw: unknown): BedrockCatalogModel | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const modelId = typeof row.modelId === "string" ? row.modelId.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!modelId || !name) return null;
  return {
    modelId,
    name,
    provider: typeof row.provider === "string" ? row.provider : undefined,
    inputModalities: asStringArray(row.inputModalities),
    outputModalities: asStringArray(row.outputModalities),
    lifecycleStatus:
      typeof row.lifecycleStatus === "string" ? row.lifecycleStatus : undefined,
  };
}

function loadCatalogFile(): { models: BedrockCatalogModel[] } {
  if (!fs.existsSync(modelsJsonPath)) {
    throw new Error(`models.json not found at ${modelsJsonPath}`);
  }

  console.log(`[models.json] Reading catalog from ${modelsJsonPath}`);
  const raw = fs.readFileSync(modelsJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { models?: unknown };
  const models = Array.isArray(parsed.models)
    ? parsed.models.map(parseCatalogModel).filter((m): m is BedrockCatalogModel => m != null)
    : [];

  console.log(
    `[models.json] Parsed ${models.length} model(s) from catalog file`,
  );
  return { models };
}

/** Text-generation Bedrock models suitable for LLM work. */
function isTextGenerationModel(model: BedrockCatalogModel): boolean {
  const outputs = model.outputModalities.map((m) => m.toUpperCase());
  const inputs = model.inputModalities.map((m) => m.toUpperCase());
  return outputs.includes("TEXT") && inputs.includes("TEXT");
}

function optionLabel(model: BedrockCatalogModel): string {
  const provider = model.provider?.trim();
  return provider ? `${model.name} (${provider})` : model.name;
}

function buildCache(): void {
  const parsed = loadCatalogFile();
  const byId = new Map<string, BedrockCatalogModel>();
  const options: LlmModelOption[] = [];

  for (const model of parsed.models) {
    if (!isTextGenerationModel(model)) continue;

    // Use catalog modelId as-is (no us. prepend).
    // const resolvedId = withUsModelPrefix(model.modelId);
    const resolvedId = model.modelId;
    byId.set(model.modelId, model);
    byId.set(resolvedId, model);
    options.push({
      id: resolvedId,
      label: optionLabel(model),
      backend: "bedrock",
    });
  }

  options.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );

  cachedById = byId;
  cachedOptions = options;

  console.log(
    `[models.json] Built dropdown cache — ${options.length} text-generation option(s)`,
  );
}

export function getCatalogModel(modelId: string): BedrockCatalogModel | undefined {
  if (!cachedById) buildCache();
  const normalized = modelId.trim();
  if (
    normalized.startsWith("arn:aws:bedrock:") ||
    normalized.includes(":inference-profile/") ||
    normalized.includes(":application-inference-profile/")
  ) {
    return undefined;
  }

  const candidates = [
    normalized,
    stripBedrockGeoPrefix(normalized),
    stripUsModelPrefix(normalized),
    // withUsModelPrefix(stripUsModelPrefix(normalized)),
  ];

  for (const candidate of candidates) {
    const exact = cachedById!.get(candidate);
    if (exact) return exact;
  }

  // Cross-region profile ids embed the foundation model id after the geo prefix.
  const geoStripped = stripBedrockGeoPrefix(normalized);
  if (geoStripped && geoStripped !== normalized) {
    const embedded = cachedById!.get(geoStripped);
    if (embedded) return embedded;
  }

  return undefined;
}

export function loadModelOptionsFromCatalog(): LlmModelOption[] {
  if (!cachedOptions) buildCache();
  return [...cachedOptions!];
}

export function findCatalogOption(modelId: string): LlmModelOption | undefined {
  const model = getCatalogModel(modelId);
  if (!model) return undefined;
  return {
    // id: withUsModelPrefix(model.modelId),
    id: model.modelId,
    label: optionLabel(model),
    backend: "bedrock",
  };
}

export function resolveBedrockModelId(modelId: string): string {
  const normalized = normalizeBedrockModelAlias(modelId);
  const catalog = getCatalogModel(normalized);
  const base = catalog?.modelId ?? normalized;
  // return withUsModelPrefix(base);
  return base;
}
