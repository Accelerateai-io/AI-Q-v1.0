/**
 * Options / Validation values for Vendor COTS Assessment (from Excel Options/Validation column).
 * Used by VendorCotsDynamicStep for select and multiselect fields.
 */

export interface VendorCotsOptionItem {
  label: string
  value: string
}

// ----- Customer Discovery -----
export const VENDOR_COTS_INDUSTRY_SECTOR_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Federal Government (US)", value: "Federal Government (US)" },
  { label: "State Government (US)", value: "State Government (US)" },
  { label: "Local Government (US)", value: "Local Government (US)" },
  { label: "Education - K-12", value: "Education - K-12" },
  {
    label: "Education - Higher Education",
    value: "Education - Higher Education",
  },
  { label: "Energy & Utilities", value: "Energy & Utilities" },
  {
    label: "Financial Services - Banking",
    value: "Financial Services - Banking",
  },
  {
    label: "Financial Services - Investment Management",
    value: "Financial Services - Investment Management",
  },
  {
    label: "Financial Services - Insurance",
    value: "Financial Services - Insurance",
  },
  {
    label: "Healthcare - Hospitals & Health Systems",
    value: "Healthcare - Hospitals & Health Systems",
  },
  {
    label: "Healthcare - Payers (Insurance)",
    value: "Healthcare - Payers (Insurance)",
  },
  {
    label: "Healthcare - Pharmaceuticals",
    value: "Healthcare - Pharmaceuticals",
  },
  {
    label: "Healthcare - Medical Devices",
    value: "Healthcare - Medical Devices",
  },
  { label: "Manufacturing - Industrial", value: "Manufacturing - Industrial" },
  {
    label: "Manufacturing - Consumer Goods",
    value: "Manufacturing - Consumer Goods",
  },
  { label: "Professional Services", value: "Professional Services" },
  { label: "Retail & E-commerce", value: "Retail & E-commerce" },
  { label: "Technology & Software", value: "Technology & Software" },
  { label: "Transportation & Logistics", value: "Transportation & Logistics" },
  // { label: "Education", value: "Education" },
  { label: "Other", value: "Other" },
]

export const VENDOR_COTS_BUDGET_RANGE_OPTIONS: VendorCotsOptionItem[] = [
   { label: "Under $50K", value: "Under $50K" },
  { label: "$50K - $100K", value: "$50K - $100K" },
  { label: "$100K - $250K", value: "$100K - $250K" },
  { label: "$250K - $500K", value: "$250K - $500K" },
  { label: "$500K - $1M", value: "$500K - $1M" },
  { label: "$1M - $5M", value: "$1M - $5M" },
  { label: "$5M - $10M", value: "$5M - $10M" },
  { label: "Over $10M", value: "Over $10M" },
  { label: "Not Yet Determined", value: "Not Yet Determined" },
]

export const VENDOR_COTS_IMPLEMENTATION_TIMELINE_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Immediate (< 30 days)", value: "Immediate (< 30 days)" },
  { label: "1-3 months", value: "1-3 months" },
  { label: "3-6 months", value: "3-6 months" },
  { label: "6-12 months", value: "6-12 months" },
  { label: "12-18 months", value: "12-18 months" },
  { label: "18+ months", value: "18+ months" },
  { label: "Exploratory/No Specific Timeline", value: "Exploratory/No Specific Timeline" },
]

// ----- Solution Fit -----
export const VENDOR_COTS_PRODUCT_FEATURES_OPTIONS: VendorCotsOptionItem[] = [
 { label: "Natural Language Processing", value: "Natural Language Processing" },
  { label: "Document Processing & OCR", value: "Document Processing & OCR" },
  { label: "Predictive Analytics", value: "Predictive Analytics" },
  { label: "Computer Vision", value: "Computer Vision" },
  { label: "Conversational AI / Chatbot", value: "Conversational AI / Chatbot" },
  { label: "Recommendation Engine", value: "Recommendation Engine" },
  { label: "Automated Decision-Making", value: "Automated Decision-Making" },
  { label: "Data Classification", value: "Data Classification" },
  { label: "Anomaly Detection", value: "Anomaly Detection" },
  { label: "Speech Recognition/Synthesis", value: "Speech Recognition/Synthesis" },
  { label: "Custom ML Models", value: "Custom ML Models" },
  { label: "API Integration Layer", value: "API Integration Layer" },
  { label: "Workflow Automation", value: "Workflow Automation" },
  { label: "Reporting & Analytics Dashboard", value: "Reporting & Analytics Dashboard" },
  { label: "Other", value: "Other" },
]

export const VENDOR_COTS_IMPLEMENTATION_APPROACH_OPTIONS: VendorCotsOptionItem[] = [
 { label: "SaaS - Standard Configuration", value: "SaaS - Standard Configuration" },
  { label: "SaaS - With Custom Configuration", value: "SaaS - With Custom Configuration" },
  { label: "On-Premise Deployment", value: "On-Premise Deployment" },
  { label: "Hybrid (Cloud + On-Premise)", value: "Hybrid (Cloud + On-Premise)" },
  { label: "Pilot/POC First, Then Full Rollout", value: "Pilot/POC First, Then Full Rollout" },
  { label: "Phased Rollout by Department/Region", value: "Phased Rollout by Department/Region" },
]

export const VENDOR_COTS_CUSTOMIZATION_LEVEL_OPTIONS: VendorCotsOptionItem[] = [
  { label: "None - Using Standard Product As-Is", value: "None - Using Standard Product As-Is" },
  { label: "Minimal - Configuration Only (No Code)", value: "Minimal - Configuration Only (No Code)" },
  { label: "Moderate - Custom Workflows or Integrations", value: "Moderate - Custom Workflows or Integrations" },
  { label: "Significant - Custom Model Training Required", value: "Significant - Custom Model Training Required" },
  { label: "Extensive - Major Product Modifications", value: "Extensive - Major Product Modifications" },
]

export const VENDOR_COTS_INTEGRATION_COMPLEXITY_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Standalone - No Integrations Required", value: "Standalone - No Integrations Required" },
  { label: "Simple - Single System Integration (e.g., SSO only)", value: "Simple - Single System Integration (e.g., SSO only)" },
  { label: "Moderate - 2-3 System Integrations", value: "Moderate - 2-3 System Integrations" },
  { label: "Complex - 4-6 System Integrations", value: "Complex - 4-6 System Integrations" },
  { label: "Very Complex - 7+ System Integrations or Legacy Systems", value: "Very Complex - 7+ System Integrations or Legacy Systems" },
]

// ----- Customer Risk Context -----
export const VENDOR_COTS_REGULATORY_REQUIREMENTS_OPTIONS: VendorCotsOptionItem[] = [
 { label: "HIPAA (Healthcare)", value: "HIPAA (Healthcare)" },
  { label: "HITECH (Healthcare Technology)", value: "HITECH (Healthcare Technology)" },
  { label: "FDA 21 CFR Part 11 (Medical Devices)", value: "FDA 21 CFR Part 11 (Medical Devices)" },
  { label: "SOX (Financial Reporting)", value: "SOX (Financial Reporting)" },
  { label: "GLBA (Financial Privacy)", value: "GLBA (Financial Privacy)" },
  { label: "PCI DSS (Payment Cards)", value: "PCI DSS (Payment Cards)" },
  { label: "FedRAMP (Federal Government)", value: "FedRAMP (Federal Government)" },
  { label: "StateRAMP (State Government)", value: "StateRAMP (State Government)" },
  { label: "FISMA (Federal Systems)", value: "FISMA (Federal Systems)" },
  { label: "FERPA (Education Privacy)", value: "FERPA (Education Privacy)" },
  { label: "GDPR (EU Data Protection)", value: "GDPR (EU Data Protection)" },
  { label: "CCPA (California Privacy)", value: "CCPA (California Privacy)" },
  { label: "ISO 27001 (Information Security)", value: "ISO 27001 (Information Security)" },
  { label: "SOC 2 (Service Organization Controls)", value: "SOC 2 (Service Organization Controls)" },
  { label: "NIST AI RMF (AI Risk Management)", value: "NIST AI RMF (AI Risk Management)" },
  { label: "None/Not Applicable", value: "None/Not Applicable" },
  { label: "Other (Specify in Notes)", value: "Other (Specify in Notes)" },
]

export const VENDOR_COTS_DATA_SENSITIVITY_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Public - No Sensitive Data", value: "Public - No Sensitive Data" },
  { label: "Internal - Business Confidential Only", value: "Internal - Business Confidential Only" },
  { label: "Sensitive - PII or Business Critical Data", value: "Sensitive - PII or Business Critical Data" },
  { label: "Highly Sensitive - PHI, Financial Records, or PCI Data", value: "Highly Sensitive - PHI, Financial Records, or PCI Data" },
  { label: "Extremely Sensitive - National Security, ITAR, or CUI", value: "Extremely Sensitive - National Security, ITAR, or CUI" },
]

export const VENDOR_COTS_RISK_TOLERANCE_OPTIONS: VendorCotsOptionItem[] = [
 { label: "Very Low - Zero tolerance for risk, extensive controls required", value: "Very Low - Zero tolerance for risk, extensive controls required" },
  { label: "Low - Risk-averse, prefers conservative approach", value: "Low - Risk-averse, prefers conservative approach" },
  { label: "Moderate - Balanced approach to risk and innovation", value: "Moderate - Balanced approach to risk and innovation" },
  { label: "High - Willing to accept risk for competitive advantage", value: "High - Willing to accept risk for competitive advantage" },
  { label: "Very High - Innovation-focused, minimal risk concerns", value: "Very High - Innovation-focused, minimal risk concerns" },

]

// ----- Customer Risk Mitigation -----
export const VENDOR_COTS_CUSTOMER_SPECIFIC_RISKS_OPTIONS: VendorCotsOptionItem[] = [
 { label: "Data Privacy Concerns", value: "Data Privacy Concerns" },
  { label: "Integration with Legacy Systems", value: "Integration with Legacy Systems" },
  { label: "Regulatory Compliance Gaps", value: "Regulatory Compliance Gaps" },
  { label: "Limited Internal AI Expertise", value: "Limited Internal AI Expertise" },
  { label: "Change Management / User Adoption", value: "Change Management / User Adoption" },
  { label: "Budget Constraints", value: "Budget Constraints" },
  { label: "Timeline Pressure", value: "Timeline Pressure" },
  { label: "Unclear Requirements", value: "Unclear Requirements" },
  { label: "Executive Sponsorship Issues", value: "Executive Sponsorship Issues" },
  { label: "Security or Access Control Requirements", value: "Security or Access Control Requirements" },
  { label: "Model Bias or Fairness Concerns", value: "Model Bias or Fairness Concerns" },
  { label: "Explainability Requirements", value: "Explainability Requirements" },
  { label: "None Identified", value: "None Identified" },
  { label: "Other (Specify Below)", value: "Other (Specify Below)" },
]

/** Map optionsKey (from form schema) to options array. Used by VendorCotsDynamicStep. */
export const VENDOR_COTS_FIELD_OPTIONS: Record<string, VendorCotsOptionItem[]> = {
  industrySector: VENDOR_COTS_INDUSTRY_SECTOR_OPTIONS,
  budgetRange: VENDOR_COTS_BUDGET_RANGE_OPTIONS,
  implementationTimeline: VENDOR_COTS_IMPLEMENTATION_TIMELINE_OPTIONS,
  productFeatures: VENDOR_COTS_PRODUCT_FEATURES_OPTIONS,
  implementationApproach: VENDOR_COTS_IMPLEMENTATION_APPROACH_OPTIONS,
  customizationLevel: VENDOR_COTS_CUSTOMIZATION_LEVEL_OPTIONS,
  integrationComplexity: VENDOR_COTS_INTEGRATION_COMPLEXITY_OPTIONS,
  regulatoryRequirements: VENDOR_COTS_REGULATORY_REQUIREMENTS_OPTIONS,
  dataSensitivity: VENDOR_COTS_DATA_SENSITIVITY_OPTIONS,
  riskTolerance: VENDOR_COTS_RISK_TOLERANCE_OPTIONS,
  customerSpecificRisks: VENDOR_COTS_CUSTOMER_SPECIFIC_RISKS_OPTIONS,
}

export function getVendorCotsFieldOptions(optionsKey: string): VendorCotsOptionItem[] | undefined {
  return VENDOR_COTS_FIELD_OPTIONS[optionsKey]
}
