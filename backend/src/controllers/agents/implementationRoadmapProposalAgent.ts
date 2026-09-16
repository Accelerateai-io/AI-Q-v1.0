import "dotenv/config";
import { invokeBedrockAnthropicText } from "../../utils/invokeBedrockWithUsage.js";
import { isTokenQuotaExceededError } from "../../services/admin/featureTokenQuota.service.js";

export type ImplementationRoadmapProposalPayload = {
  version: number;
  deployment: {
    model: string;
    architectureSummary: string;
    notes: string[];
  };
  phases: Array<{ name: string; goals: string; bullets: string[] }>;
  integrations: {
    items: string[];
    dataFlows: string[];
  };
  resources: {
    vendorRoles: string[];
    customerRoles: string[];
    timeCommitments: string[];
  };
  riskGates: Array<{ name: string; notes: string }>;
  timeline: {
    estimate: string;
    assumptions: string[];
  };
};

const IMPLEMENTATION_ROADMAP_PROMPT = `You are an implementation and delivery analyst. Using ONLY the Assessment Analysis Report and Vendor Attestation data provided below, generate an Implementation Roadmap Proposal.

Output ONLY valid JSON (no markdown, no code fences) with exactly this shape:

{
  "deployment": {
    "model": "<SaaS | on-prem | hybrid | other, from inputs>",
    "architectureSummary": "<high-level components, topology, or data path>",
    "notes": ["<optional extra bullet>", "..."]
  },
  "phases": [
    { "name": "Pilot", "goals": "<goals and scope>", "bullets": [] },
    { "name": "Limited Production", "goals": "<goals and scope>", "bullets": [] },
    { "name": "Full Production", "goals": "<goals and scope>", "bullets": [] }
  ],
  "integrations": {
    "items": ["<SSO, SCIM, APIs, etc.>"],
    "dataFlows": ["<key data flow or touchpoint>"]
  },
  "resources": {
    "vendorRoles": ["<role or team>"],
    "customerRoles": ["<role or team>"],
    "timeCommitments": ["<kickoff, UAT, go-live effort if mentioned>"]
  },
  "riskGates": [
    { "name": "SSO/SCIM", "notes": "<readiness or requirement>" },
    { "name": "Security review", "notes": "<from inputs>" },
    { "name": "UAT", "notes": "<from inputs>" },
    { "name": "Data readiness", "notes": "<from inputs>" }
  ],
  "timeline": {
    "estimate": "<timeline if present>",
    "assumptions": ["<scope, dependency, or constraint>"]
  }
}

Rules:
- Use only data present in the inputs. If a field is missing, use "Not specified" or "To be confirmed" (empty arrays only when truly none).
- Keep phases in this order: Pilot, Limited Production, Full Production.
- Keep the four riskGates listed above; add extra gates only if clearly present in inputs.
- Do not invent vendors, dates, or integrations.`;

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
  return (raw as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max);
}

function str(v: unknown, fallback = "Not specified"): string {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function normalizePayload(raw: Record<string, unknown>): ImplementationRoadmapProposalPayload {
  const dep = (raw.deployment as Record<string, unknown> | undefined) ?? {};
  const integ = (raw.integrations as Record<string, unknown> | undefined) ?? {};
  const res = (raw.resources as Record<string, unknown> | undefined) ?? {};
  const tl = (raw.timeline as Record<string, unknown> | undefined) ?? {};
  const phasesRaw = Array.isArray(raw.phases) ? raw.phases : [];
  const gatesRaw = Array.isArray(raw.riskGates) ? raw.riskGates : [];

  const defaultPhases = ["Pilot", "Limited Production", "Full Production"];
  const phases =
    phasesRaw.length > 0
      ? phasesRaw.slice(0, 6).map((p, i) => {
          const o = (p ?? {}) as Record<string, unknown>;
          return {
            name: str(o.name, defaultPhases[i] ?? `Phase ${i + 1}`),
            goals: str(o.goals ?? o.scope),
            bullets: asStringArray(o.bullets),
          };
        })
      : defaultPhases.map((name) => ({ name, goals: "Not specified", bullets: [] as string[] }));

  const defaultGates = ["SSO/SCIM", "Security review", "UAT", "Data readiness"];
  const riskGates =
    gatesRaw.length > 0
      ? gatesRaw.slice(0, 8).map((g, i) => {
          const o = (g ?? {}) as Record<string, unknown>;
          return {
            name: str(o.name, defaultGates[i] ?? `Gate ${i + 1}`),
            notes: str(o.notes ?? o.status),
          };
        })
      : defaultGates.map((name) => ({ name, notes: "Not specified" }));

  return {
    version: 1,
    deployment: {
      model: str(dep.model),
      architectureSummary: str(dep.architectureSummary ?? dep.summary),
      notes: asStringArray(dep.notes),
    },
    phases,
    integrations: {
      items: asStringArray(integ.items ?? integ.integrations),
      dataFlows: asStringArray(integ.dataFlows ?? integ.dataFlow),
    },
    resources: {
      vendorRoles: asStringArray(res.vendorRoles),
      customerRoles: asStringArray(res.customerRoles),
      timeCommitments: asStringArray(res.timeCommitments),
    },
    riskGates,
    timeline: {
      estimate: str(tl.estimate ?? tl.timelineEstimate),
      assumptions: asStringArray(tl.assumptions),
    },
  };
}

function buildContext(reportJson: Record<string, unknown>, attestationSummary: string): string {
  const reportStr =
    typeof reportJson === "object" && reportJson !== null
      ? JSON.stringify(reportJson, null, 2)
      : String(reportJson);
  return [
    "--- Assessment Analysis Report (for this assessment) ---",
    reportStr.slice(0, 12000),
    "--- End of report ---",
    "",
    "--- Vendor Attestation (product selected) ---",
    attestationSummary.slice(0, 8000),
    "--- End of attestation ---",
  ].join("\n");
}

async function invokeModel(userInput: string): Promise<string> {
  return invokeBedrockAnthropicText({
    prompt: userInput,
    maxTokens: 4096,
    temperature: 0.3,
    feature: "reports",
  });
}

/**
 * Generate Implementation Roadmap Proposal (sections 28–33) from assessment report + vendor attestation.
 * Returns a JSON string for general_reports.content.
 */
export async function generateImplementationRoadmapProposal(
  reportJson: Record<string, unknown>,
  attestationSummary: string
): Promise<string> {
  const context = buildContext(reportJson, attestationSummary);
  const userInput = [
    IMPLEMENTATION_ROADMAP_PROMPT,
    "",
    context,
    "",
    "Respond with ONLY the JSON object.",
  ].join("\n");

  try {
    const raw = await invokeModel(userInput);
    const parsed = extractJsonObject(raw);
    if (parsed) return JSON.stringify(normalizePayload(parsed));
    return raw;
  } catch (e) {
    if (isTokenQuotaExceededError(e)) throw e;
    throw e;
  }
}
