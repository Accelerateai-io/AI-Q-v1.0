/**
 * IRS Factor Explanations
 *
 * Converts existing IRS score trace components into structured IrsFactorExplanation[].
 * Reads from the output of buildIrsScoreTrace() — no new math, no formula changes.
 *
 * INTERNAL USE ONLY. Never expose to buyer or vendor users.
 */

import type { ScoreTrace } from "../types/scoreTrace.js";

export type IrsFactorCategory = "OrgReadiness" | "Integration" | "VendorRisk";

export interface IrsFactorExplanation {
  /** Scoring sub-category this factor belongs to. */
  category: IrsFactorCategory;
  /** Human-readable factor label (from ScoreTraceComponent.label). */
  factor: string;
  /** Readiness status derived from the component's contribution direction and label. */
  status: "strong" | "present" | "weak" | "missing";
  /**
   * IRS impact of this component (negative = cost to final score, positive = benefit).
   * Taken directly from ScoreTraceComponent.contribution — no new math.
   */
  contribution: number;
  /**
   * Absolute deduction from final IRS score. 0 for neutral/positive components.
   * Equals Math.abs(contribution) when contribution < 0.
   */
  deduction: number;
  /**
   * Estimated IRS points recoverable if this factor is remediated.
   * Equals deduction for missing/weak factors; 0 for present/strong.
   */
  estimatedLift: number;
  /** Explanation of why this affects the score. From component.reason — not fabricated. */
  reason: string;
  /** Recommended action to address this factor. From missingEvidence hints or derived from label. */
  improvement: string;
  /** DB field(s) this factor reads from. From component.sourceLabel. */
  sourceField: string;
  /**
   * True for VendorRisk category — vendor trust score internals should not be buyer-facing.
   * All other IRS factors are internal-use visible (gated by requireInternalUser).
   */
  internalOnly: boolean;
}

// Regex matching base-risk baseline components — always-present overhead, not actionable
const BASE_LABEL_RE = /^(organizational readiness\s*[—\-–]\s*base|integration risk\s*[—\-–]\s*base)/i;

// Labels that signal a factor is fully absent (vs. partially degraded)
const MISSING_LABEL_RE =
  /(\bnot\b.*\bavailable\b|\bnot\b.*\bconfirmed\b|\bnot\b.*\blinked\b|\bnot\b.*\bspecified\b|\bno\/limited\b|^no\s+|^missing\s+)/i;

function classifyStatus(
  contribution: number,
  label: string,
): IrsFactorExplanation["status"] {
  if (contribution > 0) return "strong";
  if (contribution === 0) return "present";
  // Negative: distinguish fully absent vs. degraded
  if (MISSING_LABEL_RE.test(label)) return "missing";
  return "weak";
}

function normalizeCategory(raw: string): IrsFactorCategory {
  const s = raw.toLowerCase();
  if (s.includes("vendor")) return "VendorRisk";
  if (s.includes("integration")) return "Integration";
  return "OrgReadiness";
}

/**
 * Parse missingEvidence entries into a keyword→improvement map.
 *
 * Each entry has the shape: "<subject> — <improvement action>."
 * We key the map by the subject text (lowercased) so we can match against
 * component labels using shared significant words (length ≥ 4).
 */
function buildImprovementMap(missingEvidence: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const ev of missingEvidence) {
    const sepIdx = ev.indexOf(" — ");
    if (sepIdx === -1) continue;
    const subject = ev.substring(0, sepIdx).toLowerCase();
    const action = ev.substring(sepIdx + 3).trim();
    map.set(subject, action);
  }
  return map;
}

function findImprovement(label: string, map: Map<string, string>): string | undefined {
  const lowerLabel = label.toLowerCase();
  for (const [subject, action] of map) {
    const words = subject.split(/\W+/).filter((w) => w.length >= 4);
    const hits = words.filter((w) => lowerLabel.includes(w)).length;
    // Require ≥ 2 matching significant words (or 1 if the subject is a single word)
    if (hits >= 2 || (words.length === 1 && hits === 1)) {
      return action;
    }
  }
  return undefined;
}

function deriveImprovement(label: string, estimatedLift: number): string {
  const l = label.toLowerCase();
  if (l.includes("digital maturity"))
    return "Improve digital maturity to medium or advanced level to reduce organizational readiness gap.";
  if (l.includes("data governance") || l.includes("governance maturity"))
    return "Strengthen data governance practices to managed or optimized level.";
  if (l.includes("criticality") || l.includes("risk appetite"))
    return "Reassess risk appetite or reduce implementation criticality classification.";
  if (l.includes("requirement gap") || l.includes("currently using product") || l.includes("not currently using"))
    return "Pilot or gain experience with the product before full implementation to reduce integration risk.";
  if (l.includes("team") || l.includes("team composition"))
    return "Expand implementation team to include at least four qualified members.";
  if (l.includes("rollback"))
    return "Establish automated or robust rollback capability before deployment.";
  if (l.includes("integration system"))
    return "Reduce integration system count or phase the implementation to lower integration risk.";
  return `Address the identified gap to recover approximately ${estimatedLift.toFixed(1)} IRS points.`;
}

/**
 * Convert the components[] from a completed IRS ScoreTrace into structured factor explanations.
 *
 * - Does NOT recalculate any sub-scores or the final IRS value.
 * - Reads contribution values directly from the trace.
 * - Skips base-risk baseline components (they are always-present overhead, not actionable).
 * - Derives improvement text from missingEvidence entries first; falls back to label-based heuristics.
 */
export function buildIrsFactorExplanations(trace: ScoreTrace): IrsFactorExplanation[] {
  const improvementMap = buildImprovementMap(trace.missingEvidence);
  const explanations: IrsFactorExplanation[] = [];

  for (const c of trace.components) {
    // Base-risk components are structural overhead, not individually actionable
    if (BASE_LABEL_RE.test(c.label)) continue;

    const category = normalizeCategory(c.category);
    const status = classifyStatus(c.contribution, c.label);
    // Round to 2dp to avoid floating-point noise; preserve sign in contribution
    const deduction =
      c.contribution < 0 ? Math.round(Math.abs(c.contribution) * 100) / 100 : 0;
    const estimatedLift = status === "missing" || status === "weak" ? deduction : 0;

    const improvement =
      estimatedLift > 0
        ? (findImprovement(c.label, improvementMap) ?? deriveImprovement(c.label, estimatedLift))
        : "No action needed.";

    explanations.push({
      category,
      factor: c.label,
      status,
      contribution: c.contribution,
      deduction,
      estimatedLift,
      reason: c.reason,
      improvement,
      sourceField: c.sourceLabel,
      internalOnly: category === "VendorRisk",
    });
  }

  return explanations;
}
