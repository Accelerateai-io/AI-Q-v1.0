/**
 * Calculate ROI metrics from assessment data for the Customer Risk Report.
 *
 * Honesty rule: the ROI section is derived ONLY from inputs the customer
 * actually supplied. If the core productivity inputs (time saved, number of
 * users, hourly cost) or a cost basis are missing, this returns `null` and the
 * report hides the ROI section instead of showing fabricated numbers. There are
 * no "PA pilot" / fixed-headcount / fixed-wage defaults.
 */

import type { RoiAnalysis } from "../controllers/agents/vendorCotsReportAgent.js";

// Working days per year is a neutral calendar assumption, not a fabricated
// business metric; it is the only value that falls back to a standard constant.
const DEFAULT_WORKING_DAYS_PER_YEAR = 250;

/** Read a numeric field from the payload. Returns null when it is absent/blank. */
function getNumberOrNull(
  payload: Record<string, unknown>,
  key: string,
  camelKey: string
): number | null {
  const v = payload[key] ?? payload[camelKey];
  if (v == null) return null;
  if (typeof v === "number") return Number.isNaN(v) ? null : Math.max(0, v);
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? null : Math.max(0, n);
}

/** Parse a single dollar token like "$13.2M", "13.2M", "$13,200,000", "250k". */
function parseSingleDollarToken(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  let numStr = t.replace(/[\s,$]/g, "");
  const isM = /(?:m|million)$/i.test(numStr);
  const isK = /(?:k|thousand)$/i.test(numStr);
  numStr = numStr.replace(/(?:million|thousand|[mk])$/i, "");
  const n = parseFloat(numStr);
  if (Number.isNaN(n)) return null;
  if (isM) return n * 1_000_000;
  if (isK) return n * 1_000;
  return n;
}

/**
 * Parse a dollar string into a number. Single values ("$13.2M") parse directly;
 * ranges ("$100k - $250k", "$500k - $1m") collapse to their midpoint so suffixes
 * on each endpoint are honoured independently.
 */
export function parseDollarAmount(s: string | null | undefined): number | null {
  if (s == null || typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const parts = trimmed
    .split(/\s*(?:-|–|—|\bto\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const nums = parts
      .map(parseSingleDollarToken)
      .filter((n): n is number => n != null);
    if (nums.length >= 2) return nums.reduce((a, b) => a + b, 0) / nums.length;
    if (nums.length === 1) return nums[0];
    return null;
  }
  return parseSingleDollarToken(trimmed);
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(3).replace(/\.?0+$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2).replace(/\.?0+$/, "")}K`;
  return Math.round(n).toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B/year`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M/year`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K/year`;
  return `$${Math.round(n).toLocaleString()}/year`;
}

function formatPaybackMonths(months: number): string {
  if (months < 1) return "<1 month";
  if (months <= 12) return `${Math.round(months)} month${Math.round(months) !== 1 ? "s" : ""}`;
  const years = months / 12;
  return years < 2 ? `${years.toFixed(1)} years` : `${Math.round(years)} years`;
}

/**
 * Compute ROI analysis from a vendor COTS assessment payload, or `null` when the
 * customer did not supply the inputs needed to compute it honestly.
 */
export function calculateRoiFromAssessment(
  payload: Record<string, unknown>
): RoiAnalysis | null {
  const timeSavedMin = getNumberOrNull(
    payload,
    "time_saved_per_employee_minutes",
    "timeSavedPerEmployeeMinutes"
  );
  const employees = getNumberOrNull(payload, "target_users", "targetUsers");
  const hourlyCost = getNumberOrNull(
    payload,
    "average_hourly_cost_dollars",
    "averageHourlyCostDollars"
  );
  const workingDays =
    getNumberOrNull(payload, "working_days_per_year", "workingDaysPerYear") ??
    DEFAULT_WORKING_DAYS_PER_YEAR;
  const costPerUserMonth = getNumberOrNull(
    payload,
    "cost_per_user_per_month_dollars",
    "costPerUserPerMonthDollars"
  );

  const budgetStr =
    payload.customer_budget_range != null
      ? String(payload.customer_budget_range)
      : payload.customerBudgetRange != null
        ? String(payload.customerBudgetRange)
        : "";
  const parsedAnnualCost = parseDollarAmount(budgetStr);

  // Require the customer-supplied productivity inputs. Without them the whole
  // ROI section would be fabricated, so hide it.
  if (
    timeSavedMin == null || timeSavedMin <= 0 ||
    employees == null || employees <= 0 ||
    hourlyCost == null || hourlyCost <= 0
  ) {
    return null;
  }

  // Annual cost must come from a customer-supplied basis: a budget range, or a
  // per-user price. No fixed per-user default.
  const annualCostNum =
    parsedAnnualCost != null && parsedAnnualCost > 0
      ? parsedAnnualCost
      : costPerUserMonth != null && costPerUserMonth > 0
        ? employees * costPerUserMonth * 12
        : null;
  if (annualCostNum == null) return null;

  const annualHoursRecoveredNum = (timeSavedMin * employees * workingDays) / 60;
  const productivityValueNum = annualHoursRecoveredNum * hourlyCost;
  const roiRatio = annualCostNum > 0 ? productivityValueNum / annualCostNum : 0;
  const paybackMonths =
    productivityValueNum > 0 ? annualCostNum / (productivityValueNum / 12) : 0;

  const timeSavedDisplay = `${timeSavedMin} minutes/day`;
  const timeSavedSource = "Source: customer-provided inputs";
  const annualHoursDisplay =
    annualHoursRecoveredNum >= 1_000_000
      ? `${(annualHoursRecoveredNum / 1_000_000).toFixed(3).replace(/\.?0+$/, "")}M hours`
      : `${Math.round(annualHoursRecoveredNum).toLocaleString()} hours`;
  const annualHoursCalculation = `${timeSavedMin} min/day × ${employees.toLocaleString()} users × ${workingDays} working days`;
  const productivityValueDisplay = formatCurrency(productivityValueNum);
  const productivityValueCalculation = `${formatCompactNumber(annualHoursRecoveredNum)} hours × $${hourlyCost}/hr blended hourly cost`;
  const annualCostDisplay = formatCurrency(annualCostNum);
  const annualCostCalculation =
    parsedAnnualCost != null && parsedAnnualCost > 0
      ? `From customer budget range`
      : `${employees.toLocaleString()} users × $${costPerUserMonth}/month × 12 months`;
  const roiMultipleDisplay =
    roiRatio >= 1 ? `${Math.round(roiRatio)}:1` : roiRatio > 0 ? `<1:1` : "—";
  const roiMultipleCalculation = `$${formatCompactNumber(productivityValueNum)} productivity value ÷ $${formatCompactNumber(annualCostNum)} cost`;
  const paybackDisplay = formatPaybackMonths(paybackMonths);
  const paybackSource = "Based on customer-provided inputs";

  return {
    timeSavedPerEmployee: timeSavedDisplay,
    timeSavedSource,
    annualHoursRecovered: annualHoursDisplay,
    annualHoursRecoveredCalculation: annualHoursCalculation,
    productivityValue: productivityValueDisplay,
    productivityValueCalculation,
    annualCost: annualCostDisplay,
    annualCostCalculation,
    roiMultiple: roiMultipleDisplay,
    roiMultipleCalculation,
    paybackPeriod: paybackDisplay,
    paybackSource,
    comparisonAlternatives: undefined,
  };
}
