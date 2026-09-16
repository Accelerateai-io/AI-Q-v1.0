/**
 * Platform-wide AI Risk Intellect credentials for AI-Q.
 * One API key is stored in Controls and used by every backend call to Risk Intellect
 * (all assessment types / reports that need RI). Base URL stays in server env.
 */
import * as path from "node:path";
import { upsertEnvFile } from "../../utils/envFile.js";
import { backendRoot } from "../../utils/backendRoot.js";

const envLocalPath = path.join(backendRoot, ".env.local");

const API_KEY_ENV = "AI_RISK_INTELLECT_API_KEY";
const BASE_URL_ENV_PRIMARY = "AI_RISK_INTELLECT_BASE_URL";
const BASE_URL_ENV_LEGACY = "RI_BASE_URL";

export type AiRiskApiKeyConfig = {
  configured: boolean;
  apiKey: string;
  baseUrlConfigured: boolean;
  baseUrl: string;
};

function readApiKey(): string {
  return (
    process.env[API_KEY_ENV]?.trim() ||
    process.env["RI_API_KEY"]?.trim() ||
    ""
  );
}

function readBaseUrl(): string {
  return (
    process.env[BASE_URL_ENV_PRIMARY]?.trim() ||
    process.env[BASE_URL_ENV_LEGACY]?.trim() ||
    ""
  ).replace(/\/$/, "");
}

export function getAiRiskApiKeyConfig(): AiRiskApiKeyConfig {
  const apiKey = readApiKey();
  const baseUrl = readBaseUrl();
  return {
    configured: Boolean(apiKey),
    apiKey,
    baseUrlConfigured: Boolean(baseUrl),
    baseUrl,
  };
}

/**
 * Persist the Controls AI Risk API key to process.env + backend/.env.local.
 * This is the single platform key for all AI-Q → Risk Intellect calls.
 * Also mirrors RI_API_KEY for compatibility with legacy env aliases.
 */
export function setAiRiskApiKey(apiKey: string): AiRiskApiKeyConfig {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("API key is required");
  }
  if (trimmed.length > 512) {
    throw new Error("API key is too long");
  }

  process.env[API_KEY_ENV] = trimmed;
  process.env["RI_API_KEY"] = trimmed;
  upsertEnvFile(envLocalPath, {
    [API_KEY_ENV]: trimmed,
    RI_API_KEY: trimmed,
  });

  return getAiRiskApiKeyConfig();
}

/**
 * Clear the stored API key (optional; used if Controls adds a Clear action later).
 */
export function clearAiRiskApiKey(): AiRiskApiKeyConfig {
  process.env[API_KEY_ENV] = "";
  process.env["RI_API_KEY"] = "";
  upsertEnvFile(envLocalPath, {
    [API_KEY_ENV]: "",
    RI_API_KEY: "",
  });
  return getAiRiskApiKeyConfig();
}
