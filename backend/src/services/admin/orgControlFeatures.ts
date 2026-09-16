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
  sales_agent: "Sales agent",
  reports: "Reports",
};

const FEATURE_ALIASES: Record<string, OrgControlFeature> = {
  attestation: "attestation",
  vendor_self_attestation: "attestation",
  vendor_attestation: "attestation",
  assessment: "assessment",
  cots_vendor: "assessment",
  cots_buyer: "assessment",
  vendor_cots: "assessment",
  buyer_cots: "assessment",
  sales_agent: "sales_agent",
  sales_agent_query: "sales_agent",
  salesagent: "sales_agent",
  reports: "reports",
  report: "reports",
};

export function isOrgControlFeature(value: unknown): value is OrgControlFeature {
  return (
    typeof value === "string" &&
    (ORG_CONTROL_FEATURES as readonly string[]).includes(value)
  );
}

export function normalizeOrgControlFeature(
  value: unknown,
): OrgControlFeature | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!key) return null;
  return FEATURE_ALIASES[key] ?? (isOrgControlFeature(key) ? key : null);
}

export function asNonNegInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
