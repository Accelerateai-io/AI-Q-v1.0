import "dotenv/config";
import { invokeBedrockAnthropicText } from "../../utils/invokeBedrockWithUsage.js";

const SALES_REPORT_PROMPT = `You are a sales qualification analyst. Using ONLY the Assessment Analysis Report and Vendor Attestation data provided below, generate a Sales Qualification Report in this exact format. Use clear headings and bullets. Do not invent data not present in the inputs.

## Qualification decision + rationale (3-5 bullets)
- [Bullet 1 – key rationale for qualify/disqualify]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4 – if supported by data]
- [Bullet 5 – if supported by data]

## Score summary: SalesQualificationScore + WinProbability
- **SalesQualificationScore:** [Score or band, e.g. 1-10 or High/Medium/Low – derive from report data]
- **WinProbability:** [Percentage or band – derive from report data]

## Score breakdown: Customer Friction / Implementation / Competitive
- **Customer Friction:** [Summary and score or level from report]
- **Implementation:** [Summary and score or level from report]
- **Competitive:** [Summary and score or level from report]

## Top blockers (max 3) + severity + evidence (which input triggered it)
- **Blocker:** [Description] – Severity: [High/Medium/Low] – Evidence: [which input or finding triggered it]
- **Blocker:** [Description] – Severity: [High/Medium/Low] – Evidence: [which input triggered it]
- **Blocker:** [Description] – Severity: [High/Medium/Low] – Evidence: [which input triggered it]

## Recommended actions (max 5) mapped to blockers
- [Action – mapped to a blocker]
- [Action – mapped to a blocker]
- [Action – mapped to a blocker]
- [Action – if supported]
- [Action – if supported]

Use only the data provided. If a section has no relevant data, say "Not specified" or "To be confirmed."
Always put a space after a colon in bullets (e.g. "SalesQualificationScore: 38.32 / 100", never "SalesQualificationScore:38.32").`;

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
 * Generate Sales Qualification Report (sections 11–15) from assessment report + vendor attestation.
 */
export async function generateSalesQualificationReport(
  reportJson: Record<string, unknown>,
  attestationSummary: string
): Promise<string> {
  const context = buildContext(reportJson, attestationSummary);
  const userInput = SALES_REPORT_PROMPT + "\n\n" + context;
  return invokeModel(userInput);
}
