import "dotenv/config";
import { invokeBedrockAnthropicText } from "../../utils/invokeBedrockWithUsage.js";
import { isTokenQuotaExceededError } from "../../services/admin/featureTokenQuota.service.js";
import { clampScore2 } from "../../utils/roundScore.js";

export type ImplementationRecommendation = "Proceed" | "Proceed with conditions" | "Defer";

export type ImplementationRiskAssessmentPayload = {
  scoreAndRecommendation: {
    overallScore: number;
    recommendation: ImplementationRecommendation;
    rationale: string;
  };
  breakdown: {
    // Per-dimension scores are intentionally optional: the stored IRS has no
    // per-dimension breakdown, so these carry qualitative summaries only and are
    // never a fabricated number. The headline overallScore is the authoritative
    // stored IRS.
    vendorFit: { score?: number; summary: string };
    orgReadinessGap: { score?: number; summary: string };
    integrationRisk: { score?: number; summary: string };
  };
  readinessGaps: {
    technical: string[];
    governance: string[];
    talent: string[];
  };
  timelineImpact: {
    drivers: string[];
    assumptions: string[];
    narrative: string;
  };
  budgetImpactMvp: {
    roughOrderOfMagnitude: string;
    notes: string;
  };
  /** True when the AI narrative could not be generated; headline score still stands. */
  isFallback?: boolean;
};

const PROMPT = `You are an enterprise implementation and program risk analyst. The user has a COMPLETE buyer vendor risk assessment report (JSON), optional database-matched catalog risks with mitigations, and optional buyer validation notes.

The authoritative implementation readiness SCORE and the Proceed/Defer decision are computed from the stored assessment, NOT by you — do not output a headline score or recommendation. Provide the qualitative analysis only.

Output ONLY valid JSON (no markdown, no code fences) with exactly these keys:

{
  "scoreAndRecommendation": {
    "rationale": "<2-5 sentences explaining the readiness picture; do NOT state a numeric score>"
  },
  "breakdown": {
    "vendorFit": { "summary": "<vendor/product fit vs buyer need>" },
    "orgReadinessGap": { "summary": "<governance, maturity, change>" },
    "integrationRisk": { "summary": "<systems, APIs, data flows>" }
  },
  "readinessGaps": {
    "technical": ["<gap>", "..."],
    "governance": ["<gap>", "..."],
    "talent": ["<gap>", "..."]
  },
  "timelineImpact": {
    "drivers": ["<driver that lengthens or shortens schedule>", "..."],
    "assumptions": ["<explicit assumption>", "..."],
    "narrative": "<how timeline is affected; 2-5 sentences>"
  },
  "budgetImpactMvp": {
    "roughOrderOfMagnitude": "<e.g. $X–$Y for MVP pilot; use bands if uncertain>",
    "notes": "<what drives cost; what is excluded>"
  }
}

Rules:
- readinessGaps: 3-6 bullets per category where applicable; use empty arrays only if truly none.
- Use only information supported by inputs; if thin, state limitations in narrative fields.`;

function extractJsonObject(text: string): Record<string, unknown> | null {
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(raw: unknown, max = 12): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).map((x) => String(x).slice(0, 500)).filter(Boolean).slice(0, max);
}

/** The stored IRS (0-100, higher = safer/better fit) drives the headline score. */
export function storedIrsFromReport(completeReport: Record<string, unknown>): number {
  const n = Number(completeReport.overallRiskScore);
  return Number.isFinite(n) ? clampScore2(n) : NaN;
}

/**
 * Proceed/Defer is a deterministic mapping of the stored IRS — not an LLM call
 * and not a change to any scoring weight. With no authoritative score we do not
 * recommend proceeding.
 */
export function recommendationFromStoredIrs(score: number): ImplementationRecommendation {
  if (!Number.isFinite(score)) return "Defer";
  return score >= 75 ? "Proceed" : score >= 50 ? "Proceed with conditions" : "Defer";
}

/** Build the final payload: headline from the stored IRS, narrative from the LLM. */
function buildPayload(
  storedScore: number,
  rationale: string,
  narrative: Omit<ImplementationRiskAssessmentPayload, "scoreAndRecommendation" | "isFallback"> | null,
  isFallback: boolean,
): ImplementationRiskAssessmentPayload {
  const base: Omit<ImplementationRiskAssessmentPayload, "scoreAndRecommendation" | "isFallback"> =
    narrative ?? {
      breakdown: {
        vendorFit: { summary: "—" },
        orgReadinessGap: { summary: "—" },
        integrationRisk: { summary: "—" },
      },
      readinessGaps: { technical: [], governance: [], talent: [] },
      timelineImpact: { drivers: [], assumptions: [], narrative: "—" },
      budgetImpactMvp: { roughOrderOfMagnitude: "—", notes: "—" },
    };
  return {
    scoreAndRecommendation: {
      overallScore: storedScore,
      recommendation: recommendationFromStoredIrs(storedScore),
      rationale,
    },
    ...base,
    ...(isFallback ? { isFallback: true } : {}),
  };
}

/** Parse ONLY the qualitative narrative from the LLM; scores are ignored here. */
function narrativeFromRaw(
  raw: Record<string, unknown>,
): Omit<ImplementationRiskAssessmentPayload, "scoreAndRecommendation" | "isFallback"> {
  const bRaw = raw.breakdown as Record<string, unknown> | undefined;
  const vf = bRaw?.vendorFit as Record<string, unknown> | undefined;
  const org = bRaw?.orgReadinessGap as Record<string, unknown> | undefined;
  const ir = bRaw?.integrationRisk as Record<string, unknown> | undefined;
  const breakdown: ImplementationRiskAssessmentPayload["breakdown"] = {
    vendorFit: { summary: String(vf?.summary ?? "—").slice(0, 2000) },
    orgReadinessGap: { summary: String(org?.summary ?? "—").slice(0, 2000) },
    integrationRisk: { summary: String(ir?.summary ?? "—").slice(0, 2000) },
  };

  const rgRaw = raw.readinessGaps as Record<string, unknown> | undefined;
  const readinessGaps = {
    technical: asStringArray(rgRaw?.technical),
    governance: asStringArray(rgRaw?.governance),
    talent: asStringArray(rgRaw?.talent),
  };

  const tiRaw = raw.timelineImpact as Record<string, unknown> | undefined;
  const timelineImpact = {
    drivers: asStringArray(tiRaw?.drivers),
    assumptions: asStringArray(tiRaw?.assumptions),
    narrative: String(tiRaw?.narrative ?? "—").slice(0, 3000),
  };

  const biRaw = raw.budgetImpactMvp as Record<string, unknown> | undefined;
  const budgetImpactMvp = {
    roughOrderOfMagnitude: String(biRaw?.roughOrderOfMagnitude ?? "—").slice(0, 500),
    notes: String(biRaw?.notes ?? "—").slice(0, 2000),
  };

  return { breakdown, readinessGaps, timelineImpact, budgetImpactMvp };
}

function rationaleFromRaw(raw: Record<string, unknown>, completeReport: Record<string, unknown>): string {
  const srRaw = raw.scoreAndRecommendation as Record<string, unknown> | undefined;
  const fromLlm = String(srRaw?.rationale ?? "").trim();
  if (fromLlm) return fromLlm.slice(0, 3000);
  return String(completeReport.executiveSummary ?? "").slice(0, 1500) || "See complete assessment for context.";
}

async function invokeModel(prompt: string): Promise<string> {
  return invokeBedrockAnthropicText({
    prompt,
    maxTokens: 8192,
    temperature: 0.3,
    feature: "reports",
  });
}

export async function generateImplementationRiskAssessmentReport(
  completeReport: Record<string, unknown>,
  dbRisksBlock: string,
  buyerValidationSnippet: string,
): Promise<ImplementationRiskAssessmentPayload> {
  const storedScore = storedIrsFromReport(completeReport);
  const userPrompt = [
    PROMPT,
    "",
    dbRisksBlock ? dbRisksBlock : "(No database-matched catalog risks block for this run.)",
    "",
    "--- Buyer validation / testing notes (may be empty) ---",
    buyerValidationSnippet.slice(0, 6000),
    "",
    "--- Complete buyer vendor risk report (JSON) ---",
    JSON.stringify(completeReport, null, 2).slice(0, 24000),
    "",
    "Respond with ONLY the JSON object for the keys above.",
  ].join("\n");

  try {
    const rawText = await invokeModel(userPrompt);
    const parsed = extractJsonObject(rawText);
    if (parsed) {
      return buildPayload(
        storedScore,
        rationaleFromRaw(parsed, completeReport),
        narrativeFromRaw(parsed),
        false,
      );
    }
  } catch (e) {
    if (isTokenQuotaExceededError(e)) throw e;
    console.error("generateImplementationRiskAssessmentReport LLM error:", e);
  }
  // LLM unavailable: keep the authoritative stored-IRS headline, mark the
  // narrative as a fallback instead of fabricating analysis.
  const execSummary = String(completeReport.executiveSummary ?? "").slice(0, 1500);
  return buildPayload(
    storedScore,
    execSummary || "AI narrative unavailable — headline score is from the stored implementation risk result.",
    null,
    true,
  );
}
