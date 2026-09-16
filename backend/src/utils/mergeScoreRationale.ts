/** Score rationale types aligned with Python terminal blocks. SCS replaces SRS in UI; SRS kept for legacy rows. */
export type ScoreRationaleType = "VTS" | "SCS" | "SRS" | "IRS";

export function normalizeScoreRationaleType(raw: unknown): ScoreRationaleType | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "SRS") return "SCS";
  if (s === "VTS" || s === "SCS" || s === "IRS") return s;
  return null;
}

function tryRiskScoreNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export function appendixSalesRiskBreakdown(
  report: Record<string, unknown>,
): Record<string, unknown> | null {
  const gen = report.generatedAnalysis ?? report.generated_analysis;
  if (gen == null || typeof gen !== "object" || Array.isArray(gen)) return null;
  const g = gen as Record<string, unknown>;
  const full = g.fullReport ?? g.full_report;
  if (full == null || typeof full !== "object" || Array.isArray(full)) return null;
  const appendix = (full as Record<string, unknown>).appendix;
  if (appendix == null || typeof appendix !== "object" || Array.isArray(appendix)) return null;
  const br =
    (appendix as Record<string, unknown>).salesRiskBreakdown ??
    (appendix as Record<string, unknown>).sales_risk_breakdown;
  if (br == null || typeof br !== "object" || Array.isArray(br)) return null;
  return br as Record<string, unknown>;
}

/**
 * Sales risk score (0–100, higher = worse) from stored customer risk report JSON.
 * Matches frontend {@link overallRiskScoreFromReportJson} fallbacks.
 */
export function extractOverallRiskScoreFromReport(report: unknown): number | null {
  if (report == null || typeof report !== "object" || Array.isArray(report)) return null;
  const r = report as Record<string, unknown>;

  const gen = r.generatedAnalysis ?? r.generated_analysis;
  if (gen != null && typeof gen === "object" && !Array.isArray(gen)) {
    const g = gen as Record<string, unknown>;
    const fromGen = tryRiskScoreNumber(g.overallRiskScore ?? g.overall_risk_score);
    if (fromGen != null) return fromGen;
  }

  const fromTop = tryRiskScoreNumber(r.overallRiskScore ?? r.overall_risk_score);
  if (fromTop != null) return fromTop;

  const breakdown = appendixSalesRiskBreakdown(r);
  if (breakdown != null) {
    const fromAppendix = tryRiskScoreNumber(
      breakdown.sales_risk_score ?? breakdown.salesRiskScore,
    );
    if (fromAppendix != null) return fromAppendix;
  }

  return null;
}

/**
 * Inject DB column rationale into report JSON when the nested field is missing.
 * Keeps API/UI readers working whether they use columns or JSON.
 */
export function mergeScoreRationaleIntoReport(
  report: unknown,
  scoreRationale: string | null | undefined,
  scoreRationaleType: string | null | undefined,
): unknown {
  const text = typeof scoreRationale === "string" ? scoreRationale.trim() : "";
  if (!text) return report;

  const type = normalizeScoreRationaleType(scoreRationaleType) ?? undefined;

  if (report == null || typeof report !== "object" || Array.isArray(report)) {
    return {
      scoreRationale: text,
      ...(type ? { scoreRationaleType: type } : {}),
    };
  }

  const r = { ...(report as Record<string, unknown>) };
  const existing = String(r.scoreRationale ?? r.score_rationale ?? "").trim();
  if (!existing) {
    r.scoreRationale = text;
    if (type) r.scoreRationaleType = type;
  }
  return r;
}
