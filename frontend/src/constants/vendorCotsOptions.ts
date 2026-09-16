/**
 * Options / Validation values for Vendor COTS Assessment (from Excel Options/Validation column).
 * Used by VendorCotsDynamicStep for select and multiselect fields.
 */
import { HEADQUARTERS_LOCATION } from "./vendorOnboardingData"

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
  { label: "Not known - estimate only", value: "Not known - estimate only" },
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
  { label: "EU AI Act", value: "EU AI Act" },
  { label: "Colorado AI Act", value: "Colorado AI Act" },
  { label: "NYC LL144", value: "NYC LL144" },
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
  { label: "Not known - infer from sector", value: "Not known - infer from sector" },
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

export const VENDOR_COTS_EMPLOYEE_COUNT_OPTIONS: VendorCotsOptionItem[] = [
  { label: "1-50", value: "1-50" },
  { label: "51-200", value: "51-200" },
  { label: "201-500", value: "201-500" },
  { label: "501-1,000", value: "501-1,000" },
  { label: "1,001-5,000", value: "1,001-5,000" },
  { label: "5,001-10,000", value: "5,001-10,000" },
  { label: "10,001-50,000", value: "10,001-50,000" },
  { label: "50,000+", value: "50,000+" },
]

export const VENDOR_COTS_ENG_HEADCOUNT_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Under 50", value: "Under 50" },
  { label: "50-250", value: "50-250" },
  { label: "250-1,000", value: "250-1,000" },
  { label: "1,000-5,000", value: "1,000-5,000" },
  { label: "5,000+", value: "5,000+" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_ANNUAL_REVENUE_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Under $10M", value: "Under $10M" },
  { label: "$10M-$100M", value: "$10M-$100M" },
  { label: "$100M-$500M", value: "$100M-$500M" },
  { label: "$500M-$1B", value: "$500M-$1B" },
  { label: "$1B-$10B", value: "$1B-$10B" },
  { label: "Over $10B", value: "Over $10B" },
  { label: "Not disclosed", value: "Not disclosed" },
]

export const VENDOR_COTS_OWNERSHIP_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Publicly traded", value: "Publicly traded" },
  { label: "Private - VC backed", value: "Private - VC backed" },
  { label: "Private - PE owned", value: "Private - PE owned" },
  { label: "Founder / family owned", value: "Founder / family owned" },
  { label: "Government or state-owned", value: "Government or state-owned" },
  { label: "Non-profit / NGO", value: "Non-profit / NGO" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_OPERATING_REGION_OPTIONS: VendorCotsOptionItem[] = [
  { label: "North America", value: "North America" },
  { label: "Europe (EU)", value: "Europe (EU)" },
  { label: "Europe (non-EU)", value: "Europe (non-EU)" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "Asia-Pacific", value: "Asia-Pacific" },
  { label: "Middle East", value: "Middle East" },
  { label: "Africa", value: "Africa" },
  { label: "Latin America", value: "Latin America" },
  { label: "Global (exclusive)", value: "Global (exclusive)" },
]

export const VENDOR_COTS_CUSTOMER_CERT_OPTIONS: VendorCotsOptionItem[] = [
  { label: "SOC 2 Type 2", value: "SOC 2 Type 2" },
  { label: "ISO 27001", value: "ISO 27001" },
  { label: "ISO 42001", value: "ISO 42001" },
  { label: "ISO 9001", value: "ISO 9001" },
  { label: "PCI DSS", value: "PCI DSS" },
  { label: "HITRUST", value: "HITRUST" },
  { label: "FedRAMP", value: "FedRAMP" },
  { label: "CSA STAR", value: "CSA STAR" },
  { label: "None found", value: "None found" },
]

export const VENDOR_COTS_REGULATOR_OPTIONS: VendorCotsOptionItem[] = [
  { label: "SEC", value: "SEC" },
  { label: "FINRA", value: "FINRA" },
  { label: "OCC / Federal Reserve", value: "OCC / Federal Reserve" },
  { label: "FCA (UK)", value: "FCA (UK)" },
  { label: "EU or national DPA", value: "EU or national DPA" },
  { label: "HHS OCR", value: "HHS OCR" },
  { label: "FDA", value: "FDA" },
  { label: "State attorney general", value: "State attorney general" },
  { label: "Sector regulator - other", value: "Sector regulator - other" },
  { label: "None / unregulated", value: "None / unregulated" },
]

export const VENDOR_COTS_PUBLIC_INCIDENT_OPTIONS: VendorCotsOptionItem[] = [
  { label: "No known incident", value: "No known incident" },
  { label: "Yes - within 12 months", value: "Yes - within 12 months" },
  { label: "Yes - 12-24 months ago", value: "Yes - 12-24 months ago" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_CLOUD_PROVIDER_OPTIONS: VendorCotsOptionItem[] = [
  { label: "AWS", value: "AWS" },
  { label: "Microsoft Azure", value: "Microsoft Azure" },
  { label: "Google Cloud", value: "Google Cloud" },
  { label: "Multi-cloud", value: "Multi-cloud" },
  { label: "Predominantly on-premise", value: "Predominantly on-premise" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_IDENTITY_PROVIDER_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Okta", value: "Okta" },
  { label: "Microsoft Entra ID", value: "Microsoft Entra ID" },
  { label: "Ping Identity", value: "Ping Identity" },
  { label: "Google Workspace", value: "Google Workspace" },
  { label: "Other", value: "Other" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_SCM_PLATFORM_OPTIONS: VendorCotsOptionItem[] = [
  { label: "GitHub Enterprise", value: "GitHub Enterprise" },
  { label: "GitLab", value: "GitLab" },
  { label: "Bitbucket", value: "Bitbucket" },
  { label: "Azure DevOps", value: "Azure DevOps" },
  { label: "Self-hosted / other", value: "Self-hosted / other" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_INCUMBENT_AI_OPTIONS: VendorCotsOptionItem[] = [
  { label: "GitHub Copilot", value: "GitHub Copilot" },
  { label: "Cursor", value: "Cursor" },
  { label: "Amazon Q Developer", value: "Amazon Q Developer" },
  { label: "Gemini Code Assist", value: "Gemini Code Assist" },
  { label: "Tabnine", value: "Tabnine" },
  { label: "ChatGPT Enterprise", value: "ChatGPT Enterprise" },
  { label: "Microsoft Copilot", value: "Microsoft Copilot" },
  { label: "None known", value: "None known" },
]

export const VENDOR_COTS_LIKELY_INTEGRATION_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Identity / SSO", value: "Identity / SSO" },
  { label: "Code hosting", value: "Code hosting" },
  { label: "CI/CD", value: "CI/CD" },
  { label: "Ticketing (Jira, ServiceNow)", value: "Ticketing (Jira, ServiceNow)" },
  { label: "Data warehouse", value: "Data warehouse" },
  { label: "SIEM", value: "SIEM" },
  { label: "CRM", value: "CRM" },
  { label: "ERP", value: "ERP" },
  { label: "Custom internal APIs", value: "Custom internal APIs" },
  { label: "None", value: "None" },
]

export const VENDOR_COTS_AI_MATURITY_EVIDENCE_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Named AI/ML leadership in post", value: "Named AI/ML leadership in post" },
  { label: "AI product shipped publicly", value: "AI product shipped publicly" },
  { label: "Actively hiring AI/ML roles", value: "Actively hiring AI/ML roles" },
  { label: "Public AI partnership announced", value: "Public AI partnership announced" },
  { label: "Conference talks or engineering blog on AI", value: "Conference talks or engineering blog on AI" },
  { label: "Public AI policy published", value: "Public AI policy published" },
  { label: "No public evidence", value: "No public evidence" },
]

export const VENDOR_COTS_AI_LEADERSHIP_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Chief AI Officer", value: "Chief AI Officer" },
  { label: "Chief Data / Analytics Officer", value: "Chief Data / Analytics Officer" },
  { label: "VP-level AI or ML leader", value: "VP-level AI or ML leader" },
  { label: "Director-level only", value: "Director-level only" },
  { label: "None found", value: "None found" },
]

export const VENDOR_COTS_PUBLIC_AI_POLICY_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Yes - public policy published", value: "Yes - public policy published" },
  { label: "Mentioned in annual report only", value: "Mentioned in annual report only" },
  { label: "No public position found", value: "No public position found" },
]

export const VENDOR_COTS_OPPORTUNITY_TYPE_OPTIONS: VendorCotsOptionItem[] = [
  { label: "New logo", value: "New logo" },
  { label: "Expansion of existing customer", value: "Expansion of existing customer" },
  { label: "Renewal", value: "Renewal" },
  { label: "Competitive displacement", value: "Competitive displacement" },
  { label: "Speculative - no contact yet", value: "Speculative - no contact yet" },
]

export const VENDOR_COTS_TARGET_FUNCTION_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Engineering / Development", value: "Engineering / Development" },
  { label: "Data & Analytics", value: "Data & Analytics" },
  { label: "IT Operations", value: "IT Operations" },
  { label: "Customer Support", value: "Customer Support" },
  { label: "Legal & Compliance", value: "Legal & Compliance" },
  { label: "Finance", value: "Finance" },
  { label: "HR", value: "HR" },
  { label: "Marketing", value: "Marketing" },
  { label: "Operations", value: "Operations" },
  { label: "Multiple functions", value: "Multiple functions" },
]

export const VENDOR_COTS_ESTIMATED_USERS_OPTIONS: VendorCotsOptionItem[] = [
  { label: "1-10 (pilot)", value: "1-10 (pilot)" },
  { label: "11-50", value: "11-50" },
  { label: "51-250", value: "51-250" },
  { label: "251-1,000", value: "251-1,000" },
  { label: "1,001-5,000", value: "1,001-5,000" },
  { label: "5,000+", value: "5,000+" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_YES_NO_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" },
]

export const VENDOR_COTS_COMPETITOR_BASIS_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Publicly confirmed", value: "Publicly confirmed" },
  { label: "Market inference", value: "Market inference" },
]

export const VENDOR_COTS_BUILD_VS_BUY_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Yes - public evidence of internal build", value: "Yes - public evidence of internal build" },
  { label: "Possible - large platform engineering org", value: "Possible - large platform engineering org" },
  { label: "No signal", value: "No signal" },
  { label: "Not known", value: "Not known" },
]

export const VENDOR_COTS_ADVANTAGE_CATEGORY_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Product", value: "Product" },
  { label: "Security", value: "Security" },
  { label: "Compliance", value: "Compliance" },
  { label: "Price", value: "Price" },
  { label: "Support", value: "Support" },
  { label: "Ecosystem", value: "Ecosystem" },
]

export const VENDOR_COTS_INFORMATION_BASIS_OPTIONS: VendorCotsOptionItem[] = [
  { label: "Public sources only", value: "Public sources only" },
  { label: "Product team knowledge", value: "Product team knowledge" },
  { label: "Partner or analyst input", value: "Partner or analyst input" },
  { label: "Customer conversation", value: "Customer conversation" },
]

export const VENDOR_COTS_ANSWER_CONFIDENCE_OPTIONS: VendorCotsOptionItem[] = [
  { label: "High - verified from primary sources", value: "High - verified from primary sources" },
  { label: "Medium - partly verified", value: "Medium - partly verified" },
  { label: "Low - inference only", value: "Low - inference only" },
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
  employeeCount: VENDOR_COTS_EMPLOYEE_COUNT_OPTIONS,
  engHeadcount: VENDOR_COTS_ENG_HEADCOUNT_OPTIONS,
  annualRevenue: VENDOR_COTS_ANNUAL_REVENUE_OPTIONS,
  ownership: VENDOR_COTS_OWNERSHIP_OPTIONS,
  hqCountry: HEADQUARTERS_LOCATION,
  operatingRegions: VENDOR_COTS_OPERATING_REGION_OPTIONS,
  customerCertifications: VENDOR_COTS_CUSTOMER_CERT_OPTIONS,
  customerRegulators: VENDOR_COTS_REGULATOR_OPTIONS,
  publicIncident: VENDOR_COTS_PUBLIC_INCIDENT_OPTIONS,
  cloudProvider: VENDOR_COTS_CLOUD_PROVIDER_OPTIONS,
  identityProvider: VENDOR_COTS_IDENTITY_PROVIDER_OPTIONS,
  scmPlatform: VENDOR_COTS_SCM_PLATFORM_OPTIONS,
  incumbentAiTooling: VENDOR_COTS_INCUMBENT_AI_OPTIONS,
  likelyIntegrationSystems: VENDOR_COTS_LIKELY_INTEGRATION_OPTIONS,
  aiMaturityEvidence: VENDOR_COTS_AI_MATURITY_EVIDENCE_OPTIONS,
  aiLeadership: VENDOR_COTS_AI_LEADERSHIP_OPTIONS,
  publicAiPolicy: VENDOR_COTS_PUBLIC_AI_POLICY_OPTIONS,
  opportunityType: VENDOR_COTS_OPPORTUNITY_TYPE_OPTIONS,
  targetUserFunction: VENDOR_COTS_TARGET_FUNCTION_OPTIONS,
  estimatedUsers: VENDOR_COTS_ESTIMATED_USERS_OPTIONS,
  yesNo: VENDOR_COTS_YES_NO_OPTIONS,
  competitorBasis: VENDOR_COTS_COMPETITOR_BASIS_OPTIONS,
  buildVsBuy: VENDOR_COTS_BUILD_VS_BUY_OPTIONS,
  advantageCategory: VENDOR_COTS_ADVANTAGE_CATEGORY_OPTIONS,
  informationBasis: VENDOR_COTS_INFORMATION_BASIS_OPTIONS,
  answerConfidence: VENDOR_COTS_ANSWER_CONFIDENCE_OPTIONS,
}

export function getVendorCotsFieldOptions(optionsKey: string): VendorCotsOptionItem[] | undefined {
  return VENDOR_COTS_FIELD_OPTIONS[optionsKey]
}

export function getVendorCotsGlobalExclusiveValue(optionsKey?: string): string | undefined {
  if (!optionsKey) return undefined
  const opts = VENDOR_COTS_FIELD_OPTIONS[optionsKey]
  const exclusive = opts?.find((o) =>
    /^(none\b|no public evidence|global \(exclusive\))/i.test(o.value),
  )
  return exclusive?.value
}
