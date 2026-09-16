import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../database/db.js";
import { estimateTokenCostUsd } from "../../config/llmModelPricing.js";
import { llmModelUsage } from "../../schema/observability/llmModelUsage.js";
import { llmModelUsageEvents } from "../../schema/observability/llmModelUsageEvents.js";
import { createOrganization } from "../../schema/organizations/createOrganization.js";
import { usersTable } from "../../schema/user_management/invite_user_schema.js";
import { normalizeBedrockModelAlias } from "../../utils/bedrockModelId.js";
import { getRequestActor } from "../../utils/requestActorContext.js";
import { resolveLlmModelDisplayName } from "../../utils/resolveLlmModelDisplayName.js";
import { maybeNotifyTokenQuotaExhausted } from "../admin/tokenQuotaAlert.service.js";
import type { OrgControlFeature } from "../admin/orgControlFeatures.js";

export type LlmUsageDelta = {
  modelId: string;
  modelName?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  /** Prefer explicit actor id (captured at call site before fire-and-forget). */
  actorUserId?: number | null;
  /** Controls feature this invoke belongs to (attestation, assessment, sales_agent, reports). */
  feature?: OrgControlFeature | null;
};

export type LlmModelUsageRow = {
  id: number;
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  invokeCount: number;
  updatedAt: string | null;
};

export type LlmModelUsageEventRow = {
  id: number;
  usageId: number | null;
  modelId: string;
  date: string;
  organizationName: string;
  orgUser: string;
  totalTokens: number;
  estimatedCostUsd: number;
};

function asNonNegInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function normalizeModelId(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) return "";
  return normalizeBedrockModelAlias(trimmed) || trimmed;
}

function displayUserName(row: {
  user_name?: string | null;
  user_first_name?: string | null;
  user_last_name?: string | null;
  email?: string | null;
}): string {
  const full = [row.user_first_name, row.user_last_name]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return (
    (row.user_name ?? "").trim() ||
    full ||
    (row.email ?? "").trim() ||
    ""
  );
}

export async function resolveActorSnapshot(
  explicitUserId?: number | null,
): Promise<{
  userId: number | null;
  userName: string | null;
  organizationId: number | null;
  organizationName: string | null;
}> {
  const als = getRequestActor();
  const fromAls = als.userId;
  let userId =
    explicitUserId != null && Number.isInteger(explicitUserId) && explicitUserId >= 1
      ? explicitUserId
      : fromAls != null && Number.isInteger(fromAls) && fromAls >= 1
        ? fromAls
        : null;

  // Fallback: resolve by JWT email when id is missing from the token store.
  if (userId == null && als.email) {
    try {
      const [byEmail] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, als.email))
        .limit(1);
      if (byEmail?.id != null) userId = byEmail.id;
    } catch (err) {
      console.error(
        "[llmUsage] failed to resolve actor by email:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (userId == null) {
    return {
      userId: null,
      userName: null,
      organizationId: null,
      organizationName: null,
    };
  }

  try {
    const [row] = await db
      .select({
        user_name: usersTable.user_name,
        user_first_name: usersTable.user_first_name,
        user_last_name: usersTable.user_last_name,
        email: usersTable.email,
        organization_id: usersTable.organization_id,
        organizationName: createOrganization.organizationName,
      })
      .from(usersTable)
      .leftJoin(
        createOrganization,
        eq(usersTable.organization_id, createOrganization.id),
      )
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!row) {
      return {
        userId,
        userName: als.email?.trim() || null,
        organizationId: null,
        organizationName: null,
      };
    }

    return {
      userId,
      userName: displayUserName(row) || als.email?.trim() || null,
      organizationId:
        row.organization_id != null && Number.isFinite(Number(row.organization_id))
          ? Number(row.organization_id)
          : null,
      organizationName: row.organizationName?.trim() || null,
    };
  } catch (err) {
    console.error(
      "[llmUsage] failed to resolve actor:",
      err instanceof Error ? err.message : err,
    );
    return {
      userId,
      userName: als.email?.trim() || null,
      organizationId: null,
      organizationName: null,
    };
  }
}

/**
 * Upsert token totals for a model and append a per-invoke event row.
 */
export async function recordLlmUsage(delta: LlmUsageDelta): Promise<void> {
  const modelId = normalizeModelId(delta.modelId);
  if (!modelId) return;

  let inputTokens = asNonNegInt(delta.inputTokens);
  let outputTokens = asNonNegInt(delta.outputTokens);
  let totalTokens = asNonNegInt(delta.totalTokens);

  if (totalTokens <= 0 && (inputTokens > 0 || outputTokens > 0)) {
    totalTokens = inputTokens + outputTokens;
  }
  if (inputTokens <= 0 && outputTokens <= 0 && totalTokens > 0) {
    outputTokens = totalTokens;
  }
  if (inputTokens <= 0 && outputTokens <= 0 && totalTokens <= 0) return;

  const modelName = resolveLlmModelDisplayName(modelId, delta.modelName);
  const incrementalCost = estimateTokenCostUsd(
    modelId,
    inputTokens,
    outputTokens,
  );
  const actor = await resolveActorSnapshot(delta.actorUserId);
  const feature = delta.feature ?? null;
  console.log(
    [
      "[llmUsage] tokens consumed",
      `input=${inputTokens}`,
      `output=${outputTokens}`,
      `total=${totalTokens}`,
      feature ? `feature=${feature}` : null,
      actor.userName ? `user=${actor.userName}` : null,
      actor.organizationName ? `org=${actor.organizationName}` : null,
      `model=${modelId}`,
    ]
      .filter(Boolean)
      .join(" "),
  );

  try {
    const [usageRow] = await db
      .insert(llmModelUsage)
      .values({
        modelId,
        modelName,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd: incrementalCost.toFixed(6),
        invokeCount: 1,
      })
      .onConflictDoUpdate({
        target: llmModelUsage.modelId,
        set: {
          modelName,
          inputTokens: sql`${llmModelUsage.inputTokens} + ${inputTokens}`,
          outputTokens: sql`${llmModelUsage.outputTokens} + ${outputTokens}`,
          totalTokens: sql`${llmModelUsage.totalTokens} + ${totalTokens}`,
          estimatedCostUsd: sql`(${llmModelUsage.estimatedCostUsd}::numeric + ${incrementalCost.toFixed(6)}::numeric)`,
          invokeCount: sql`${llmModelUsage.invokeCount} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: llmModelUsage.id });

    const usageId = usageRow?.id ?? null;
    await db.insert(llmModelUsageEvents).values({
      usageId: usageId ?? undefined,
      modelId,
      organizationId: actor.organizationId ?? undefined,
      organizationName: actor.organizationName ?? undefined,
      userId: actor.userId ?? undefined,
      userName: actor.userName ?? undefined,
      feature: feature ?? null,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: incrementalCost.toFixed(6),
    });

    if (feature && actor.userId != null && actor.organizationId != null) {
      await maybeNotifyTokenQuotaExhausted({
        userId: actor.userId,
        organizationId: actor.organizationId,
        userName: actor.userName,
        organizationName: actor.organizationName,
        feature,
      });
    }
  } catch (err) {
    console.error(
      "[llmUsage] failed to record usage:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Fire-and-forget wrapper so invoke latency is not blocked by DB writes. */
export function recordLlmUsageAsync(delta: LlmUsageDelta): void {
  // Capture ALS user id now — fire-and-forget may resume after request context is gone.
  const actorUserId = delta.actorUserId ?? getRequestActor().userId ?? null;
  void recordLlmUsage({ ...delta, actorUserId });
}

export async function listLlmModelUsage(): Promise<LlmModelUsageRow[]> {
  const rows = await db
    .select()
    .from(llmModelUsage)
    .orderBy(asc(llmModelUsage.id));

  const mapped = rows.map((row) => {
    const modelName = resolveLlmModelDisplayName(row.modelId, row.modelName);
    return {
      id: row.id,
      modelId: row.modelId,
      modelName,
      inputTokens: Number(row.inputTokens) || 0,
      outputTokens: Number(row.outputTokens) || 0,
      totalTokens: Number(row.totalTokens) || 0,
      estimatedCostUsd: Number(row.estimatedCostUsd) || 0,
      invokeCount: Number(row.invokeCount) || 0,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  });

  for (const row of rows) {
    const resolved = resolveLlmModelDisplayName(row.modelId, row.modelName);
    if (!resolved || resolved === row.modelName) continue;
    void db
      .update(llmModelUsage)
      .set({ modelName: resolved, updatedAt: sql`now()` })
      .where(eq(llmModelUsage.modelId, row.modelId))
      .catch((err: unknown) => {
        console.error(
          "[llmUsage] failed to backfill model name:",
          err instanceof Error ? err.message : err,
        );
      });
  }

  return mapped;
}

export async function getLlmModelUsageById(
  modelId: string,
): Promise<LlmModelUsageRow | null> {
  const normalized = normalizeModelId(modelId);
  if (!normalized) return null;
  const [row] = await db
    .select()
    .from(llmModelUsage)
    .where(eq(llmModelUsage.modelId, normalized))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    modelId: row.modelId,
    modelName: resolveLlmModelDisplayName(row.modelId, row.modelName),
    inputTokens: Number(row.inputTokens) || 0,
    outputTokens: Number(row.outputTokens) || 0,
    totalTokens: Number(row.totalTokens) || 0,
    estimatedCostUsd: Number(row.estimatedCostUsd) || 0,
    invokeCount: Number(row.invokeCount) || 0,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

/** Lookup by primary key (`llm_model_usage.id`). */
export async function getLlmModelUsageByDbId(
  id: number,
): Promise<LlmModelUsageRow | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const [row] = await db
    .select()
    .from(llmModelUsage)
    .where(eq(llmModelUsage.id, id))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    modelId: row.modelId,
    modelName: resolveLlmModelDisplayName(row.modelId, row.modelName),
    inputTokens: Number(row.inputTokens) || 0,
    outputTokens: Number(row.outputTokens) || 0,
    totalTokens: Number(row.totalTokens) || 0,
    estimatedCostUsd: Number(row.estimatedCostUsd) || 0,
    invokeCount: Number(row.invokeCount) || 0,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

/** Per-invoke rows for a model usage aggregate id. */
export async function listLlmModelUsageEventsByUsageId(
  usageId: number,
): Promise<LlmModelUsageEventRow[]> {
  if (!Number.isInteger(usageId) || usageId < 1) return [];

  const rows = await db
    .select({
      id: llmModelUsageEvents.id,
      usageId: llmModelUsageEvents.usageId,
      modelId: llmModelUsageEvents.modelId,
      createdAt: llmModelUsageEvents.createdAt,
      organizationName: llmModelUsageEvents.organizationName,
      organizationId: llmModelUsageEvents.organizationId,
      userName: llmModelUsageEvents.userName,
      userId: llmModelUsageEvents.userId,
      totalTokens: llmModelUsageEvents.totalTokens,
      estimatedCostUsd: llmModelUsageEvents.estimatedCostUsd,
      orgTableName: createOrganization.organizationName,
      userTableName: usersTable.user_name,
      userFirstName: usersTable.user_first_name,
      userLastName: usersTable.user_last_name,
      userEmail: usersTable.email,
    })
    .from(llmModelUsageEvents)
    .leftJoin(
      createOrganization,
      eq(llmModelUsageEvents.organizationId, createOrganization.id),
    )
    .leftJoin(usersTable, eq(llmModelUsageEvents.userId, usersTable.id))
    .where(eq(llmModelUsageEvents.usageId, usageId))
    .orderBy(desc(llmModelUsageEvents.createdAt), desc(llmModelUsageEvents.id));

  return rows.map((row) => {
    const joinedUser = displayUserName({
      user_name: row.userTableName,
      user_first_name: row.userFirstName,
      user_last_name: row.userLastName,
      email: row.userEmail,
    });
    return {
      id: row.id,
      usageId: row.usageId ?? null,
      modelId: row.modelId,
      date: row.createdAt.toISOString(),
      organizationName:
        row.organizationName?.trim() ||
        row.orgTableName?.trim() ||
        "—",
      orgUser: row.userName?.trim() || joinedUser || "—",
      totalTokens: Number(row.totalTokens) || 0,
      estimatedCostUsd: Number(row.estimatedCostUsd) || 0,
    };
  });
}
