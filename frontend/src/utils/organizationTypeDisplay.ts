/** Row shape from /allOrganizations (and preview state). */
export type OrganizationListRow = {
  id?: number | string;
  organizationName?: string;
  organizationType?: string | null;
};

/** Initials for org avatar (e.g. "Acme Corp" → "AC", "OpenAI" → "OP"). */
export function getOrganizationInitials(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function isAiEvalOrganization(org: OrganizationListRow | null | undefined): boolean {
  if (!org) return false;
  const id = Number(org.id);
  if (id === 1) return true;
  const name = (org.organizationName ?? "").trim().toLowerCase();
  return name === "ai eval";
}

/**
 * UI label for organization kind: AI EVAL org → "Platform"; else Buyer / Vendor from API.
 */
export function getOrganizationTypeDisplay(org: OrganizationListRow | null | undefined): string {
  if (!org) return "—";
  if (isAiEvalOrganization(org)) return "Platform";
  const t = String(org.organizationType ?? "").trim().toLowerCase();
  if (t === "buyer") return "Buyer";
  if (t === "vendor") return "Vendor";
  return "—";
}
