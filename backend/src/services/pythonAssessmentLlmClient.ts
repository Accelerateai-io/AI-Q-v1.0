/**
 * Call Python Bedrock LLM with pgvector formula context for assessment types.
 * Type 2 = cots_vendor, Type 3 = cots_buyer (same pattern as VTS /assessment/score).
 * Env: PYTHON_SCORING_URL (default http://localhost:5004)
 */

import { resolveActorSnapshot } from "./observability/llmUsage.service.js";
import { getActiveBedrockModelId } from "../utils/bedrockModelId.js";
import { getRequestActor } from "../utils/requestActorContext.js";
import {
  assertFeatureTokenQuota,
  throwIfTokenQuotaHttpError,
} from "./admin/featureTokenQuota.service.js";
import { maybeNotifyTokenQuotaExhausted } from "./admin/tokenQuotaAlert.service.js";
import type { OrgControlFeature } from "./admin/orgControlFeatures.js";

export type AssessmentLlmType =
  | "vendor_self_attestation"
  | "cots_vendor"
  | "cots_buyer";

export interface PythonLlmWithVectorResult {
  text: string;
  assessment_type: string;
  scoring_source: string;
  vector: {
    used?: boolean;
    chunks?: Array<{
      id?: string;
      file_name?: string;
      score?: number;
      content_preview?: string;
    }>;
    error?: string;
    assessment_type?: string;
  };
}

function scoringBaseUrl(): string {
  const raw = (process.env.PYTHON_SCORING_URL ?? "http://localhost:5004").trim();
  return raw.replace(/\/+$/, "");
}

function featureForAssessmentType(assessmentType: AssessmentLlmType): OrgControlFeature {
  return assessmentType === "vendor_self_attestation" ? "attestation" : "assessment";
}

export async function invokePythonLlmWithVector(options: {
  assessmentType: AssessmentLlmType;
  userPrompt: string;
  queryText?: string;
  maxTokens?: number;
  temperature?: number;
  modelId?: string;
  includeFormulaContext?: boolean;
}): Promise<PythonLlmWithVectorResult> {
  const feature = featureForAssessmentType(options.assessmentType);
  await assertFeatureTokenQuota(feature);
  const url = `${scoringBaseUrl()}/assessment/llm-with-vector`;
  const modelId = options.modelId?.trim() || getActiveBedrockModelId();
  // Resolve org/user before the Python call so usage events get names.
  const actor = await resolveActorSnapshot(getRequestActor().userId ?? null);
  const includeFormula = options.includeFormulaContext ?? false;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        assessment_type: options.assessmentType,
        user_prompt: options.userPrompt,
        ...(includeFormula && options.queryText
          ? { query_text: options.queryText }
          : {}),
        max_tokens: options.maxTokens ?? 8192,
        temperature: options.temperature ?? 0.3,
        model_id: modelId,
        include_formula_context: includeFormula,
        actor_user_id: actor.userId,
        actor_user_name: actor.userName,
        actor_organization_id: actor.organizationId,
        actor_organization_name: actor.organizationName,
        usage_feature: feature,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Python LLM+vector unreachable at ${url}: ${msg}`);
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throwIfTokenQuotaHttpError(response.status, body, feature);
    const detail =
      body && typeof body === "object" && body !== null && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : text.slice(0, 500);
    throw new Error(
      `Python LLM+vector failed (${response.status}): ${detail || response.statusText}`,
    );
  }

  if (!body || typeof body !== "object") {
    throw new Error("Python LLM+vector returned empty or invalid JSON");
  }

  const r = body as Record<string, unknown>;
  const llmText = typeof r.text === "string" ? r.text : "";
  if (!llmText.trim()) {
    throw new Error("Python LLM+vector returned empty text");
  }

  if (actor.userId != null && actor.organizationId != null) {
    await maybeNotifyTokenQuotaExhausted({
      userId: actor.userId,
      organizationId: actor.organizationId,
      userName: actor.userName,
      organizationName: actor.organizationName,
      feature,
    });
  }

  return {
    text: llmText,
    assessment_type: String(r.assessment_type ?? options.assessmentType),
    scoring_source: String(r.scoring_source ?? "llm"),
    vector:
      r.vector && typeof r.vector === "object" && !Array.isArray(r.vector)
        ? (r.vector as PythonLlmWithVectorResult["vector"])
        : {},
  };
}
