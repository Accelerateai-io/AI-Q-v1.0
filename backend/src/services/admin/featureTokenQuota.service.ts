import type { Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../database/db.js";
import { orgUserTokenAllocations } from "../../schema/controls/orgTokenQuotas.js";
import { llmModelUsageEvents } from "../../schema/observability/llmModelUsageEvents.js";
import { resolveActorSnapshot } from "../observability/llmUsage.service.js";
import {
  ORG_CONTROL_FEATURE_LABELS,
  normalizeOrgControlFeature,
  type OrgControlFeature,
} from "./orgControlFeatures.js";

export const TOKEN_QUOTA_EXCEEDED_CODE = "TOKEN_QUOTA_EXCEEDED";

/** Too small to finish a useful report / assessment / chat turn. Stop instead. */
export const MIN_REMAINING_OUTPUT_TOKENS = 128;

const QUOTA_MESSAGE_RE =
  /token quota is exhausted|token allocation is exhausted|no tokens have been allocated|contact platform admin|ask your platform admin/i;

const QUOTA_ADMIN_GUIDANCE =
  "Ask your platform admin to allocate more tokens.";

export class TokenQuotaExceededError extends Error {
  readonly status = 403;
  readonly code = TOKEN_QUOTA_EXCEEDED_CODE;

  constructor(
    message: string,
    readonly feature: OrgControlFeature,
    readonly allocated: number,
    readonly consumed: number,
  ) {
    super(message);
    this.name = "TokenQuotaExceededError";
  }
}

function asNonNegInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isTokenQuotaExceededError(
  error: unknown,
): error is TokenQuotaExceededError {
  return error instanceof TokenQuotaExceededError;
}

export function isTokenQuotaExceededMessage(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return QUOTA_MESSAGE_RE.test(message);
}

export function sendIfTokenQuotaExceeded(res: Response, error: unknown): boolean {
  if (isTokenQuotaExceededError(error)) {
    res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  if (!isTokenQuotaExceededMessage(message)) return false;
  res.status(403).json({
    success: false,
    code: TOKEN_QUOTA_EXCEEDED_CODE,
    message: /ask your platform admin|contact platform admin/i.test(message)
      ? message
      : `${message.replace(/\.*$/, "")}. ${QUOTA_ADMIN_GUIDANCE}`,
  });
  return true;
}

export type FeatureTokenBalance = {
  allocatedInput: number;
  allocatedOutput: number;
  consumedInput: number;
  consumedOutput: number;
  allocated: number;
  consumed: number;
  remaining: number;
  remainingInput: number | null;
  remainingOutput: number | null;
  inputExceeded: boolean;
  outputExceeded: boolean;
  exhausted: boolean;
};

export async function getFeatureTokenBalance(input: {
  userId: number;
  organizationId: number;
  feature: OrgControlFeature;
}): Promise<FeatureTokenBalance> {
  const empty: FeatureTokenBalance = {
    allocatedInput: 0,
    allocatedOutput: 0,
    consumedInput: 0,
    consumedOutput: 0,
    allocated: 0,
    consumed: 0,
    remaining: 0,
    remainingInput: 0,
    remainingOutput: 0,
    inputExceeded: false,
    outputExceeded: false,
    exhausted: true,
  };
  const userId = asNonNegInt(input.userId);
  const organizationId = asNonNegInt(input.organizationId);
  if (userId < 1 || organizationId < 1) return empty;

  const [allocRow] = await db
    .select({
      allocatedInput: sql<number>`coalesce(sum(${orgUserTokenAllocations.inputTokens}), 0)`,
      allocatedOutput: sql<number>`coalesce(sum(${orgUserTokenAllocations.outputTokens}), 0)`,
    })
    .from(orgUserTokenAllocations)
    .where(
      and(
        eq(orgUserTokenAllocations.userId, userId),
        eq(orgUserTokenAllocations.organizationId, organizationId),
        eq(orgUserTokenAllocations.feature, input.feature),
      ),
    );
  const allocatedInput = asNonNegInt(allocRow?.allocatedInput);
  const allocatedOutput = asNonNegInt(allocRow?.allocatedOutput);

  const [usageRow] = await db
    .select({
      consumedInput: sql<number>`coalesce(sum(${llmModelUsageEvents.inputTokens}), 0)`,
      consumedOutput: sql<number>`coalesce(sum(${llmModelUsageEvents.outputTokens}), 0)`,
    })
    .from(llmModelUsageEvents)
    .where(
      and(
        eq(llmModelUsageEvents.userId, userId),
        eq(llmModelUsageEvents.organizationId, organizationId),
        eq(llmModelUsageEvents.feature, input.feature),
      ),
    );
  const consumedInput = asNonNegInt(usageRow?.consumedInput);
  const consumedOutput = asNonNegInt(usageRow?.consumedOutput);
  const allocated = allocatedInput + allocatedOutput;
  const consumed = consumedInput + consumedOutput;
  const remainingInput =
    allocatedInput > 0 ? Math.max(0, allocatedInput - consumedInput) : null;
  const remainingOutput =
    allocatedOutput > 0 ? Math.max(0, allocatedOutput - consumedOutput) : null;
  const inputExceeded = allocatedInput > 0 && consumedInput >= allocatedInput;
  const outputExceeded = allocatedOutput > 0 && consumedOutput >= allocatedOutput;
  const exhausted =
    allocated <= 0 || inputExceeded || outputExceeded;

  return {
    allocatedInput,
    allocatedOutput,
    consumedInput,
    consumedOutput,
    allocated,
    consumed,
    remaining: Math.max(0, allocated - consumed),
    remainingInput,
    remainingOutput,
    inputExceeded,
    outputExceeded,
    exhausted,
  };
}

function quotaExceededMessage(
  feature: OrgControlFeature,
  balance: Pick<
    FeatureTokenBalance,
    "allocated" | "inputExceeded" | "outputExceeded"
  >,
): string {
  const label = ORG_CONTROL_FEATURE_LABELS[feature];
  if (balance.allocated <= 0) {
    return `No tokens have been allocated for ${label}. Ask your platform admin to allocate tokens for this feature.`;
  }
  if (balance.inputExceeded && balance.outputExceeded) {
    return `Your ${label} input and output token allocations are exhausted. ${QUOTA_ADMIN_GUIDANCE}`;
  }
  if (balance.inputExceeded) {
    return `Your ${label} input token allocation is exhausted. ${QUOTA_ADMIN_GUIDANCE}`;
  }
  if (balance.outputExceeded) {
    return `Your ${label} output token allocation is exhausted. ${QUOTA_ADMIN_GUIDANCE}`;
  }
  return `Your ${label} token allocation is exhausted. ${QUOTA_ADMIN_GUIDANCE}`;
}

export function throwTokenQuotaExceeded(
  feature: OrgControlFeature,
  balance: Pick<
    FeatureTokenBalance,
    "allocated" | "consumed" | "inputExceeded" | "outputExceeded"
  >,
): never {
  throw new TokenQuotaExceededError(
    quotaExceededMessage(feature, balance),
    feature,
    balance.allocated,
    balance.consumed,
  );
}

/**
 * Block LLM work when this user has used their allocated input or output tokens.
 * Skips only when there is no authenticated actor (internal/admin tests).
 */
export async function assertFeatureTokenQuota(
  feature: OrgControlFeature,
): Promise<void> {
  await prepareFeatureTokenInvoke(feature, 1);
}

/**
 * Assert quota before an LLM call. Caps max_tokens to remaining output on the
 * first step of a generation. Later steps should pass allowCap=false so the
 * feature stops immediately instead of emitting a truncated chunk.
 */
export async function prepareFeatureTokenInvoke(
  feature: OrgControlFeature,
  requestedMaxTokens: number,
  estimatedInputTokens = 0,
  allowCap = true,
): Promise<{ maxTokens: number; capped: boolean; balance: FeatureTokenBalance | null }> {
  const requested = Math.max(1, asNonNegInt(requestedMaxTokens) || 1);
  const actor = await resolveActorSnapshot();
  if (actor.userId == null) {
    return { maxTokens: requested, capped: false, balance: null };
  }
  if (actor.organizationId == null) {
    throwTokenQuotaExceeded(feature, {
      allocated: 0,
      consumed: 0,
      inputExceeded: false,
      outputExceeded: false,
    });
  }

  const balance = await getFeatureTokenBalance({
    userId: actor.userId,
    organizationId: actor.organizationId,
    feature,
  });
  if (balance.exhausted) {
    throwTokenQuotaExceeded(feature, balance);
  }
  if (
    balance.remainingInput != null &&
    estimatedInputTokens > 0 &&
    estimatedInputTokens > balance.remainingInput
  ) {
    throwTokenQuotaExceeded(feature, { ...balance, inputExceeded: true });
  }

  let maxTokens = requested;
  let capped = false;
  if (balance.remainingOutput != null) {
    if (balance.remainingOutput < MIN_REMAINING_OUTPUT_TOKENS) {
      throwTokenQuotaExceeded(feature, { ...balance, outputExceeded: true });
    }
    if (balance.remainingOutput < requested) {
      if (!allowCap) {
        throwTokenQuotaExceeded(feature, { ...balance, outputExceeded: true });
      }
      maxTokens = balance.remainingOutput;
      capped = true;
    }
  }
  return { maxTokens, capped, balance };
}

function parseTokenQuotaHttpBody(
  status: number,
  body: unknown,
): {
  message: string;
  feature: OrgControlFeature | null;
  allocated: number;
  consumed: number;
} | null {
  const root = asRecord(body);
  const detail = root?.detail;
  const payload = asRecord(detail) ?? root;
  const code = payload?.code;
  const messageFromPayload =
    typeof payload?.message === "string" ? payload.message.trim() : "";
  const messageFromDetail = typeof detail === "string" ? detail.trim() : "";
  const message = messageFromPayload || messageFromDetail;
  const isQuota =
    code === TOKEN_QUOTA_EXCEEDED_CODE || isTokenQuotaExceededMessage(message);
  if (!isQuota) return null;
  if (status !== 403 && status !== 429 && code !== TOKEN_QUOTA_EXCEEDED_CODE) {
    if (!isTokenQuotaExceededMessage(message)) return null;
  }
  return {
    message:
      message ||
      "Your token allocation for this feature is exhausted. Ask your platform admin to allocate more tokens.",
    feature: normalizeOrgControlFeature(payload?.feature),
    allocated: asNonNegInt(payload?.allocated),
    consumed: asNonNegInt(payload?.consumed),
  };
}

/** Convert a Python/FastAPI 403 token-quota body into TokenQuotaExceededError. */
export function throwIfTokenQuotaHttpError(
  status: number,
  body: unknown,
  fallbackFeature: OrgControlFeature,
): void {
  const parsed = parseTokenQuotaHttpBody(status, body);
  if (!parsed) return;
  throw new TokenQuotaExceededError(
    parsed.message,
    parsed.feature ?? fallbackFeature,
    parsed.allocated,
    parsed.consumed,
  );
}
