/**
 * SCS Factor Explanations
 *
 * Builds structured Improvement Plan items from Sales Confidence category risks.
 * Lift estimate: closing a category risk of R raises SCS by ≈ R × weight.
 *
 * INTERNAL USE ONLY.
 */

export type ScsFactorCategory = "CustomerFriction" | "Implementation" | "Competitive";

export interface ScsFactorExplanation {
  category: ScsFactorCategory;
  factor: string;
  status: "strong" | "present" | "weak" | "missing";
  /** Effect on Sales Confidence (negative = drag). */
  contribution: number;
  deduction: number;
  estimatedLift: number;
  reason: string;
  improvement: string;
  sourceField: string;
  internalOnly: boolean;
}

export type ScsFactorInput = {
  customerFrictionRisk: number | null;
  implementationRisk: number | null;
  competitiveRisk: number | null;
  /** Optional nested formula detail (when present on stored report). */
  detail?: Record<string, unknown> | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function statusFromRisk(risk: number): ScsFactorExplanation["status"] {
  if (risk <= 0) return "strong";
  if (risk < 30) return "present";
  if (risk < 50) return "weak";
  return "missing";
}

const SUBDRIVER_TIPS: Record<string, string> = {
  regulatory_complexity: "Reduce regulatory friction / clarify compliance path",
  data_sensitivity_friction: "Address data sensitivity / compliance documentation",
  risk_tolerance_friction: "Align to customer risk tolerance with clear controls",
  customer_specific_risk_friction: "Cover customer-specific risks with mitigations",
  integration_complexity: "Simplify integrations or provide connectors / playbooks",
  customization_required: "Reduce customization; offer config-first options",
  timeline_pressure: "Propose a realistic timeline or phased rollout",
  feature_gap: "Close critical feature gaps or roadmap commitments",
  mitigation_gap: "Add concrete risk mitigations per customer concern",
  competitive_alternatives: "Differentiate vs alternatives / build-vs-buy",
  budget_constraint: "Right-size packaging / ROI story for the budget",
  competitive_advantage: "Strengthen unique differentiators",
  vendor_buyer_maturity_gap: "Close maturity / expectation mismatch with buyer",
};

function topSubTip(block: unknown): string | null {
  if (block == null || typeof block !== "object" || Array.isArray(block)) return null;
  const tips: Array<{ tip: string; value: number }> = [];
  for (const [key, tip] of Object.entries(SUBDRIVER_TIPS)) {
    const sub = (block as Record<string, unknown>)[key];
    if (sub == null || typeof sub !== "object" || Array.isArray(sub)) continue;
    const value = Number((sub as Record<string, unknown>).value);
    if (!Number.isFinite(value) || value <= 0) continue;
    tips.push({ tip, value });
  }
  tips.sort((a, b) => b.value - a.value);
  return tips[0]?.tip ?? null;
}

function mkFactor(
  category: ScsFactorCategory,
  factor: string,
  risk: number,
  weight: number,
  reason: string,
  improvement: string,
  sourceField: string,
): ScsFactorExplanation {
  const contribution = -round2(risk * weight);
  const deduction = Math.max(0, -contribution);
  const status = statusFromRisk(risk);
  return {
    category,
    factor,
    status,
    contribution,
    deduction,
    estimatedLift: status === "strong" || deduction <= 0 ? 0 : deduction,
    reason,
    improvement,
    sourceField,
    internalOnly: false,
  };
}

/**
 * Build SCS improvement factors from category risks (+ optional formula detail tips).
 */
export function buildScsFactorExplanations(input: ScsFactorInput): ScsFactorExplanation[] {
  const cfr =
    input.customerFrictionRisk != null && Number.isFinite(input.customerFrictionRisk)
      ? Math.max(0, Math.min(100, Number(input.customerFrictionRisk)))
      : null;
  const ir =
    input.implementationRisk != null && Number.isFinite(input.implementationRisk)
      ? Math.max(0, Math.min(100, Number(input.implementationRisk)))
      : null;
  const cr =
    input.competitiveRisk != null && Number.isFinite(input.competitiveRisk)
      ? Math.max(0, Math.min(100, Number(input.competitiveRisk)))
      : null;

  if (cfr == null && ir == null && cr == null) return [];

  const detail =
    input.detail != null && typeof input.detail === "object" && !Array.isArray(input.detail)
      ? input.detail
      : null;

  const factors: ScsFactorExplanation[] = [];

  if (cfr != null && cfr > 0) {
    factors.push(
      mkFactor(
        "CustomerFriction",
        "Customer Friction Risk",
        cfr,
        0.35,
        `Customer friction risk is ${cfr.toFixed(1)}/100 and deducts ${(cfr * 0.35).toFixed(1)} from Sales Confidence (weight 35%).`,
        topSubTip(detail?.customer_friction_risk ?? detail?.customerFrictionRisk) ??
          "Strengthen compliance documentation, clarify data sensitivity handling, and align to customer risk tolerance.",
        "customer_friction_risk",
      ),
    );
  }

  if (ir != null && ir > 0) {
    factors.push(
      mkFactor(
        "Implementation",
        "Implementation Risk",
        ir,
        0.35,
        `Implementation risk is ${ir.toFixed(1)}/100 and deducts ${(ir * 0.35).toFixed(1)} from Sales Confidence (weight 35%).`,
        topSubTip(detail?.implementation_risk ?? detail?.implementationRisk) ??
          "Simplify integrations, reduce customization, and add concrete risk mitigations for customer concerns.",
        "implementation_risk",
      ),
    );
  }

  if (cr != null && cr > 0) {
    factors.push(
      mkFactor(
        "Competitive",
        "Competitive Risk",
        cr,
        0.3,
        `Competitive risk is ${cr.toFixed(1)}/100 and deducts ${(cr * 0.3).toFixed(1)} from Sales Confidence (weight 30%).`,
        topSubTip(detail?.competitive_risk ?? detail?.competitiveRisk) ??
          "Sharpen differentiation vs alternatives and right-size packaging for the customer budget.",
        "competitive_risk",
      ),
    );
  }

  return factors
    .filter((f) => f.estimatedLift > 0)
    .sort((a, b) => b.estimatedLift - a.estimatedLift);
}
