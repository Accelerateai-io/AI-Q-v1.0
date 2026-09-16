export type { FactorExplanation } from "../services/vtsFactorExplanations.js";
export type { IrsFactorExplanation, IrsFactorCategory } from "../services/irsFactorExplanations.js";
export type { ScsFactorExplanation, ScsFactorCategory } from "../services/scsFactorExplanations.js";

export type ScoreTraceSourceType =
  | "assessment_answer"
  | "vendor_attestation"
  | "uploaded_document"
  | "certification"
  | "risk_intellect"
  | "system_default";

export type ScoreTraceComponent = {
  label: string;
  category: string;
  /** Effect on the final score (positive = increases score, negative = decreases score). */
  contribution: number;
  direction: "positive" | "negative" | "neutral";
  reason: string;
  sourceType: ScoreTraceSourceType;
  sourceLabel: string;
  internalOnly: true;
};

export type ScoreTrace = {
  scoreType: "vendor_trust" | "buyer_implementation_risk" | "sales_confidence";
  finalScore: number;
  formula: string;
  scoringVersion: string;
  rawSubScores: {
    /** VTS sub-scores (0–100 each, where higher = less risky) */
    productScore?: number;
    governanceScore?: number;
    operationalScore?: number;
    /** IRS sub-scores (0–100 risk, where higher = more risky) */
    vendorRisk?: number;
    orgReadinessGap?: number;
    integrationRisk?: number;
    vendorTrustScore?: number;
    /** AI Risk Intellect intent multiplier applied to the IRS risk term (default 1.0). */
    intentMultiplier?: number;
    /** SCS sub-scores (0–100 each, where higher = better / less risk) */
    customerFrictionScore?: number;
    implementationScore?: number;
    competitiveScore?: number;
    salesRiskScore?: number;
  };
  components: ScoreTraceComponent[];
  warnings: string[];
  missingEvidence: string[];
  /**
   * VTS factor-level explanations — present when report was generated via formula path.
   * All items included in internal mode; vendor-safe items only in vendor mode.
   */
  factorExplanations?: import("../services/vtsFactorExplanations.js").FactorExplanation[];
  /**
   * IRS factor-level explanations — present when IRS trace is built from buyer assessment data.
   * INTERNAL ONLY. Base-risk baseline components are excluded (not actionable).
   */
  irsFactorExplanations?: import("../services/irsFactorExplanations.js").IrsFactorExplanation[];
  /**
   * SCS factor-level explanations — Improvement Plan for Vendor COTS / Sales Confidence.
   */
  scsFactorExplanations?: import("../services/scsFactorExplanations.js").ScsFactorExplanation[];
  /**
   * Bedrock / Controls model id that produced the stored report (when persisted).
   * Used by explainability UI — prefer this over live Controls selection.
   */
  llmModelId?: string | null;
  generatedAt: string;
  internalOnly: true;
};
