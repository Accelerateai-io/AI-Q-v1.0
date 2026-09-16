import * as fs from "node:fs";
import * as path from "node:path";
import {
  getCatalogModel,
  loadModelOptionsFromCatalog,
} from "../config/modelsCatalog.js";
import { backendRoot } from "./backendRoot.js";
import { stripBedrockGeoPrefix } from "./bedrockModelId.js";

type ProfileRow = {
  inferenceProfileId?: string;
  inferenceProfileArn?: string;
  inferenceProfileName?: string;
  models?: Array<{ modelArn?: string }>;
};

function looksLikeRawModelId(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (v.startsWith("arn:aws:bedrock:")) return true;
  if (
    v.includes(":inference-profile/") ||
    v.includes(":application-inference-profile/")
  ) {
    return true;
  }
  // Bedrock / profile style ids (no spaces): provider.model or geo.provider.model
  if (/^(?:[a-z0-9-]+\.)+[a-z0-9][a-z0-9._:-]*$/i.test(v)) return true;
  return false;
}

function isSameAsModelId(name: string, modelId: string): boolean {
  const a = name.trim().toLowerCase();
  const b = modelId.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  return a === stripBedrockGeoPrefix(b).toLowerCase();
}

function formatCatalogName(name: string, provider?: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "";
  const p = provider?.trim();
  return p ? `${cleaned} (${p})` : cleaned;
}

function foundationFromArn(modelArn?: string): string | null {
  if (!modelArn) return null;
  const marker = ":foundation-model/";
  if (!modelArn.includes(marker)) return null;
  return modelArn.split(marker)[1]?.trim() || null;
}

function loadInferenceProfilesFromDisk(): ProfileRow[] {
  const region =
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "us-east-1";
  const candidates = [
    path.join(backendRoot, `inference-profiles-${region}.json`),
    path.join(backendRoot, "inference-profiles-us-east-1.json"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
        profiles?: ProfileRow[];
      };
      if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return parsed.profiles;
      }
    } catch {
      // ignore malformed / unreadable file and try next
    }
  }
  return [];
}

function findProfile(modelId: string): ProfileRow | undefined {
  const needle = modelId.trim();
  if (!needle) return undefined;
  const profiles = loadInferenceProfilesFromDisk();
  return profiles.find((profile) => {
    if (profile.inferenceProfileId === needle) return true;
    if (profile.inferenceProfileArn === needle) return true;
    if (profile.inferenceProfileName === needle) return true;
    const arn = profile.inferenceProfileArn || "";
    if (arn.endsWith(`/${needle}`)) return true;
    if (arn.includes(`:inference-profile/${needle}`)) return true;
    if (arn.includes(`:application-inference-profile/${needle}`)) return true;
    return false;
  });
}

/**
 * Resolve a human-readable LLM model name for Observability / report stamps.
 * Never prefers raw Bedrock ids when a catalog or inference-profile name exists.
 */
export function resolveLlmModelDisplayName(
  modelId: string,
  explicit?: string | null,
): string {
  const id = modelId?.trim() || "";
  if (!id) return explicit?.trim() || "";

  const explicitName = explicit?.trim() || "";
  if (
    explicitName &&
    !isSameAsModelId(explicitName, id) &&
    !looksLikeRawModelId(explicitName)
  ) {
    return explicitName;
  }

  // 1) Inference profile display name (saved Controls selections use these ids)
  const profile = findProfile(id);
  const profileName = profile?.inferenceProfileName?.trim();
  if (profileName && !isSameAsModelId(profileName, id)) {
    return profileName;
  }

  // 2) Catalog match (handles us./global. prefixes via stripBedrockGeoPrefix)
  const catalog =
    getCatalogModel(id) ||
    getCatalogModel(stripBedrockGeoPrefix(id));
  if (catalog?.name) {
    return formatCatalogName(catalog.name, catalog.provider);
  }

  // 3) Foundation model linked on the inference profile
  if (profile) {
    for (const model of profile.models || []) {
      const foundation = foundationFromArn(model.modelArn);
      if (!foundation) continue;
      const foundationCatalog =
        getCatalogModel(foundation) ||
        getCatalogModel(stripBedrockGeoPrefix(foundation));
      if (foundationCatalog?.name) {
        return formatCatalogName(
          foundationCatalog.name,
          foundationCatalog.provider,
        );
      }
    }
  }

  // 4) Longest fuzzy catalog option match embedded in the id
  const options = loadModelOptionsFromCatalog();
  const lowerId = id.toLowerCase();
  let best: { label: string; len: number } | null = null;
  for (const option of options) {
    const stripped = stripBedrockGeoPrefix(option.id).toLowerCase();
    if (stripped.length < 10) continue;
    if (
      lowerId === stripped ||
      lowerId.endsWith(`.${stripped}`) ||
      lowerId.includes(stripped)
    ) {
      if (!best || stripped.length > best.len) {
        best = { label: option.label, len: stripped.length };
      }
    }
  }
  if (best) return best.label;

  return explicitName || id;
}
