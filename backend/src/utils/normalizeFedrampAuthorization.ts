export interface FedrampAuthorization {
  status: string;
  level: string;
  boundary: string;
  marketplace_id: string;
  authorized_at: string;
}

const DETAILS_STATUSES = new Set(["authorized", "in_process"]);

function asTrimmed(value: unknown, max: number): string {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

export function normalizeFedrampAuthorization(raw: unknown): FedrampAuthorization | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const status = asTrimmed(value.status, 50);
  if (!status) return null;
  const includeDetails = DETAILS_STATUSES.has(status);
  return {
    status,
    level: includeDetails ? asTrimmed(value.level, 50) : "",
    boundary: includeDetails ? asTrimmed(value.boundary, 255) : "",
    marketplace_id: includeDetails
      ? asTrimmed(value.marketplace_id ?? value.marketplaceId, 100)
      : "",
    authorized_at: includeDetails
      ? asTrimmed(value.authorized_at ?? value.authorizedAt, 20)
      : "",
  };
}
