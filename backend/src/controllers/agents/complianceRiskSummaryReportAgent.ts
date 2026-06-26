import "dotenv/config";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.AWS_DEFAULT_REGION || "us-east-1";
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";
const client = new BedrockRuntimeClient({ region: REGION });

export type RagLevel = "Red" | "Amber" | "Green";

export type ComplianceRiskExecutiveSummary = {
  inherentRag: RagLevel;
  residualRag: RagLevel;
  /** Narrative: inherent risk posture → controls/residual (3–6 sentences). */
  summary: string;
};

export type ComplianceTopRiskRow = {
  rank: number;
  title: string;
  /** Likelihood 1–5 */
  likelihood: number;
  /** Impact 1–5 */
  impact: number;
  /** L×I (1–25) or equivalent composite */
  lxi: number;
  drivers: string[];
};

export type ComplianceMappingRow = {
  framework: string;
  requirement: string;
  vendorControlOrEvidence: string;
};

export type ComplianceRiskSummaryPayload = {
  executiveRiskSummary: ComplianceRiskExecutiveSummary;
  topRisks: ComplianceTopRiskRow[];
  complianceMapping: ComplianceMappingRow[];
  /** Buyer-entered validation / diligence notes (may be empty). */
  vendorValidationNotes: string;
  methodologyEvidenceTrail: string;
};

const PROMPT = `You are an enterprise compliance and risk officer. The user has a COMPLETE buyer vendor risk assessment report (JSON), optional database-matched catalog risks with mitigations, optional buyer validation/testing notes, and vendor attestation excerpts.

Output ONLY valid JSON (no markdown, no code fences) with exactly these keys:

{
  "executiveRiskSummary": {
    "inherentRag": "Red" | "Amber" | "Green",
    "residualRag": "Red" | "Amber" | "Green",
    "summary": "<3-6 sentences: inherent risk posture → treatment → residual; reference buyer context and vendor evidence>"
  },
  "topRisks": [
    { "rank": 1, "title": "<short>", "likelihood": <1-5>, "impact": <1-5>, "lxi": <1-25 integer, typically likelihood*impact>, "drivers": ["<driver>", "..."] }
  ],
  "complianceMapping": [
    { "framework": "<e.g. ISO 27001, SOC 2, GDPR>", "requirement": "<specific obligation or control theme>", "vendorControlOrEvidence": "<what vendor attests / evidence from inputs>" }
  ],
  "vendorValidationNotes": "<synthesize buyer-entered validation/testing notes if provided below; otherwise state that no buyer validation notes were supplied and list recommended diligence>",
  "methodologyEvidenceTrail": "<how this summary was derived: inputs used (assessment, catalog risks, attestation), limitations, and what would strengthen assurance>"
}

Rules:
- RAG: Red = unacceptable / high exposure without strong mitigation; Amber = manageable with conditions; Green = aligned / low residual concern for stated use.
- topRisks: 5–8 rows, ranked 1..n by L×I descending; likelihood and impact must be integers 1–5; lxi must align (likelihood * impact unless you justify a different composite in methodology).
- complianceMapping: at least 4 rows mapping frameworks relevant to regulatory/sensitivity in the assessment to vendor-side controls or gaps.
- If database-matched risks are provided, align topRisks and executive narrative with those catalog items where applicable.
Use only information supported by inputs; if thin, say so conservatively.`;

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

function parseRag(v: unknown): RagLevel {
  const s = String(v ?? "").trim();
  if (s === "Red" || s === "Amber" || s === "Green") return s;
  return "Amber";
}

function normalizePayload(raw: Record<string, unknown>, fb: ComplianceRiskSummaryPayload): ComplianceRiskSummaryPayload {
  const execRaw = raw.executiveRiskSummary as Record<string, unknown> | undefined;
  const executiveRiskSummary: ComplianceRiskExecutiveSummary = execRaw
    ? {
        inherentRag: parseRag(execRaw.inherentRag),
        residualRag: parseRag(execRaw.residualRag),
        summary: String(execRaw.summary ?? fb.executiveRiskSummary.summary).slice(0, 4000),
      }
    : fb.executiveRiskSummary;

  const topRisks: ComplianceTopRiskRow[] = Array.isArray(raw.topRisks)
    ? (raw.topRisks as unknown[])
        .map((row, i) => {
          const o = row as Record<string, unknown>;
          const L = Math.min(5, Math.max(1, Math.round(Number(o.likelihood) || 3)));
          const I = Math.min(5, Math.max(1, Math.round(Number(o.impact) || 3)));
          const lxiRaw = Number(o.lxi);
          const lxi = Number.isFinite(lxiRaw)
            ? Math.min(25, Math.max(1, Math.round(lxiRaw)))
            : L * I;
          const drivers = Array.isArray(o.drivers)
            ? (o.drivers as unknown[]).map((d) => String(d).slice(0, 400)).filter(Boolean).slice(0, 8)
            : [];
          return {
            rank: Number.isFinite(Number(o.rank)) ? Math.max(1, Math.round(Number(o.rank))) : i + 1,
            title: String(o.title ?? `Risk ${i + 1}`).slice(0, 300),
            likelihood: L,
            impact: I,
            lxi,
            drivers: drivers.length > 0 ? drivers : ["See assessment context"],
          };
        })
        .sort((a, b) => b.lxi - a.lxi)
        .map((r, i) => ({ ...r, rank: i + 1 }))
    : fb.topRisks;

  const complianceMapping: ComplianceMappingRow[] = Array.isArray(raw.complianceMapping)
    ? (raw.complianceMapping as unknown[])
        .map((row) => {
          const o = row as Record<string, unknown>;
          return {
            framework: String(o.framework ?? "").slice(0, 200),
            requirement: String(o.requirement ?? "").slice(0, 800),
            vendorControlOrEvidence: String(o.vendorControlOrEvidence ?? "").slice(0, 1200),
          };
        })
        .filter((r) => r.framework && r.requirement)
    : fb.complianceMapping;

  const vendorValidationNotes = String(raw.vendorValidationNotes ?? fb.vendorValidationNotes).slice(0, 8000);
  const methodologyEvidenceTrail = String(raw.methodologyEvidenceTrail ?? fb.methodologyEvidenceTrail).slice(0, 8000);

  return {
    executiveRiskSummary,
    topRisks: topRisks.length > 0 ? topRisks : fb.topRisks,
    complianceMapping: complianceMapping.length > 0 ? complianceMapping : fb.complianceMapping,
    vendorValidationNotes,
    methodologyEvidenceTrail,
  };
}

function fallbackPayload(completeReport: Record<string, unknown>, validationNotes: string): ComplianceRiskSummaryPayload {
  const overall = Number(completeReport.overallRiskScore);
  const inherentRag: RagLevel =
    Number.isFinite(overall) && overall >= 70 ? "Green" : Number.isFinite(overall) && overall >= 45 ? "Amber" : "Red";
  return {
    executiveRiskSummary: {
      inherentRag,
      residualRag: inherentRag === "Green" ? "Green" : "Amber",
      summary: String(completeReport.executiveSummary ?? "").slice(0, 2000) || "See complete vendor risk assessment for context.",
    },
    topRisks: [
      {
        rank: 1,
        title: "Residual AI / data risk",
        likelihood: 3,
        impact: 4,
        lxi: 12,
        drivers: ["Data sensitivity", "Model behavior", "Integration scope"],
      },
    ],
    complianceMapping: [
      {
        framework: "Organizational policy",
        requirement: "Align vendor processing with buyer data classification",
        vendorControlOrEvidence: "Cross-check attestation and complete report strengths/gaps.",
      },
    ],
    vendorValidationNotes: validationNotes.trim() || "No buyer validation notes were provided in the assessment payload.",
    methodologyEvidenceTrail:
      "Derived from stored complete buyer vendor risk assessment JSON; augment with catalog risks and buyer notes when present.",
  };
}

async function invokeModel(prompt: string): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8192,
    temperature: 0.3,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  });
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body,
  });
  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content?.[0]?.text ?? "";
}

/**
 * Sections 39–43: Compliance & Risk Summary from enriched complete report + optional DB risks + buyer validation snippet.
 */
export async function generateComplianceRiskSummaryReport(
  completeReport: Record<string, unknown>,
  dbRisksBlock: string,
  buyerValidationSnippet: string,
): Promise<ComplianceRiskSummaryPayload> {
  const fb = fallbackPayload(completeReport, buyerValidationSnippet);
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
    if (parsed) return normalizePayload(parsed, fb);
  } catch (e) {
    console.error("generateComplianceRiskSummaryReport LLM error:", e);
  }
  return fb;
}
