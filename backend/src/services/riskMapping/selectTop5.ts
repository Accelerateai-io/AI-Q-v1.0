/**
 * Pure, offline-testable top-5 risk selector for risk-mapping v2.
 *
 * score(risk) = vocabulary(domain + secondary_risks keyword + timing keyword)
 *             + capped text relevance (<= textContributionCap, so text never outweighs the vocab match)
 *
 * Selection: max `maxPerDomain` risks per catalogue domain; tie-break on Risk-Intellect severity when
 * present, then a STABLE hash of risk_id (never risk_mapping_id ASC). If every risk scores 0, returns
 * an empty list with reason `insufficient_assessment_context`.
 *
 * No DB, no network: callers pass the catalogue rows in (loaded from DB in production, or from the
 * SQL dump offline), so this is fully testable offline.
 */
import {
  scoreVocabulary,
  normalizeDomain,
  getVocabConfig,
  getLookupVersion,
  getUseCaseExpansions,
  getContentHarmGuard,
  getCapabilityGuards,
  getNearDuplicateConfig,
  type VocabScore,
} from "./riskVocabulary.js";

export interface CatalogueRisk {
  risk_mapping_id: number;
  risk_id: string | null;
  risk_title: string | null;
  domains: string | null;
  description: string | null;
  secondary_risks: string | null;
  timing: string | null;
  likelihood?: number | null;
  impact?: number | null;
  severity?: number | null;
}

export interface MatchTrace {
  score: number;
  vocabulary: string[];
  text_terms: string[];
  unmatched: string[];
  lookup_version: string;
}

export type SelectedRisk<T extends CatalogueRisk> = T & { match_trace: MatchTrace };

export interface SelectTop5Result<T extends CatalogueRisk> {
  selected: SelectedRisk<T>[];
  reason?: string;
  vocab: VocabScore;
}

// --- text relevance (secondary signal) -------------------------------------

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "was", "has", "have", "not", "may",
  "can", "use", "using", "used", "via", "into", "per", "all", "any", "each", "other", "such", "data",
  "risk", "risks", "ai", "system", "systems", "model", "models", "based", "across", "their", "them",
  "our", "your", "its", "will", "would", "could", "about", "when", "where", "which", "what", "who",
  "too", "long", "answers", "answer", "questions", "question", "open", "roles", "thousands", "than",
]);

/** Very small English stemmer: lowercase, strip common suffixes. */
function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w;
}

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/g)) {
    if (raw.length < 3 || STOPWORDS.has(raw)) continue;
    out.add(stem(raw));
  }
  return out;
}

/** Assessment free-text fields used for text relevance (COTS identified_risks/customer_specific_risks excluded). */
function assessmentText(payload: Record<string, unknown>): string {
  const pick = (keys: string[]): string =>
    keys
      .map((k) => payload[k])
      .filter((x) => x != null)
      .map((x) => (Array.isArray(x) ? x.join(" ") : typeof x === "object" ? "" : String(x)))
      .join(" ");
  return [
    pick(["productName", "product_name", "vendorName", "vendor_name", "solutionName", "solution_name", "label"]),
    pick(["businessPainPoint", "business_pain_point", "primaryPainPoint", "primary_pain_point", "pain_points", "pain_points_solved"]),
    pick(["expectedOutcomes", "expected_outcomes"]),
    pick(["productFeatures", "product_features", "useCaseTypes", "use_case_types", "ai_capabilities"]),
    pick(["industrySector", "industry_sector", "customerSector", "customer_sector", "industry", "sector"]),
  ].join(" ");
}

/** Append versioned use-case keyword expansions when their triggers appear in the assessment text. */
function expandAssessmentText(text: string): string {
  const lower = text.toLowerCase();
  const extra: string[] = [];
  for (const { triggers, expand } of getUseCaseExpansions()) {
    const hit = triggers.some((t) =>
      new RegExp(`(^|[^a-z])${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(lower),
    );
    if (hit) extra.push(...expand);
  }
  return extra.length ? `${text} ${extra.join(" ")}` : text;
}

/** Lowercased product feature/capability text used for capability detection. */
function productFeatureText(payload: Record<string, unknown>): string {
  return [
    payload.productFeatures, payload.product_features, payload.useCaseTypes, payload.use_case_types,
    payload.ai_capabilities, payload.ai_model_types,
  ]
    .filter((x) => x != null)
    .map((x) => (Array.isArray(x) ? x.join(" ") : String(x)))
    .join(" ")
    .toLowerCase();
}

/** True if any feature token appears in the product's feature/capability values. */
function hasFeatureToken(featureText: string, tokens: string[]): boolean {
  return tokens.some((t) => featureText.includes(t.toLowerCase()));
}

/**
 * Title tokens for near-duplicate detection. Unlike text scoring, this keeps domain words
 * like "ai"/"system"/"model"/"controls" (only true function words are dropped) so that titles
 * sharing a leading phrase such as "AI System Controls Insufficient for ..." are recognised.
 */
const TITLE_FUNCTION_WORDS = new Set([
  "the", "and", "for", "of", "in", "to", "a", "an", "with", "from", "or", "on", "by", "as", "at",
  "through", "due", "via", "into", "that", "this", "their", "its",
]);
function titleTokenSet(title: string | null): Set<string> {
  const out = new Set<string>();
  for (const raw of (title ?? "").toLowerCase().split(/[^a-z0-9]+/g)) {
    if (raw.length < 2 || TITLE_FUNCTION_WORDS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/** True when two titles share most of their significant words (keep the higher-ranked one). */
function isNearDuplicateTitle(
  a: Set<string>,
  b: Set<string>,
  cfg: { minSharedTokens: number; ratio: number },
): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  const smaller = Math.min(a.size, b.size);
  return shared >= cfg.minSharedTokens && shared / smaller >= cfg.ratio;
}

function scoreText(assessmentTokens: Set<string>, risk: CatalogueRisk, cap: number): { score: number; terms: string[] } {
  const titleTokens = tokenize(risk.risk_title ?? "");
  const descTokens = tokenize(risk.description ?? "");
  let raw = 0;
  const terms: string[] = [];
  for (const t of assessmentTokens) {
    let hit = 0;
    if (titleTokens.has(t)) hit += 2; // title double weight
    if (descTokens.has(t)) hit += 1;
    if (hit > 0) {
      raw += hit;
      terms.push(t);
    }
  }
  return { score: Math.min(cap, raw), terms };
}

// --- stable tie-break hash --------------------------------------------------

/** Deterministic FNV-1a 32-bit hash of risk_id (stable across runs, independent of row order). */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- selection --------------------------------------------------------------

export function selectTop5<T extends CatalogueRisk>(
  rows: T[],
  payload: Record<string, unknown>,
  opts: { type1?: boolean } = {},
): SelectTop5Result<T> {
  const cfg = getVocabConfig();
  const lookupVersion = getLookupVersion();
  const vocab = scoreVocabulary(payload, opts);
  const assessmentTokens = tokenize(expandAssessmentText(assessmentText(payload)));

  const featureText = productFeatureText(payload);

  const guard = getContentHarmGuard();
  const allowContentRisks = hasFeatureToken(featureText, guard.featureTokensThatAllowContentRisks);
  const excludeTerms = guard.excludeRiskTerms.map((t) => t.toLowerCase());

  // Capability guards: a risk family (e.g. LLM-specific, reinforcement/robotics) is excluded unless the
  // product declares a matching feature. Collect the active exclude terms for this payload.
  const capabilityExcludeTerms: string[] = [];
  for (const cg of getCapabilityGuards()) {
    if (!hasFeatureToken(featureText, cg.featureTokens)) {
      capabilityExcludeTerms.push(...cg.excludeRiskTerms.map((t) => t.toLowerCase()));
    }
  }

  const nearDupCfg = getNearDuplicateConfig();

  const secKws = Object.keys(vocab.secondaryKeywords);
  const timeKws = Object.keys(vocab.timingKeywords);

  interface Scored {
    row: T;
    domain: string;
    total: number;
    text: number;
    excluded: boolean;
    trace: MatchTrace;
    sev: number;
  }

  const scored: Scored[] = rows.map((row) => {
    const domain = normalizeDomain(row.domains ?? "");
    const domainW = vocab.domainWeights[domain] ?? 0;

    const vocabulary: string[] = [];
    if (domainW > 0) vocabulary.push(...(vocab.domainReasons[domain] ?? [`domain:${domain} +${round2(domainW)}`]));

    let secW = 0;
    const secLower = (row.secondary_risks ?? "").toLowerCase();
    for (const kw of secKws) {
      if (secLower.includes(kw.toLowerCase())) {
        secW += vocab.secondaryKeywords[kw]!;
        vocabulary.push(...(vocab.secondaryReasons[kw] ?? [`secondary:${kw}`]).map((r) => `${r} [secondary_risks~"${kw}"]`));
      }
    }

    let timeW = 0;
    const timingLower = (row.timing ?? "").toLowerCase();
    for (const kw of timeKws) {
      if (timingLower.includes(kw.toLowerCase())) {
        timeW += vocab.timingKeywords[kw]!;
        vocabulary.push(...(vocab.timingReasons[kw] ?? [`timing:${kw}`]).map((r) => `${r} [timing~"${kw}"]`));
      }
    }

    const text = scoreText(assessmentTokens, row, cfg.textContributionCap);
    const total = domainW + secW + timeW + text.score;

    // Guards: exclude generated-content risks without a content feature, and capability-specific
    // risks (LLM/prompt, reinforcement/exploratory/robotics) the product does not have.
    const riskText = `${row.risk_title ?? ""} ${row.description ?? ""}`.toLowerCase();
    const excluded =
      (!allowContentRisks && excludeTerms.some((t) => riskText.includes(t))) ||
      capabilityExcludeTerms.some((t) => riskText.includes(t));

    // Risk-Intellect severity when present (else derive L*I; else 0). Used only for tie-breaks.
    const sev =
      row.severity != null && Number.isFinite(row.severity)
        ? Number(row.severity)
        : row.likelihood != null && row.impact != null
          ? Number(row.likelihood) * Number(row.impact)
          : 0;

    return {
      row,
      domain,
      total,
      text: text.score,
      excluded,
      sev,
      trace: {
        score: round2(total),
        vocabulary,
        text_terms: text.terms,
        unmatched: vocab.unmatched,
        lookup_version: lookupVersion,
      },
    };
  });

  // Insufficient context: no usable answers -> empty list (never 5 arbitrary risks).
  // Content-harm-excluded risks are not eligible.
  const eligible = scored.filter((s) => !s.excluded);
  if (eligible.every((s) => s.total <= 0)) {
    return { selected: [], reason: cfg.insufficientContextReason, vocab };
  }

  // Ranking: vocabulary-dominant total, then TEXT relevance decides within-domain order, then RI
  // severity, and the stable hash only as the final tie-break.
  const candidates = eligible
    .filter((s) => s.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.text !== a.text) return b.text - a.text;
      if (b.sev !== a.sev) return b.sev - a.sev;
      return stableHash(a.row.risk_id ?? String(a.row.risk_mapping_id)) -
        stableHash(b.row.risk_id ?? String(b.row.risk_mapping_id));
    });

  const perDomain: Record<string, number> = {};
  const selected: SelectedRisk<T>[] = [];
  const selectedTitleTokens: Set<string>[] = [];
  for (const c of candidates) {
    if (selected.length >= cfg.topN) break;
    const used = perDomain[c.domain] ?? 0;
    if (used >= cfg.maxPerDomain) continue;
    // Near-duplicate guard: skip a risk whose title shares most of its words with one already
    // selected (candidates are higher-ranked first, so the kept one is the higher-ranked).
    const titleTokens = titleTokenSet(c.row.risk_title ?? null);
    if (selectedTitleTokens.some((t) => isNearDuplicateTitle(titleTokens, t, nearDupCfg))) continue;
    perDomain[c.domain] = used + 1;
    selectedTitleTokens.push(titleTokens);
    selected.push({ ...(c.row as T), match_trace: c.trace });
  }

  return { selected, vocab };
}

/** One-line human reason for a selected risk, for the LLM prompt block ("Selected because: ..."). */
export function selectedBecauseLine(trace: MatchTrace | undefined): string {
  if (!trace) return "";
  const parts: string[] = [];
  if (trace.vocabulary.length) parts.push(trace.vocabulary.slice(0, 3).join("; "));
  if (trace.text_terms.length) parts.push(`text overlap: ${trace.text_terms.slice(0, 5).join(", ")}`);
  if (!parts.length) return "";
  return `Selected because: ${parts.join(" | ")} (score ${trace.score}, ${trace.lookup_version})`;
}
