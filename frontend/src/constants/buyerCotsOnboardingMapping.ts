/**
 * Buyer COTS assessment fields that are Auto-populated from buyer onboarding.
 * Keys = buyer COTS form key; value = onboarding response field name (camelCase).
 * API may return camelCase or snake_case; we check both.
 */
/** Excel: "Auto-populated" = from onboarding; pre-filled but all dropdowns/inputs remain editable */
export const BUYER_COTS_AUTO_POPULATED_FROM_ONBOARDING: Record<
  string,
  string
> = {
  organizationName: "organizationName",
  industrySector: "sector",
  employeeCount: "employeeCount",
  operatingRegions: "operatingRegions",
  owningDepartment: "departmentOwner",
  techStack: "existingTechStack",
  dataGovernanceMaturity: "dataGovernanceMaturity",
  aiGovernanceBoard: "aiGovernanceMaturity",
  riskAppetite: "aiRiskAppetite",
};

/** Snake_case equivalents for API responses that return DB column names */
const ONBOARDING_SNAKE_KEYS: Record<string, string> = {
  organizationName: "organization_name",
  industrySector: "sector",
  employeeCount: "employee_count",
  operatingRegions: "operating_regions",
  owningDepartment: "department_owner",
  techStack: "existing_tech_stack",
  dataGovernanceMaturity: "data_governance_maturity",
  aiGovernanceBoard: "ai_governance_maturity",
  riskAppetite: "ai_risk_appetite",
};

/** Form keys that store multiselect values as JSON array string (onboarding may return array) */
const MULTISELECT_FORM_KEYS = ["operatingRegions", "techStack"];

/** Keys to pre-fill from onboarding (all auto-populated fields) */
const PRE_FILL_KEYS = Object.keys(BUYER_COTS_AUTO_POPULATED_FROM_ONBOARDING);

/** List of form keys that are read-only in the UI. Empty = all dropdowns/inputs accessible even when pre-filled from onboarding. */
export const BUYER_COTS_READONLY_KEYS: string[] = [];

function getValue(obj: Record<string, unknown>, formKey: string): unknown {
  const camel = BUYER_COTS_AUTO_POPULATED_FROM_ONBOARDING[formKey];
  const snake = ONBOARDING_SNAKE_KEYS[formKey];
  if (obj[camel] != null) return obj[camel];
  if (snake && obj[snake] != null) return obj[snake];
  return undefined;
}

/**
 * Build form patch from buyer onboarding API response (data.buyer).
 * Handles jsonb/array fields by stringifying for display.
 * Supports both camelCase and snake_case keys from the API.
 */
export function mapOnboardingToAssessmentForm(buyer: Record<string, unknown> | null): Record<string, string> {
  if (!buyer || typeof buyer !== "object") return {};
  const out: Record<string, string> = {};
  for (const formKey of PRE_FILL_KEYS) {
    const raw = getValue(buyer, formKey);
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      out[formKey] = MULTISELECT_FORM_KEYS.includes(formKey)
        ? JSON.stringify(raw)
        : raw.join(", ");
    } else if (typeof raw === "object") {
      out[formKey] = JSON.stringify(raw);
    } else {
      out[formKey] = String(raw);
    }
  }
  return out;
}
