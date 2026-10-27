/**
 * Typed loader + scorer for the versioned risk-mapping vocabulary (riskVocabulary.v1.json).
 *
 * Maps stored assessment option VALUES (exact frontend values, not labels) to the catalogue's
 * own 7-domain vocabulary. All weights live in the JSON; this file only applies them.
 *
 * Corrections honoured:
 *  - Buyer/Vendor COTS `riskDomainScores` is catalogue-wide (identical for every assessment) and is
 *    NOT used. Stored riskDomainScores + the Type-1 derive_applicable_domains signal apply only when
 *    the payload is a Type-1 attestation (scoreVocabulary(..., { type1: true })).
 *  - Type-1 derive_applicable_domains domain names are normalised to the exact catalogue strings
 *    (Python emits "AI System Safety, Failures and Limitations"; catalogue has the Oxford comma).
 */
import * as fs from "node:fs";

interface VocabRule {
  label: string;
  exact?: string[];
  anyToken?: string[];
  notToken?: string[];
  domains?: Record<string, number>;
  secondaryKeywords?: Record<string, number>;
  timingKeywords?: Record<string, number>;
}
interface VocabSignal {
  id: string;
  readKeys: string[];
  rules: VocabRule[];
}
interface VocabJson {
  lookup_version: string;
  catalogueDomains: string[];
  textContributionCap: number;
  maxPerDomain: number;
  topN: number;
  insufficientContextReason: string;
  riskDomainScores: { normalizedMax: number; onlyWhenType1: boolean };
  type1DomainNormalization: Record<string, string>;
  useCaseKeywordExpansion?: Array<{ triggers: string[]; expand: string[] }>;
  contentHarmGuard?: { featureTokensThatAllowContentRisks: string[]; excludeRiskTerms: string[] };
  nearDuplicateTitleOverlap?: { minSharedTokens: number; ratio: number };
  capabilityGuards?: Array<{ id: string; featureTokens: string[]; excludeRiskTerms: string[] }>;
  signals: VocabSignal[];
}

export interface CapabilityGuard {
  id: string;
  featureTokens: string[];
  excludeRiskTerms: string[];
}

let cached: VocabJson | null = null;
function vocab(): VocabJson {
  if (!cached) {
    const raw = fs.readFileSync(new URL("./riskVocabulary.v1.json", import.meta.url), "utf8");
    cached = JSON.parse(raw) as VocabJson;
  }
  return cached;
}

export function getLookupVersion(): string {
  return vocab().lookup_version;
}
export function getCatalogueDomains(): string[] {
  return [...vocab().catalogueDomains];
}
export function getVocabConfig(): {
  textContributionCap: number;
  maxPerDomain: number;
  topN: number;
  insufficientContextReason: string;
} {
  const v = vocab();
  return {
    textContributionCap: v.textContributionCap,
    maxPerDomain: v.maxPerDomain,
    topN: v.topN,
    insufficientContextReason: v.insufficientContextReason,
  };
}

/** Use-case keyword expansions applied to the assessment text before text scoring. */
export function getUseCaseExpansions(): Array<{ triggers: string[]; expand: string[] }> {
  return vocab().useCaseKeywordExpansion ?? [];
}

/** Content-harm guard config: feature tokens that permit content risks + risk terms to exclude otherwise. */
export function getContentHarmGuard(): { featureTokensThatAllowContentRisks: string[]; excludeRiskTerms: string[] } {
  return vocab().contentHarmGuard ?? { featureTokensThatAllowContentRisks: [], excludeRiskTerms: [] };
}

/** Capability guards: each excludes a family of risks unless the product declares the capability. */
export function getCapabilityGuards(): CapabilityGuard[] {
  return vocab().capabilityGuards ?? [];
}

/** Near-duplicate title config: two selected risks may not share most of their title words. */
export function getNearDuplicateConfig(): { minSharedTokens: number; ratio: number } {
  return vocab().nearDuplicateTitleOverlap ?? { minSharedTokens: 3, ratio: 0.6 };
}

/** Normalise a domain label to the exact catalogue spelling. */
export function normalizeDomain(name: string): string {
  const v = vocab();
  const trimmed = String(name ?? "").trim();
  if (v.type1DomainNormalization[trimmed]) return v.type1DomainNormalization[trimmed];
  // exact catalogue match wins; otherwise return trimmed as-is
  const hit = v.catalogueDomains.find((d) => d.toLowerCase() === trimmed.toLowerCase());
  return hit ?? trimmed;
}

export interface VocabScore {
  /** domain -> accumulated weight */
  domainWeights: Record<string, number>;
  /** catalogue secondary_risks keyword -> weight (applied to any risk whose secondary_risks contains it) */
  secondaryKeywords: Record<string, number>;
  /** catalogue timing keyword -> weight (applied to any risk whose timing contains it) */
  timingKeywords: Record<string, number>;
  /** human-readable reasons, keyed by domain / keyword, for the match_trace */
  domainReasons: Record<string, string[]>;
  secondaryReasons: Record<string, string[]>;
  timingReasons: Record<string, string[]>;
  /** assessment option values that matched no rule */
  unmatched: string[];
}

function addWeight(map: Record<string, number>, key: string, w: number): void {
  map[key] = (map[key] ?? 0) + w;
}

/** Collect individual option VALUE strings from the payload for a signal's readKeys. */
function collectValues(payload: Record<string, unknown>, readKeys: string[]): string[] {
  const out: string[] = [];
  for (const key of readKeys) {
    const raw = payload[key];
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      for (const el of raw) {
        if (el == null) continue;
        const s = typeof el === "object" ? JSON.stringify(el) : String(el);
        if (s.trim()) out.push(s.trim());
      }
    } else if (typeof raw === "string") {
      if (raw.trim()) out.push(raw.trim());
    } else if (typeof raw !== "object") {
      out.push(String(raw).trim());
    }
  }
  return out;
}

function ruleMatches(rule: VocabRule, valueLower: string): boolean {
  let matched = false;
  if (rule.exact && rule.exact.some((e) => e.toLowerCase() === valueLower)) matched = true;
  if (!matched && rule.anyToken && rule.anyToken.some((t) => valueLower.includes(t.toLowerCase()))) matched = true;
  if (matched && rule.notToken && rule.notToken.some((t) => valueLower.includes(t.toLowerCase()))) matched = false;
  return matched;
}

/**
 * Score the assessment payload against the vocabulary.
 * @param opts.type1 when true, consume stored riskDomainScores + derive_applicable_domains (Type-1 only).
 */
export function scoreVocabulary(
  payload: Record<string, unknown>,
  opts: { type1?: boolean } = {},
): VocabScore {
  const v = vocab();
  const score: VocabScore = {
    domainWeights: {},
    secondaryKeywords: {},
    timingKeywords: {},
    domainReasons: {},
    secondaryReasons: {},
    timingReasons: {},
    unmatched: [],
  };
  const pushReason = (bucket: Record<string, string[]>, key: string, reason: string) => {
    (bucket[key] ??= []).push(reason);
  };

  for (const signal of v.signals) {
    const values = collectValues(payload, signal.readKeys);
    for (const value of values) {
      const valueLower = value.toLowerCase();
      let any = false;
      for (const rule of signal.rules) {
        if (!ruleMatches(rule, valueLower)) continue;
        any = true;
        for (const [dom, w] of Object.entries(rule.domains ?? {})) {
          const d = normalizeDomain(dom);
          addWeight(score.domainWeights, d, w);
          pushReason(score.domainReasons, d, `${signal.id}:"${value}" +${w}`);
        }
        for (const [kw, w] of Object.entries(rule.secondaryKeywords ?? {})) {
          // MAX, not SUM: "has regulatory requirements" counts once (+2), not +2 per regulation —
          // otherwise compliance inflates every domain and buries a strong dataSensitivity signal.
          score.secondaryKeywords[kw] = Math.max(score.secondaryKeywords[kw] ?? 0, w);
          pushReason(score.secondaryReasons, kw, `${signal.id}:"${value}" +${w}`);
        }
        for (const [kw, w] of Object.entries(rule.timingKeywords ?? {})) {
          score.timingKeywords[kw] = Math.max(score.timingKeywords[kw] ?? 0, w);
          pushReason(score.timingReasons, kw, `${signal.id}:"${value}" +${w}`);
        }
      }
      if (!any && !score.unmatched.includes(value)) score.unmatched.push(value);
    }
  }

  // Per-assessment domain scores — Type-1 only (COTS riskDomainScores is catalogue-wide, unusable).
  if (opts.type1 || !v.riskDomainScores.onlyWhenType1) {
    const parsed = parseRiskDomainScores(payload);
    if (parsed.length > 0) {
      const max = Math.max(...parsed.map((p) => p.score), 1);
      for (const { domain, score: s } of parsed) {
        if (s <= 0) continue;
        const d = normalizeDomain(domain);
        const w = (s / max) * v.riskDomainScores.normalizedMax; // normalise 0..3
        addWeight(score.domainWeights, d, w);
        pushReason(score.domainReasons, d, `riskDomainScores:${d} +${w.toFixed(2)}`);
      }
    }
    for (const domain of deriveApplicableDomainsType1(payload)) {
      const d = normalizeDomain(domain);
      addWeight(score.domainWeights, d, 1);
      pushReason(score.domainReasons, d, `derive_applicable_domains:${d} +1`);
    }
  }

  return score;
}

/** Parse a stored risk_domain_scores blob: array of {domain,score} or object {domain:score}. */
function parseRiskDomainScores(payload: Record<string, unknown>): Array<{ domain: string; score: number }> {
  let raw: unknown = payload.risk_domain_scores ?? payload.riskDomainScores;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const out: Array<{ domain: string; score: number }> = [];
  if (Array.isArray(raw)) {
    for (const el of raw) {
      if (el && typeof el === "object") {
        const o = el as Record<string, unknown>;
        const domain = String(o.domain ?? o.name ?? o.label ?? "").trim();
        const score = Number(o.riskScore ?? o.score ?? o.value ?? o.riskCount ?? 0);
        if (domain && Number.isFinite(score)) out.push({ domain, score });
      }
    }
  } else if (raw && typeof raw === "object") {
    for (const [domain, s] of Object.entries(raw as Record<string, unknown>)) {
      const score = Number(s);
      if (domain.trim() && Number.isFinite(score)) out.push({ domain: domain.trim(), score });
    }
  }
  return out;
}

/**
 * TS port of python derive_applicable_domains (scoring_service.py:2116) — Type-1 signal only.
 * Domain names are returned normalised to the exact catalogue strings.
 */
export function deriveApplicableDomainsType1(payload: Record<string, unknown>): string[] {
  const text = (keys: string[]): string =>
    keys
      .map((k) => payload[k])
      .filter((x) => x != null)
      .map((x) => (Array.isArray(x) ? x.join(" ") : typeof x === "object" ? JSON.stringify(x) : String(x)))
      .join(" ")
      .toLowerCase();

  const caps = text(["ai_capabilities", "productFeatures", "ai_model_types", "use_case", "use_cases"]);
  const autonomy = text(["decision_autonomy", "ai_autonomy_level"]);
  const pii = text(["pii_handling", "pii_information", "dataSensitivity", "data_sensitivity"]);
  const residency = text(["data_residency", "data_region"]);
  const scale = text(["scale", "deployment_scale", "organization_size"]);
  const volume = text(["data_volume", "volume"]);

  const generative = /generat|gpt|llm|content|text\)|image/.test(caps);
  const publicFacing = /public|consumer|customer-facing|general public/.test(caps + " " + text(["impactedStakeholders"]));
  const isAutonomous = /fully autonomous|autonomous|supervised|operates independently|human monitors/.test(autonomy);
  const isFullyOrAutonomous = /fully autonomous|autonomous|operates independently|human monitors/.test(autonomy);
  const piiPresent =
    pii.trim() !== "" && !/no pii|none|not_applicable|not applicable|anonymous/.test(pii);
  const decisionLike = /decision|hiring|credit|people|hr|screen|loan|underwrit/.test(caps);

  const out = new Set<string>();
  if (generative || publicFacing) out.add("Malicious Actors and Misuse");
  if (piiPresent || residency.trim() !== "") out.add("Privacy and Security");
  if (isAutonomous) out.add("AI System Safety, Failures, and Limitations");
  if (decisionLike || isAutonomous) out.add("Discrimination and Toxicity");
  if (generative) out.add("Misinformation");
  if (isFullyOrAutonomous) out.add("Human-Computer Interaction");
  if (/^enterprise/.test(scale) || volume.includes("petabyte")) out.add("Socioeconomic and Environmental");
  return [...out].map(normalizeDomain);
}
