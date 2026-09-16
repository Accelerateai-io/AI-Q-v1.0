/**
 * Type-01 companyProfile.sector is stored as
 * `{ private_sector: [...], public_sector: [...], non_profit_sector: [...] }`.
 * VTS formula and Risk Intellect need a short industry name, not that object.
 */

const SECTOR_BUCKETS = ["private_sector", "public_sector", "non_profit_sector"] as const;

export function flattenSectorLabels(raw: unknown): string[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        return flattenSectorLabels(JSON.parse(s));
      } catch {
        return [];
      }
    }
    return [s];
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => flattenSectorLabels(item));
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const fromBuckets = SECTOR_BUCKETS.flatMap((key) => flattenSectorLabels(o[key]));
    if (fromBuckets.length > 0) return fromBuckets;
    return Object.values(o).flatMap((v) => flattenSectorLabels(v));
  }
  return [];
}

export function firstSectorLabel(raw: unknown): string {
  return flattenSectorLabels(raw)[0] ?? "";
}

/** Canonical names used by calculate_sector_modifier. */
export function vtsSectorFromLabels(labels: string[]): string {
  const blob = labels.join(" ").toLowerCase();
  if (!blob.trim()) return "Technology";
  if (/health|pharma|hospital|payer|clinical|medical/.test(blob)) return "Healthcare";
  if (/financial|bank|insurance|fintech|investment/.test(blob)) return "Financial Services";
  if (/autonom/.test(blob)) return "Autonomous Vehicles";
  if (/government|federal|public sector|defense|state government|local government/.test(blob)) {
    return "Government";
  }
  if (/e-?commerce|retail/.test(blob)) return "E-Commerce";
  if (/technolog|software|it services/.test(blob)) return "Technology";
  return "Technology";
}

export function vtsSectorFromPayload(payload: Record<string, unknown>): string {
  const cp =
    payload.companyProfile && typeof payload.companyProfile === "object" && !Array.isArray(payload.companyProfile)
      ? (payload.companyProfile as Record<string, unknown>)
      : {};
  const labels = flattenSectorLabels(payload.sector ?? cp.sector ?? payload.target_industries);
  const alreadyCanonical = String(payload.sector ?? "").trim();
  if (
    alreadyCanonical &&
    ["Healthcare", "Financial Services", "Autonomous Vehicles", "Government", "E-Commerce", "Technology"].includes(
      alreadyCanonical,
    )
  ) {
    return alreadyCanonical;
  }
  return vtsSectorFromLabels(labels);
}

export function firstIndustrySegmentFromPayload(payload: Record<string, unknown>): string {
  const cp =
    payload.companyProfile && typeof payload.companyProfile === "object" && !Array.isArray(payload.companyProfile)
      ? (payload.companyProfile as Record<string, unknown>)
      : {};
  return (
    firstSectorLabel(
      payload.buyerIndustrySegment ??
        payload.buyer_industry_segment ??
        payload.industrySegment ??
        payload.industry_segment ??
        payload.sector ??
        cp.sector ??
        payload.target_industries,
    ) || ""
  );
}
