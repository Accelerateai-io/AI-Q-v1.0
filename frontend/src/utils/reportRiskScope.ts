/**
 * Classify catalog-matched risks for complete reports (vendor COTS / customer risk report).
 * Uses DB `risk_type_detected` when present; otherwise light heuristics on intent/timing.
 */
export type ReportRiskScope = "vendor" | "buyer" | "shared";

export interface RiskRowForScope {
  risk_type_detected?: string | null;
  intent?: string | null;
  timing?: string | null;
}

export function riskScopeFromRow(r: RiskRowForScope): ReportRiskScope {
  const t = (r.risk_type_detected ?? "").toLowerCase();
  if (/\b(both|shared|joint)\b/.test(t)) return "shared";
  if (/\bvendor\b/.test(t) && !/\bbuyer\b/.test(t)) return "vendor";
  if (/\bbuyer\b/.test(t) && !/\bvendor\b/.test(t)) return "buyer";

  const blob = `${r.intent ?? ""} ${r.timing ?? ""}`.toLowerCase();
  if (/\b(both|shared|joint)\b/.test(blob)) return "shared";
  if (/\bvendor\b/.test(blob) && !/\bbuyer\b/.test(blob)) return "vendor";
  if (/\bbuyer\b/.test(blob) && !/\bvendor\b/.test(blob)) return "buyer";

  return "shared";
}

export function groupRisksByDomain<T extends { domains?: string | null }>(
  risks: T[],
): Record<string, T[]> {
  return risks.reduce<Record<string, T[]>>((acc, row) => {
    const d = row.domains?.trim() || "Other";
    if (!acc[d]) acc[d] = [];
    acc[d].push(row);
    return acc;
  }, {});
}
