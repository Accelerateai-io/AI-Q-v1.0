import { getApiBaseUrl } from "./apiBaseUrl";

export const ORG_CONTROL_FEATURES = [
  "attestation",
  "assessment",
  "sales_agent",
  "reports",
] as const;

export type OrgControlFeature = (typeof ORG_CONTROL_FEATURES)[number];

export const ORG_CONTROL_FEATURE_LABELS: Record<OrgControlFeature, string> = {
  attestation: "Attestation",
  assessment: "Assessment",
  sales_agent: "Sales agent query",
  reports: "Reports",
};

export const ORG_TOKEN_PRESETS = [
  15_000, 25_000, 50_000, 100_000, 125_000, 150_000, 200_000, 500_000, 1_000_000,
] as const;

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
  allocations: Record<
    OrgControlFeature,
    { inputTokens: number; outputTokens: number }
  >;
  allocationHistory: OrgTokenAllocationHistoryItem[];
};

export type OrgTokenConfigPayload = {
  organizationId: number;
  organizationName: string;
  features: Record<OrgControlFeature, OrgFeatureQuota>;
  users: OrgTokenUserRow[];
};

type ApiErrorBody = {
  error?: { message?: string };
  message?: string;
};

function errorMessage(data: ApiErrorBody, fallback: string): string {
  return data.error?.message ?? data.message ?? fallback;
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = `${base}/admin${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers ?? undefined);
  const token = sessionStorage.getItem("bearerToken");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export async function fetchOrgUsage(
  organizationId: number,
  from: string,
  to: string,
): Promise<{ ok: true; data: OrgUsagePayload } | { ok: false; message: string }> {
  try {
    const params = new URLSearchParams({ from, to });
    const res = await adminFetch(
      `/services/org-usage/${organizationId}?${params.toString()}`,
    );
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
      data?: OrgUsagePayload;
    };
    if (!res.ok || !body.data) {
      return {
        ok: false,
        message: errorMessage(body, "Could not load organization usage."),
      };
    }
    return { ok: true, data: body.data };
  } catch {
    return { ok: false, message: "Network error while loading organization usage." };
  }
}

export async function fetchOrgTokenConfig(
  organizationId: number,
): Promise<
  { ok: true; data: OrgTokenConfigPayload } | { ok: false; message: string }
> {
  try {
    const res = await adminFetch(`/services/org-token-config/${organizationId}`);
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
      data?: OrgTokenConfigPayload;
    };
    if (!res.ok || !body.data) {
      return {
        ok: false,
        message: errorMessage(body, "Could not load token configuration."),
      };
    }
    return {
      ok: true,
      data: {
        ...body.data,
        users: (body.data.users ?? []).map((user) => ({
          ...user,
          allocationHistory: user.allocationHistory ?? [],
        })),
      },
    };
  } catch {
    return {
      ok: false,
      message: "Network error while loading token configuration.",
    };
  }
}

export async function saveOrgTokenConfig(
  organizationId: number,
  payload: {
    feature: OrgControlFeature;
    inputTokenQuota: number;
    outputTokenQuota: number;
    users: Array<{ userId: number; inputTokens: number; outputTokens: number }>;
  },
): Promise<
  { ok: true; data: OrgTokenConfigPayload } | { ok: false; message: string }
> {
  try {
    const res = await adminFetch(`/services/org-token-config/${organizationId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
      data?: OrgTokenConfigPayload;
    };
    if (!res.ok || !body.data) {
      return {
        ok: false,
        message: errorMessage(body, "Could not save token configuration."),
      };
    }
    return {
      ok: true,
      data: {
        ...body.data,
        users: (body.data.users ?? []).map((user) => ({
          ...user,
          allocationHistory: user.allocationHistory ?? [],
        })),
      },
    };
  } catch {
    return {
      ok: false,
      message: "Network error while saving token configuration.",
    };
  }
}

export function formatTokenCount(value: number): string {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return n.toLocaleString("en-US", {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
}

export function formatTokenPreset(value: number): string {
  if (value >= 1_000_000 && value % 1_000_000 === 0) {
    return `${value / 1_000_000}M`;
  }
  if (value >= 1000 && value % 1000 === 0) {
    return `${value / 1000}k`;
  }
  return formatTokenCount(value);
}

export function formatAllocatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatUsd(value: number): string {
  const n = Number(value) || 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
