import "dotenv/config";
import { invokeBedrockAnthropicText } from "../../utils/invokeBedrockWithUsage.js";

const CUSTOMER_RISK_MITIGATION_PROMPT = `You are a risk and compliance analyst. Using ONLY the Assessment Analysis Report and Vendor Attestation data provided below, generate a Customer Risk Mitigation Plan in this exact format. Use clear headings and bullets. Do not invent data not present in the inputs.

## Customer context (sector, use case, data class, requirements)
- **Sector:** [From report or attestation]
- **Use case:** [From report or attestation]
- **Data class:** [Sensitivity/classification if mentioned]
- **Key requirements:** [Bullets from report or attestation]

## Top risks (ranked) with likelihood, impact, severity
- **Risk 1:** [Description] – Likelihood: [Low/Medium/High] – Impact: [Low/Medium/High] – Severity: [level]
- **Risk 2:** [Description] – Likelihood / Impact / Severity
- [Continue for top risks; rank by severity or impact]

## Mitigations per risk (top 2–3) + notes if already covered
- **For Risk 1:** [Mitigation 1]; [Mitigation 2]; [Note if already covered in attestation/report]
- **For Risk 2:** [Mitigation 1]; [Mitigation 2]; [Note if already covered]
- [Top 2–3 mitigations per risk; note where already addressed]

## Ownership matrix (Vendor / Buyer / Shared)
Use a markdown table with exactly these columns (one row per risk or mitigation):

| Risk / Mitigation | Ownership | Notes |
|---|---|---|
| [Risk or mitigation name] | Vendor OR Buyer OR Shared | [Brief note] |
| [Repeat for key items] | Vendor OR Buyer OR Shared | [Brief note] |

Ownership cell must be exactly one of: Vendor, Buyer, Shared (or "To be confirmed" if unknown).

## Phasing: pre-deploy / deploy / post-go-live
- **Pre-deploy:** [Actions or checks before deployment]
- **Deploy:** [Deployment-phase actions]
- **Post-go-live:** [Ongoing validation or monitoring]

## Validation criteria per mitigation (how to confirm)
- **Mitigation [X]:** [How to confirm it is in place or effective]
- [Repeat for key mitigations]

Use only the data provided. If a section has no relevant data, say "Not specified" or "To be confirmed."`;

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
 * Generate Customer Risk Mitigation Plan (sections 22–27) from assessment report + vendor attestation.
 */
export async function generateCustomerRiskMitigationPlan(
  reportJson: Record<string, unknown>,
  attestationSummary: string
): Promise<string> {
  const context = buildContext(reportJson, attestationSummary);
  const userInput = CUSTOMER_RISK_MITIGATION_PROMPT + "\n\n" + context;
  return invokeModel(userInput);
}
