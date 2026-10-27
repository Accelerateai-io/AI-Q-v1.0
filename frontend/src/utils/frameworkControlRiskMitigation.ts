import type { FrameworkMappingControlDetail } from "./frameworkMappingControlsDisplay";

export type MitigationRowLike = {
  mitigation_action_name?: string;
  mitigation_definition?: string | null;
  mitigation_category?: string;
  mitigation_action_id?: string;
};

export type RiskRowLike = {
  risk_id?: string | null;
  risk_title?: string | null;
  description?: string | null;
  domains?: string | null;
  /** The risk's own severity (1-25) or likelihood/impact (1-5) — used for honest severity. */
  severity?: number | null;
  likelihood?: number | null;
  impact?: number | null;
};

/** Shown when no catalogue mitigation actually matches a control (instead of unrelated filler rows). */
export const NO_MITIGATION_MESSAGE = "No mitigation in our catalogue matches this control yet.";

const STOP = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "was", "has", "have", "not", "may",
  "can", "use", "using", "used", "via", "into", "per", "all", "any", "each", "other", "such",
  "data", "risk", "risks", "control", "controls",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

function uniqueTokens(text: string): Set<string> {
  return new Set(tokenize(text));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

function hashPick<T extends string>(seed: string, options: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return options[h % options.length]!;
}

/** Honest severity bands: from the risk's own severity (1-25) or likelihood x impact, NOT list position. */
export type ControlDetailMitigationSeverity = "High" | "Medium" | "Low" | "Not rated";

export function severityForRisk(risk: RiskRowLike): ControlDetailMitigationSeverity {
  const score =
    typeof risk.severity === "number" && Number.isFinite(risk.severity)
      ? risk.severity
      : typeof risk.likelihood === "number" &&
          Number.isFinite(risk.likelihood) &&
          typeof risk.impact === "number" &&
          Number.isFinite(risk.impact)
        ? risk.likelihood * risk.impact
        : null;
  if (score == null) return "Not rated";
  if (score >= 15) return "High";
  if (score >= 8) return "Medium";
  return "Low";
}

/** CSS-safe slug for a severity label (e.g. "Not rated" -> "not-rated"). */
export function severitySlug(severity: ControlDetailMitigationSeverity): string {
  return severity.toLowerCase().replace(/\s+/g, "-");
}

export type ControlDetailRiskRowVM = {
  riskId: string;
  riskTitle?: string;
  severity: ControlDetailMitigationSeverity;
  /** Catalogue terms this control/mitigation/risk share — the honest basis for the suggestion. */
  matchedTerms: string[];
};

export type ControlDetailMitigationCardVM = {
  key: string;
  title: string;
  description: string;
  /** No fabricated reliability %. Suggestions are text matches, not verified controls. */
  status: "Suggested — not verified";
  matchedTerms: string[];
  iconKind: "grid" | "chart" | "shield";
  risksAddressed: ControlDetailRiskRowVM[];
};

const SEVERITY_ORDER: Record<ControlDetailMitigationSeverity, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
  "Not rated": 3,
};

function compareRiskRows(a: ControlDetailRiskRowVM, b: ControlDetailRiskRowVM): number {
  const da = SEVERITY_ORDER[a.severity] ?? 9;
  const db = SEVERITY_ORDER[b.severity] ?? 9;
  if (da !== db) return da - db;
  return a.riskId.localeCompare(b.riskId);
}

function mitigationGroupKey(mitigation: MitigationRowLike): string {
  const id = String(mitigation.mitigation_action_id ?? "").trim();
  if (id) return `id:${id}`;
  const name = String(mitigation.mitigation_action_name ?? "").trim() || "unnamed";
  return `name:${name}`;
}

function mitigationDisplayName(mitigation: MitigationRowLike): string {
  const name = String(mitigation.mitigation_action_name ?? "").trim();
  if (name) return name;
  const category = String(mitigation.mitigation_category ?? "").trim();
  if (category) return category;
  return "Unnamed mitigation action";
}

/**
 * Rank catalogue mitigations against a framework control by honest token overlap.
 * Returns [] (caller shows NO_MITIGATION_MESSAGE) when nothing actually matches — no filler rows,
 * no fabricated reliability %, no MITIGATED claim. Each suggestion reports the terms it matched on,
 * and each risk's severity comes from the risk's own severity / likelihood x impact.
 */
export function buildControlMitigationCards(
  control: FrameworkMappingControlDetail,
  top5Risks: RiskRowLike[],
  mitigationsByRiskId: Record<string, MitigationRowLike[]>,
  maxCards = 8,
): ControlDetailMitigationCardVM[] {
  const controlHay = uniqueTokens(
    `${control.controlId} ${control.title} ${control.description}`.replace(/—/g, " "),
  );

  type Scored = {
    score: number;
    risk: RiskRowLike;
    mitigation: MitigationRowLike;
    matchedTerms: string[];
  };
  const scored: Scored[] = [];

  top5Risks.forEach((risk) => {
    const rid = String(risk.risk_id ?? "").trim();
    const mits = rid ? mitigationsByRiskId[rid] ?? [] : [];
    const riskHay = uniqueTokens(`${risk.risk_title ?? ""} ${risk.description ?? ""} ${risk.domains ?? ""}`);
    for (const mitigation of mits) {
      const mHay = uniqueTokens(
        `${mitigation.mitigation_action_name ?? ""} ${mitigation.mitigation_definition ?? ""} ${mitigation.mitigation_category ?? ""}`,
      );
      const matchedTerms: string[] = [];
      for (const t of controlHay) if (mHay.has(t) || riskHay.has(t)) matchedTerms.push(t);
      const union = new Set([...controlHay, ...mHay, ...riskHay]);
      const tripartite = controlHay.size > 0 && mHay.size > 0 ? matchedTerms.length / union.size : 0;
      const score = Math.max(jaccard(controlHay, mHay), jaccard(controlHay, riskHay), tripartite);
      scored.push({ score, risk, mitigation, matchedTerms });
    }
  });

  // Only genuine matches — no fallback filler.
  const threshold = 0.04;
  const candidateRows = scored.filter((s) => s.score >= threshold && s.matchedTerms.length > 0);
  if (candidateRows.length === 0) return [];

  type GroupAgg = { mitigation: MitigationRowLike; rows: Scored[]; maxScore: number };
  const byMit = new Map<string, GroupAgg>();
  for (const s of candidateRows) {
    const gk = mitigationGroupKey(s.mitigation);
    const prev = byMit.get(gk);
    if (!prev) byMit.set(gk, { mitigation: s.mitigation, rows: [s], maxScore: s.score });
    else {
      prev.rows.push(s);
      if (s.score > prev.maxScore) prev.maxScore = s.score;
    }
  }

  const groups = [...byMit.values()].sort((a, b) => b.maxScore - a.maxScore).slice(0, maxCards);

  return groups.map((g) => {
    const rowsByScore = [...g.rows].sort((a, b) => b.score - a.score);
    const mitigationForTitle =
      rowsByScore.find((s) => String(s.mitigation.mitigation_action_name ?? "").trim())?.mitigation ?? g.mitigation;
    const title = mitigationDisplayName(mitigationForTitle);
    const description =
      rowsByScore.map((s) => String(s.mitigation.mitigation_definition ?? "").trim()).find(Boolean) ??
      "Mitigation definition not available.";

    const cardTerms = new Set<string>();
    for (const s of g.rows) for (const t of s.matchedTerms) cardTerms.add(t);

    const bestByRiskId = new Map<string, { score: number; row: ControlDetailRiskRowVM }>();
    for (const s of g.rows) {
      const rid = String(s.risk.risk_id ?? "").trim() || `RSK_${String(bestByRiskId.size + 1).padStart(4, "0")}`;
      const prev = bestByRiskId.get(rid);
      if (!prev || s.score > prev.score) {
        bestByRiskId.set(rid, {
          score: s.score,
          row: {
            riskId: rid,
            riskTitle: String(s.risk.risk_title ?? "").trim() || undefined,
            severity: severityForRisk(s.risk),
            matchedTerms: s.matchedTerms.slice(0, 8),
          },
        });
      }
    }
    const risksAddressed = [...bestByRiskId.values()].map((v) => v.row).sort(compareRiskRows);

    const seed = `${mitigationGroupKey(g.mitigation)}-${title}`;
    const iconKind = hashPick(seed, ["grid", "chart", "shield"] as const);
    return {
      key: mitigationGroupKey(g.mitigation),
      title,
      description,
      status: "Suggested — not verified" as const,
      matchedTerms: [...cardTerms].slice(0, 12),
      iconKind,
      risksAddressed,
    };
  });
}
