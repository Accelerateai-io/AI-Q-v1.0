import { BUYER_INDUSTRY_SECTORS } from "./buyerOnboardingData";

export type BuyerSectorValue = {
  public_sector: string[];
  private_sector: string[];
  non_profit_sector: string[];
};

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
  riskAppetite: "aiRiskAppetite",
};

/** Snake_case equivalents for API responses that return DB column names */
const ONBOARDING_SNAKE_KEYS: Record<string, string> = {
  organizationName: "organization_name",
  industrySector: "sector",
  employeeCount: "employee_count",
  operatingRegions: "operating_regions",
  riskAppetite: "ai_risk_appetite",
};

/**
 * Form keys that store multiselect values as JSON array string
 * (onboarding may return array; industry sector is nested object flattened to array).
 */
const MULTISELECT_FORM_KEYS = ["operatingRegions", "industrySector"];

/** Keys to pre-fill from onboarding (all auto-populated fields) */
const PRE_FILL_KEYS = Object.keys(BUYER_COTS_AUTO_POPULATED_FROM_ONBOARDING);

/** List of form keys that are read-only in the UI. Empty = all dropdowns/inputs accessible even when pre-filled from onboarding. */
export const BUYER_COTS_READONLY_KEYS: string[] = [
  "organizationName",
  "industrySector",
  "employeeCount",
  "operatingRegions",
  "riskAppetite",
];

function getValue(obj: Record<string, unknown>, formKey: string): unknown {
  const camel = BUYER_COTS_AUTO_POPULATED_FROM_ONBOARDING[formKey];
  const snake = ONBOARDING_SNAKE_KEYS[formKey];
  if (obj[camel] != null) return obj[camel];
  if (snake && obj[snake] != null) return obj[snake];
  return undefined;
}

function tryParseJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const t = raw.trim();
  if (!t) return raw;
  if (!(t.startsWith("{") || t.startsWith("["))) return raw;
  try {
    return JSON.parse(t);
  } catch {
    return raw;
  }
}

/**
 * Buyer onboarding stores sector as:
 *   { public_sector: string[], private_sector: string[], non_profit_sector: string[] }
 * (or a JSON string of that shape). Flatten to the selected industry labels.
 */
export function flattenOnboardingSectorIndustries(raw: unknown): string[] {
  const parsed = tryParseJson(raw);
  if (Array.isArray(parsed)) {
    return parsed.map((x) => String(x).trim()).filter(Boolean);
  }
  if (parsed == null || typeof parsed !== "object") {
    if (typeof raw === "string" && raw.trim() && !raw.trim().startsWith("{")) {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }
  const o = parsed as Record<string, unknown>;
  const buckets = [
    o.public_sector,
    o.private_sector,
    o.non_profit_sector,
    o.publicSector,
    o.privateSector,
    o.nonProfitSector,
  ];
  const out: string[] = [];
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    for (const item of bucket) {
      const s = String(item ?? "").trim();
      if (s && !out.includes(s)) out.push(s);
    }
  }
  return out;
}

function normalizeToStringArray(raw: unknown): string[] {
  const parsed = tryParseJson(raw);
  if (Array.isArray(parsed)) {
    return parsed.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof parsed === "string" && parsed.trim()) {
    return parsed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function emptyBuyerSectorValue(): BuyerSectorValue {
  return { public_sector: [], private_sector: [], non_profit_sector: [] };
}

/** Map a flat industry list or onboarding object into the onboarding sector buckets. */
export function toBuyerSectorValue(raw: unknown): BuyerSectorValue {
  const parsed = tryParseJson(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    const fromBuckets: BuyerSectorValue = {
      public_sector: normalizeToStringArray(o.public_sector ?? o.publicSector),
      private_sector: normalizeToStringArray(o.private_sector ?? o.privateSector),
      non_profit_sector: normalizeToStringArray(o.non_profit_sector ?? o.nonProfitSector),
    };
    if (
      fromBuckets.public_sector.length ||
      fromBuckets.private_sector.length ||
      fromBuckets.non_profit_sector.length
    ) {
      return fromBuckets;
    }
  }
  const labels = flattenOnboardingSectorIndustries(raw);
  const next = emptyBuyerSectorValue();
  const buckets: Array<{ key: keyof BuyerSectorValue; values: Set<string> }> = [
    {
      key: "public_sector",
      values: new Set(BUYER_INDUSTRY_SECTORS[0].options.map((o) => o.value)),
    },
    {
      key: "private_sector",
      values: new Set(BUYER_INDUSTRY_SECTORS[1].options.map((o) => o.value)),
    },
    {
      key: "non_profit_sector",
      values: new Set(BUYER_INDUSTRY_SECTORS[2].options.map((o) => o.value)),
    },
  ];
  for (const label of labels) {
    const bucket = buckets.find((b) => b.values.has(label));
    if (bucket) next[bucket.key].push(label);
    else next.private_sector.push(label);
  }
  return next;
}

/** Buyer onboarding bands are finer than COTS dropdowns; map onto the COTS option values. */
export function mapOnboardingEmployeeCountToCots(raw: string): string {
  const s = raw.trim();
  const exact = new Set([
    "1-50",
    "51-200",
    "201-500",
    "501-1,000",
    "1,001-5,000",
    "5,001-10,000",
    "10,001-50,000",
    "50,000+",
  ]);
  if (exact.has(s)) return s;
  const map: Record<string, string> = {
    "1,001-2,500": "1,001-5,000",
    "2,501-5,000": "1,001-5,000",
    "10,001-25,000": "10,001-50,000",
    "25,001-50,000": "10,001-50,000",
  };
  return map[s] ?? s;
}

/** Onboarding AI risk-appetite wording differs from the assessment option list (AIQ-032). */
export function mapOnboardingRiskAppetiteToCots(raw: string): string {
  const s = raw.trim();
  const map: Record<string, string> = {
    "Conservative (Minimize risk, extensive controls)":
      "Very Low - Zero tolerance, extensive validation required",
    "Moderate (Balance risk and innovation)":
      "Moderate - Balanced innovation and risk management",
    "Aggressive (Accept higher risk for faster innovation)":
      "High - Willing to accept risk for competitive advantage",
    "Risk-Seeking (Pioneering, willing to accept significant risk)":
      "Very High - Innovation-first, minimal risk concerns",
  };
  return map[s] ?? s;
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

    if (formKey === "industrySector") {
      const sector = toBuyerSectorValue(raw);
      if (
        !sector.public_sector.length &&
        !sector.private_sector.length &&
        !sector.non_profit_sector.length
      ) {
        continue;
      }
      out[formKey] = JSON.stringify(sector);
      continue;
    }

    if (MULTISELECT_FORM_KEYS.includes(formKey)) {
      const arr = normalizeToStringArray(raw);
      if (arr.length === 0) continue;
      out[formKey] = JSON.stringify(arr);
      continue;
    }

    if (formKey === "employeeCount") {
      const mapped = mapOnboardingEmployeeCountToCots(String(raw));
      if (mapped) out[formKey] = mapped;
      continue;
    }

    if (formKey === "riskAppetite") {
      const mapped = mapOnboardingRiskAppetiteToCots(String(raw));
      if (mapped) out[formKey] = mapped;
      continue;
    }

    const parsed = tryParseJson(raw);
    if (Array.isArray(parsed)) {
      out[formKey] = parsed.map((x) => String(x)).join(", ");
    } else if (parsed != null && typeof parsed === "object") {
      out[formKey] = JSON.stringify(parsed);
    } else {
      const s = String(raw).trim();
      if (s) out[formKey] = s;
    }
  }
  return out;
}
