import { and, desc, eq } from "drizzle-orm";
import { db } from "../../database/db.js";
import { createOrganization } from "../../schema/organizations/createOrganization.js";
import { usersTable } from "../../schema/user_management/invite_user_schema.js";
import {
  orgFeatureTokenQuotas,
  orgUserTokenAllocationHistory,
  orgUserTokenAllocations,
} from "../../schema/controls/orgTokenQuotas.js";
import {
  asNonNegInt,
  isOrgControlFeature,
  type OrgControlFeature,
} from "./orgControlFeatures.js";

export type OrgFeatureQuota = {
  feature: OrgControlFeature;
  inputTokenQuota: number;
  outputTokenQuota: number;
};

export type OrgTokenAllocationHistoryItem = {
  id: number;
  feature: OrgControlFeature;
  inputTokens: number;
  outputTokens: number;
  allocatedAt: string;
};

export type OrgTokenUserRow = {
  userId: number;
  userName: string;
  email: string;
  allocations: Record<OrgControlFeature, { inputTokens: number; outputTokens: number }>;
  allocationHistory: OrgTokenAllocationHistoryItem[];
};

export type OrgTokenConfigPayload = {
  organizationId: number;
  organizationName: string;
  features: Record<OrgControlFeature, OrgFeatureQuota>;
  users: OrgTokenUserRow[];
};

export type OrgTokenConfigSaveInput = {
  feature: OrgControlFeature;
  inputTokenQuota: number;
  outputTokenQuota: number;
  allocatedBy?: number | null;
  users: Array<{
    userId: number;
    inputTokens: number;
    outputTokens: number;
  }>;
};

function emptyAllocations(): Record<
  OrgControlFeature,
  { inputTokens: number; outputTokens: number }
> {
  return {
    attestation: { inputTokens: 0, outputTokens: 0 },
    assessment: { inputTokens: 0, outputTokens: 0 },
    sales_agent: { inputTokens: 0, outputTokens: 0 },
    reports: { inputTokens: 0, outputTokens: 0 },
  };
}

function emptyFeatures(): Record<OrgControlFeature, OrgFeatureQuota> {
  return {
    attestation: { feature: "attestation", inputTokenQuota: 0, outputTokenQuota: 0 },
    assessment: { feature: "assessment", inputTokenQuota: 0, outputTokenQuota: 0 },
    sales_agent: { feature: "sales_agent", inputTokenQuota: 0, outputTokenQuota: 0 },
    reports: { feature: "reports", inputTokenQuota: 0, outputTokenQuota: 0 },
  };
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
  return (row.user_name ?? "").trim() || full || (row.email ?? "").trim() || "—";
}

function toIso(value: Date | string | null | undefined): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

async function getOrganizationName(
  organizationId: number,
): Promise<{ id: number; organizationName: string } | null> {
  const [org] = await db
    .select({
      id: createOrganization.id,
      organizationName: createOrganization.organizationName,
    })
    .from(createOrganization)
    .where(eq(createOrganization.id, organizationId))
    .limit(1);
  return org ?? null;
}

export async function getOrganizationTokenConfig(
  organizationId: number,
): Promise<OrgTokenConfigPayload | null> {
  const org = await getOrganizationName(organizationId);
  if (!org) return null;

  const [orgUsers, quotaRows, allocationRows, historyRows] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        user_name: usersTable.user_name,
        user_first_name: usersTable.user_first_name,
        user_last_name: usersTable.user_last_name,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.organization_id, organizationId)),
    db
      .select()
      .from(orgFeatureTokenQuotas)
      .where(eq(orgFeatureTokenQuotas.organizationId, organizationId)),
    db
      .select()
      .from(orgUserTokenAllocations)
      .where(eq(orgUserTokenAllocations.organizationId, organizationId)),
    db
      .select()
      .from(orgUserTokenAllocationHistory)
      .where(eq(orgUserTokenAllocationHistory.organizationId, organizationId))
      .orderBy(
        desc(orgUserTokenAllocationHistory.allocatedAt),
        desc(orgUserTokenAllocationHistory.id),
      ),
  ]);

  const features = emptyFeatures();
  for (const row of quotaRows) {
    if (!isOrgControlFeature(row.feature)) continue;
    features[row.feature] = {
      feature: row.feature,
      inputTokenQuota: asNonNegInt(row.inputTokenQuota),
      outputTokenQuota: asNonNegInt(row.outputTokenQuota),
    };
  }

  const users: OrgTokenUserRow[] = orgUsers.map((user) => ({
    userId: user.id,
    userName: displayUserName(user),
    email: (user.email ?? "").trim(),
    allocations: emptyAllocations(),
    allocationHistory: [],
  }));
  const byId = new Map(users.map((user) => [user.userId, user]));

  for (const row of allocationRows) {
    if (!isOrgControlFeature(row.feature)) continue;
    const user = byId.get(row.userId);
    if (!user) continue;
    user.allocations[row.feature] = {
      inputTokens: asNonNegInt(row.inputTokens),
      outputTokens: asNonNegInt(row.outputTokens),
    };
  }

  for (const row of historyRows) {
    if (!isOrgControlFeature(row.feature)) continue;
    const user = byId.get(row.userId);
    if (!user) continue;
    user.allocationHistory.push({
      id: row.id,
      feature: row.feature,
      inputTokens: asNonNegInt(row.inputTokens),
      outputTokens: asNonNegInt(row.outputTokens),
      allocatedAt: toIso(row.allocatedAt),
    });
  }

  return {
    organizationId: org.id,
    organizationName: org.organizationName,
    features,
    users,
  };
}

export async function saveOrganizationTokenConfig(
  organizationId: number,
  input: OrgTokenConfigSaveInput,
): Promise<OrgTokenConfigPayload | null> {
  const org = await getOrganizationName(organizationId);
  if (!org) return null;

  const orgUserIds = new Set(
    (
      await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.organization_id, organizationId))
    ).map((row) => row.id),
  );

  const now = new Date();
  const inputTokenQuota = asNonNegInt(input.inputTokenQuota);
  const outputTokenQuota = asNonNegInt(input.outputTokenQuota);
  const allocatedBy =
    input.allocatedBy != null && Number.isInteger(input.allocatedBy) && input.allocatedBy > 0
      ? input.allocatedBy
      : null;

  const validUsers = input.users.filter(
    (row) =>
      orgUserIds.has(row.userId) &&
      (asNonNegInt(row.inputTokens) > 0 || asNonNegInt(row.outputTokens) > 0),
  );

  await db.transaction(async (tx) => {
    const [existingQuota] = await tx
      .select({ id: orgFeatureTokenQuotas.id })
      .from(orgFeatureTokenQuotas)
      .where(
        and(
          eq(orgFeatureTokenQuotas.organizationId, organizationId),
          eq(orgFeatureTokenQuotas.feature, input.feature),
        ),
      )
      .limit(1);

    if (existingQuota) {
      await tx
        .update(orgFeatureTokenQuotas)
        .set({
          inputTokenQuota,
          outputTokenQuota,
          updatedAt: now,
        })
        .where(eq(orgFeatureTokenQuotas.id, existingQuota.id));
    } else {
      await tx.insert(orgFeatureTokenQuotas).values({
        organizationId,
        feature: input.feature,
        inputTokenQuota,
        outputTokenQuota,
        updatedAt: now,
      });
    }

    for (const user of validUsers) {
      const addInput = asNonNegInt(user.inputTokens);
      const addOutput = asNonNegInt(user.outputTokens);
      const [existing] = await tx
        .select({
          id: orgUserTokenAllocations.id,
          inputTokens: orgUserTokenAllocations.inputTokens,
          outputTokens: orgUserTokenAllocations.outputTokens,
        })
        .from(orgUserTokenAllocations)
        .where(
          and(
            eq(orgUserTokenAllocations.organizationId, organizationId),
            eq(orgUserTokenAllocations.userId, user.userId),
            eq(orgUserTokenAllocations.feature, input.feature),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(orgUserTokenAllocations)
          .set({
            inputTokens: asNonNegInt(existing.inputTokens) + addInput,
            outputTokens: asNonNegInt(existing.outputTokens) + addOutput,
            updatedAt: now,
          })
          .where(eq(orgUserTokenAllocations.id, existing.id));
      } else {
        await tx.insert(orgUserTokenAllocations).values({
          organizationId,
          userId: user.userId,
          feature: input.feature,
          inputTokens: addInput,
          outputTokens: addOutput,
          updatedAt: now,
        });
      }

      await tx.insert(orgUserTokenAllocationHistory).values({
        organizationId,
        userId: user.userId,
        feature: input.feature,
        inputTokens: addInput,
        outputTokens: addOutput,
        allocatedAt: now,
        allocatedBy,
      });
    }
  });

  return getOrganizationTokenConfig(organizationId);
}
