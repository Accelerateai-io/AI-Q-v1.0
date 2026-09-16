import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../../database/db.js";
import { llmModelUsageEvents } from "../../schema/observability/llmModelUsageEvents.js";
import { createOrganization } from "../../schema/organizations/createOrganization.js";
import { usersTable } from "../../schema/user_management/invite_user_schema.js";
import { orgUserTokenAllocations } from "../../schema/controls/orgTokenQuotas.js";
import {
  asNonNegInt,
  normalizeOrgControlFeature,
  ORG_CONTROL_FEATURES,
  type OrgControlFeature,
} from "./orgControlFeatures.js";

export type OrgUsageSummary = {
  tokenConsumption: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  totalUsers: number;
};

export type OrgUsageSeriesPoint = {
  date: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export type OrgUsageUserRow = {
  userId: number | null;
  userName: string;
  email: string;
  allocatedTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  consumedTokens: number;
};

export type OrgUsageFeatureSlice = {
  feature: OrgControlFeature;
  summary: OrgUsageSummary;
  series: OrgUsageSeriesPoint[];
  rows: OrgUsageUserRow[];
};

export type OrgUsagePayload = {
  organizationId: number;
  organizationName: string;
  from: string;
  to: string;
  summary: OrgUsageSummary;
  series: OrgUsageSeriesPoint[];
  rows: OrgUsageUserRow[];
  features: Record<OrgControlFeature, OrgUsageFeatureSlice>;
};

type OrgUser = {
  id: number;
  user_name: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  email: string | null;
};

type UsageEvent = {
  userId: number | null;
  userName: string | null;
  feature: string | null;
  createdAt: Date;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: string | number;
};

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

function toUtcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptySeries(
  rangeStart: Date,
  rangeEndExclusive: Date,
): OrgUsageSeriesPoint[] {
  const series: OrgUsageSeriesPoint[] = [];
  for (
    let cursor = new Date(rangeStart.getTime());
    cursor < rangeEndExclusive;
    cursor = addUtcDays(cursor, 1)
  ) {
    series.push({
      date: isoDay(cursor),
      tokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    });
  }
  return series;
}

function buildUsageSlice(input: {
  feature: OrgControlFeature | null;
  orgUsers: OrgUser[];
  events: UsageEvent[];
  allocatedByUser: Map<number, number>;
  rangeStart: Date;
  rangeEndExclusive: Date;
}): {
  summary: OrgUsageSummary;
  series: OrgUsageSeriesPoint[];
  rows: OrgUsageUserRow[];
} {
  type Agg = {
    inputTokens: number;
    outputTokens: number;
    consumedTokens: number;
    estimatedCostUsd: number;
    userName: string;
  };

  const usageByUser = new Map<number | "unknown", Agg>();
  const seriesByDay = new Map<string, OrgUsageSeriesPoint>();

  for (const event of input.events) {
    const inputTokens = asNonNegInt(event.inputTokens);
    const outputTokens = asNonNegInt(event.outputTokens);
    const consumedTokens =
      asNonNegInt(event.totalTokens) || inputTokens + outputTokens;
    const estimatedCostUsd = Number(event.estimatedCostUsd) || 0;
    const key: number | "unknown" =
      event.userId != null && Number.isInteger(event.userId)
        ? event.userId
        : "unknown";
    const existing = usageByUser.get(key) ?? {
      inputTokens: 0,
      outputTokens: 0,
      consumedTokens: 0,
      estimatedCostUsd: 0,
      userName: event.userName?.trim() || "—",
    };
    existing.inputTokens += inputTokens;
    existing.outputTokens += outputTokens;
    existing.consumedTokens += consumedTokens;
    existing.estimatedCostUsd += estimatedCostUsd;
    if (event.userName?.trim()) existing.userName = event.userName.trim();
    usageByUser.set(key, existing);

    const day = isoDay(event.createdAt);
    const point = seriesByDay.get(day) ?? {
      date: day,
      tokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
    point.tokens += consumedTokens;
    point.inputTokens += inputTokens;
    point.outputTokens += outputTokens;
    point.estimatedCostUsd += estimatedCostUsd;
    seriesByDay.set(day, point);
  }

  const series = emptySeries(input.rangeStart, input.rangeEndExclusive).map(
    (point) => seriesByDay.get(point.date) ?? point,
  );

  const seenUserIds = new Set<number>();
  const rows: OrgUsageUserRow[] = input.orgUsers.map((user) => {
    seenUserIds.add(user.id);
    const usage = usageByUser.get(user.id);
    return {
      userId: user.id,
      userName: displayUserName(user),
      email: (user.email ?? "").trim(),
      allocatedTokens: input.allocatedByUser.get(user.id) ?? 0,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
      consumedTokens: usage?.consumedTokens ?? 0,
    };
  });

  const unknownUsage = usageByUser.get("unknown");
  if (unknownUsage && unknownUsage.consumedTokens > 0) {
    rows.push({
      userId: null,
      userName: unknownUsage.userName,
      email: "",
      allocatedTokens: 0,
      inputTokens: unknownUsage.inputTokens,
      outputTokens: unknownUsage.outputTokens,
      estimatedCostUsd: unknownUsage.estimatedCostUsd,
      consumedTokens: unknownUsage.consumedTokens,
    });
  }

  for (const [userId, usage] of usageByUser) {
    if (userId === "unknown" || seenUserIds.has(userId)) continue;
    rows.push({
      userId,
      userName: usage.userName,
      email: "",
      allocatedTokens: input.allocatedByUser.get(userId) ?? 0,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      consumedTokens: usage.consumedTokens,
    });
  }

  rows.sort((a, b) => {
    if (b.consumedTokens !== a.consumedTokens) {
      return b.consumedTokens - a.consumedTokens;
    }
    const bUsed = b.inputTokens + b.outputTokens;
    const aUsed = a.inputTokens + a.outputTokens;
    if (bUsed !== aUsed) return bUsed - aUsed;
    return a.userName.localeCompare(b.userName);
  });

  return {
    summary: {
      tokenConsumption: rows.reduce((sum, row) => sum + row.consumedTokens, 0),
      inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
      outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
      estimatedCostUsd: rows.reduce((sum, row) => sum + row.estimatedCostUsd, 0),
      totalUsers: input.feature
        ? rows.filter((row) => row.consumedTokens > 0 || row.allocatedTokens > 0)
            .length
        : input.orgUsers.length,
    },
    series,
    rows,
  };
}

export async function getOrganizationUsage(
  organizationId: number,
  from: Date,
  to: Date,
): Promise<OrgUsagePayload | null> {
  const [org] = await db
    .select({
      id: createOrganization.id,
      organizationName: createOrganization.organizationName,
    })
    .from(createOrganization)
    .where(eq(createOrganization.id, organizationId))
    .limit(1);

  if (!org) return null;

  const rangeStart = toUtcDayStart(from);
  const rangeEndExclusive = addUtcDays(toUtcDayStart(to), 1);

  const orgUsers = await db
    .select({
      id: usersTable.id,
      user_name: usersTable.user_name,
      user_first_name: usersTable.user_first_name,
      user_last_name: usersTable.user_last_name,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.organization_id, organizationId));

  const events = await db
    .select({
      userId: llmModelUsageEvents.userId,
      userName: llmModelUsageEvents.userName,
      feature: llmModelUsageEvents.feature,
      createdAt: llmModelUsageEvents.createdAt,
      inputTokens: llmModelUsageEvents.inputTokens,
      outputTokens: llmModelUsageEvents.outputTokens,
      totalTokens: llmModelUsageEvents.totalTokens,
      estimatedCostUsd: llmModelUsageEvents.estimatedCostUsd,
    })
    .from(llmModelUsageEvents)
    .where(
      and(
        eq(llmModelUsageEvents.organizationId, organizationId),
        gte(llmModelUsageEvents.createdAt, rangeStart),
        lt(llmModelUsageEvents.createdAt, rangeEndExclusive),
      ),
    );

  const allocations = await db
    .select({
      userId: orgUserTokenAllocations.userId,
      feature: orgUserTokenAllocations.feature,
      inputTokens: orgUserTokenAllocations.inputTokens,
      outputTokens: orgUserTokenAllocations.outputTokens,
    })
    .from(orgUserTokenAllocations)
    .where(eq(orgUserTokenAllocations.organizationId, organizationId));

  const allocatedAllByUser = new Map<number, number>();
  const allocatedByUserFeature = new Map<OrgControlFeature, Map<number, number>>();
  for (const feature of ORG_CONTROL_FEATURES) {
    allocatedByUserFeature.set(feature, new Map());
  }
  for (const row of allocations) {
    const amount = asNonNegInt(row.inputTokens) + asNonNegInt(row.outputTokens);
    allocatedAllByUser.set(row.userId, (allocatedAllByUser.get(row.userId) ?? 0) + amount);
    const featureKey = normalizeOrgControlFeature(row.feature);
    if (!featureKey) continue;
    const byUser = allocatedByUserFeature.get(featureKey);
    if (!byUser) continue;
    byUser.set(row.userId, (byUser.get(row.userId) ?? 0) + amount);
  }

  const overall = buildUsageSlice({
    feature: null,
    orgUsers,
    events,
    allocatedByUser: allocatedAllByUser,
    rangeStart,
    rangeEndExclusive,
  });

  const features = {} as Record<OrgControlFeature, OrgUsageFeatureSlice>;
  for (const feature of ORG_CONTROL_FEATURES) {
    const slice = buildUsageSlice({
      feature,
      orgUsers,
      events: events.filter(
        (event) => normalizeOrgControlFeature(event.feature) === feature,
      ),
      allocatedByUser: allocatedByUserFeature.get(feature) ?? new Map(),
      rangeStart,
      rangeEndExclusive,
    });
    features[feature] = { feature, ...slice };
  }

  return {
    organizationId: org.id,
    organizationName: org.organizationName,
    from: isoDay(rangeStart),
    to: isoDay(addUtcDays(rangeEndExclusive, -1)),
    summary: overall.summary,
    series: overall.series,
    rows: overall.rows,
    features,
  };
}
