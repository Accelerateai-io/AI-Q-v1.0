/** Options for dropdown and multiselect fields in Buyer COTS Assessment (aligned with typical Excel/spec) */

export type OptionItem = { label: string; value: string };

export const INDUSTRY_SECTOR_OPTIONS: OptionItem[] = [
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
];

export const EMPLOYEE_COUNT_OPTIONS: OptionItem[] = [
  { label: "1-50", value: "1-50" },
  { label: "51-200", value: "51-200" },
  { label: "201-500", value: "201-500" },
  { label: "501-1,000", value: "501-1,000" },
  { label: "1,001-5,000", value: "1,001-5,000" },
  { label: "5,001-10,000", value: "5,001-10,000" },
  { label: "10,001-50,000", value: "10,001-50,000" },
  { label: "50,000+", value: "50,000+" },
];

export const OPERATING_REGIONS_OPTIONS: OptionItem[] = [
  { label: "United States", value: "United States" },
  { label: "Canada", value: "Canada" },
  { label: "European Union", value: "European Union" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "Asia-Pacific", value: "Asia-Pacific" },
  { label: "Latin America", value: "Latin America" },
  { label: "Middle East", value: "Middle East" },
  { label: "Africa", value: "Africa" },
  { label: "Global (All Regions)", value: "Global (All Regions)" },
];

export const OWNING_DEPARTMENT_OPTIONS: OptionItem[] = [
  { label: "Customer Service", value: "Customer Service" },
  {
    label: "Executive Leadership",
    value: "Executive Leadership",
  },
  { label: "Finance & Accounting", value: "Finance & Accounting" },
  { label: "Human Resources", value: "Human Resources" },
  {
    label: "Information Technology (IT)",
    value: "Information Technology (IT)",
  },
  { label: "Legal & Compliance", value: "Legal & Compliance" },

  { label: "Multiple Departments", value: "Multiple Departments" },
  { label: "Operations", value: "Operations" },

  { label: "Product Development", value: "Product Development" },
  { label: "Research & Development", value: "Research & Development" },
  { label: "Supply Chain / Logistics", value: "Supply Chain / Logistics" },
  { label: "Other", value: "Other" },
];

export const BUDGET_RANGE_OPTIONS: OptionItem[] = [
  { label: "Under $50K", value: "Under $50K" },
  { label: "$50K - $100K", value: "$50K - $100K" },
  { label: "$100K - $250K", value: "$100K - $250K" },
  { label: "$250K - $500K", value: "$250K - $500K" },
  { label: "$500K - $1M", value: "$500K - $1M" },
  { label: "$1M - $5M", value: "$1M - $5M" },
  { label: "$5M - $10M", value: "$5M - $10M" },
  { label: "Over $10M", value: "Over $10M" },
  { label: "Not Yet Determined", value: "Not Yet Determined" },
];

export const TARGET_TIMELINE_OPTIONS: OptionItem[] = [
  { label: "Immediate (< 30 days)", value: "Immediate (< 30 days)" },
  { label: "1-3 months", value: "1-3 months" },
  { label: "3-6 months", value: "3-6 months" },
  { label: "6-12 months", value: "6-12 months" },
  { label: "12-18 months", value: "12-18 months" },
  { label: "18+ months", value: "18+ months" },
  { label: "Exploratory/No Specific Timeline", value: "Exploratory/No Specific Timeline" },
];

export const CRITICALITY_OPTIONS: OptionItem[] = [
  { label: "Mission Critical - Business cannot operate without it", value: "Mission Critical - Business cannot operate without it" },
  { label: "High Impact - Major disruption if unavailable", value: "High Impact - Major disruption if unavailable" },
  { label: "Moderate Impact - Significant but manageable disruption", value: "Moderate Impact - Significant but manageable disruption" },
  { label: "Low Impact - Minor inconvenience if unavailable", value: "Low Impact - Minor inconvenience if unavailable" },
  { label: "Non-Critical - Nice to have, minimal impact", value: "Non-Critical - Nice to have, minimal impact" },
];

export const INTEGRATION_SYSTEMS_OPTIONS: OptionItem[] = [
  { label: "EHR / EMR Systems", value: "EHR / EMR Systems" },
  { label: "CRM (Salesforce, HubSpot, etc.)", value: "CRM (Salesforce, HubSpot, etc.)" },
  { label: "ERP (SAP, Oracle, etc.)", value: "ERP (SAP, Oracle, etc.)" },
  { label: "HR Systems (Workday, ADP, etc.)", value: "HR Systems (Workday, ADP, etc.)" },
  { label: "Financial Systems", value: "Financial Systems" },
  { label: "Identity Management / SSO (Okta, Azure AD)", value: "Identity Management / SSO (Okta, Azure AD)" },
  { label: "Data Warehouses / Lakes", value: "Data Warehouses / Lakes" },
  { label: "Business Intelligence Tools", value: "Business Intelligence Tools" },
  { label: "Legacy/Mainframe Systems", value: "Legacy/Mainframe Systems" },
  { label: "Custom Applications", value: "Custom Applications" },
  { label: "Cloud Storage (S3, Azure Blob, etc.)", value: "Cloud Storage (S3, Azure Blob, etc.)" },
  { label: "No Integrations Required", value: "No Integrations Required" },
  { label: "Other (Specify Below)", value: "Other (Specify Below)" },
];

export const TECH_STACK_OPTIONS: OptionItem[] = [
  { label: "Cloud - AWS", value: "Cloud - AWS" },
  { label: "Cloud - Microsoft Azure", value: "Cloud - Microsoft Azure" },
  { label: "Cloud -  Google Cloud Platform", value: "Cloud - Google Cloud Platform" },
  { label: "On-Premise Data Centers", value: "On-Premise Data Centers" },
  { label: "Hybrid (Cloud + On-Premise)", value: "Hybrid (Cloud + On-Premise)" },
  { label: "Virtualization (VMware, Hyper-V)", value: "Virtualization (VMware, Hyper-V)" },
  { label: "Container Platforms (Kubernetes, Docker)", value: "Container Platforms (Kubernetes, Docker)" },
  { label: "Serverless / PaaS", value: "Serverless / PaaS" },
  { label: "Legacy Infrastructure", value: "Legacy Infrastructure" },
  { label: "Modern Microservices Architecture", value: "Modern Microservices Architecture" },
  { label: "Not Sure / Need Assessment", value: "Not Sure / Need Assessment" },
];



export const DIGITAL_MATURITY_LEVEL_OPTIONS: OptionItem[] = [
  { label: "Level 1 - Paper-based or minimal digital systems", value: "Level 1 - Paper-based or minimal digital systems" },
  { label: "Level 2 - Basic digital systems, limited integration", value: "Level 2 - Basic digital systems, limited integration" },
  { label: "Level 3 - Integrated digital systems, some automation", value: "Level 3 - Integrated digital systems, some automation" },
  { label: "Level 4 - Advanced digital capabilities, data-driven", value: "Level 4 - Advanced digital capabilities, data-driven" },
  { label: "Level 5 - Fully digitized, AI-ready infrastructure", value: "Level 5 - Fully digitized, AI-ready infrastructure" },
];

export const MATURITY_LEVEL_OPTIONS: OptionItem[] = [
{ label: "None - No formal data governance", value: "None - No formal data governance" },
  { label: "Initial - Ad-hoc data management practices", value: "Initial - Ad-hoc data management practices" },
  { label: "Developing - Some policies and processes in place", value: "Developing - Some policies and processes in place" },
  { label: "Mature - Comprehensive data governance framework", value: "Mature - Comprehensive data governance framework" },
  { label: "Optimized - Industry-leading data governance practices", value: "Optimized - Industry-leading data governance practices" },
];


export const AI_GOVERANCE_YES_NO_OPTIONS: OptionItem[] = [
{ label: "Yes - Active board with defined responsibilities", value: "Yes - Active board with defined responsibilities" },
  { label: "Yes - Recently formed, still establishing processes", value: "Yes - Recently formed, still establishing processes" },
  { label: "No - Planning to establish one", value: "No - Planning to establish one" },
  { label: "No - Not currently planned", value: "No - Not currently planned" },
  { label: "Not Sure", value: "Not Sure" },
];
export const YES_NO_OPTIONS: OptionItem[] = [
 { label: "Yes - Comprehensive policy actively enforced", value: "Yes - Comprehensive policy actively enforced" },
  { label: "Yes - Policy exists but limited enforcement", value: "Yes - Policy exists but limited enforcement" },
  { label: "Draft - Policy in development", value: "Draft - Policy in development" },
  { label: "No - Not currently developed", value: "No - Not currently developed" },
  { label: "Not Sure", value: "Not Sure" },
];

export const IMPLEMENTATION_TEAM_OPTIONS: OptionItem[] = [
  { label: "Executive Sponsor", value: "Executive Sponsor" },
  { label: "Project Manager", value: "Project Manager" },
  { label: "Business Analysts", value: "Business Analysts" },
  { label: "Data Scientists / ML Engineers", value: "Data Scientists / ML Engineers" },
  { label: "Software Developers", value: "Software Developers" },
  { label: "IT Infrastructure Team", value: "IT Infrastructure Team" },
  { label: "Security / Compliance Team", value: "Security / Compliance Team" },
  { label: "Change Management Team", value: "Change Management Team" },
  { label: "End Users / Subject Matter Experts", value: "End Users / Subject Matter Experts" },
  { label: "External Consultants", value: "External Consultants" },
  { label: "No Team Assigned Yet", value: "No Team Assigned Yet" },
];

export const DATA_SENSITIVITY_OPTIONS: OptionItem[] = [
 { label: "Public - No sensitive data", value: "Public - No sensitive data" },
  { label: "Internal - Business confidential only", value: "Internal - Business confidential only" },
  { label: "Sensitive - PII or business critical data", value: "Sensitive - PII or business critical data" },
  { label: "Highly Sensitive - PHI, financial records, or PCI data", value: "Highly Sensitive - PHI, financial records, or PCI data" },
  { label: "Extremely Sensitive - National security, ITAR, or CUI", value: "Extremely Sensitive - National security, ITAR, or CUI" },
];

export const REGULATORY_OPTIONS: OptionItem[] = [
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
];

export const RISK_APPETITE_OPTIONS: OptionItem[] = [
 { label: "Very Low - Zero tolerance, extensive validation required", value: "Very Low - Zero tolerance, extensive validation required" },
  { label: "Low - Conservative, prefer proven solutions", value: "Low - Conservative, prefer proven solutions" },
  { label: "Moderate - Balanced innovation and risk management", value: "Moderate - Balanced innovation and risk management" },
  { label: "High - Willing to accept risk for competitive advantage", value: "High - Willing to accept risk for competitive advantage" },
  { label: "Very High - Innovation-first, minimal risk concerns", value: "Very High - Innovation-first, minimal risk concerns" },
];

export const DECISION_STAKES_OPTIONS: OptionItem[] = [
   { label: "Life or Death - Medical decisions, safety-critical applications", value: "Life or Death - Medical decisions, safety-critical applications" },
  { label: "Major Financial Impact - Large financial losses or legal liability", value: "Major Financial Impact - Large financial losses or legal liability" },
  { label: "Moderate Impact - Significant but recoverable consequences", value: "Moderate Impact - Significant but recoverable consequences" },
  { label: "Low Impact - Minor inconvenience or rework required", value: "Low Impact - Minor inconvenience or rework required" },
  { label: "Minimal Impact - Easily reversible with no major consequences", value: "Minimal Impact - Easily reversible with no major consequences" },
];


export const IMPACTED_STAKEHOLDERS_OPTIONS: OptionItem[] = [
  { label: "Employees (Internal)", value: "Employees (Internal)" },
  { label: "Customers / Clients", value: "Customers / Clients" },
  { label: "Patients (Healthcare)", value: "Patients (Healthcare)" },
  { label: "Students (Education)", value: "Students (Education)" },
  { label: "General Public", value: "General Public" },
  { label: "Regulatory Bodies", value: "Regulatory Bodies" },
  { label: "Partners / Suppliers", value: "Partners / Suppliers" },
  { label: "Investors / Shareholders", value: "Investors / Shareholders" },
  { label: "Vulnerable Populations", value: "Vulnerable Populations" },
  { label: "No Direct Human Impact", value: "No Direct Human Impact" },
];

export const VENDOR_VALIDATION_OPTIONS: OptionItem[] = [
  { label: "Comprehensive - Full technical audit + security assessment", value: "Comprehensive - Full technical audit + security assessment" },
  { label: "Substantial - Security review + reference checks", value: "Substantial - Security review + reference checks" },
  { label: "Moderate - Documentation review + vendor attestation", value: "Moderate - Documentation review + vendor attestation" },
  { label: "Basic - Vendor self-attestation only", value: "Basic - Vendor self-attestation only" },
  { label: "Minimal - Trust vendor claims without validation", value: "Minimal - Trust vendor claims without validation" },
];

export const SECURITY_POSTURE_OPTIONS: OptionItem[] = [
 { label: "Excellent - Industry-leading security practices verified", value: "Excellent - Industry-leading security practices verified" },
  { label: "Good - Strong security practices, minor gaps identified", value: "Good - Strong security practices, minor gaps identified" },
  { label: "Adequate - Meets minimum security requirements", value: "Adequate - Meets minimum security requirements" },
  { label: "Concerns - Some security gaps or red flags identified", value: "Concerns - Some security gaps or red flags identified" },
  { label: "Unknown - Not yet assessed", value: "Unknown - Not yet assessed" },
  { label: "Poor - Significant security deficiencies", value: "Poor - Significant security deficiencies" },
];

export const VENDOR_CERTIFICATIONS_OPTIONS: OptionItem[] = [
  { label: "SOC 2 Type 2 (Verified)", value: "SOC 2 Type 2 (Verified)" },
  { label: "ISO 27001 (Verified)", value: "ISO 27001 (Verified)" },
  { label: "ISO 42001 - AI Management (Verified)", value: "ISO 42001 - AI Management (Verified)" },
  { label: "HIPAA BAA (Provided)", value: "HIPAA BAA (Provided)" },
  { label: "HITRUST (Verified)", value: "HITRUST (Verified)" },
  { label: "FedRAMP Authorized", value: "FedRAMP Authorized" },
  { label: "PCI DSS (Verified)", value: "PCI DSS (Verified)" },
  { label: "GDPR Compliant (Attestation)", value: "GDPR Compliant (Attestation)" },
  { label: "CCPA Compliant (Attestation)", value: "CCPA Compliant (Attestation)" },
  { label: "None Provided", value: "None Provided" },
  { label: "Not Yet Verified", value: "Not Yet Verified" },
];

export const PILOT_ROLLOUT_OPTIONS: OptionItem[] = [
 { label: "Yes - Detailed pilot plan with success criteria", value: "Yes - Detailed pilot plan with success criteria" },
  { label: "Yes - General phased approach planned", value: "Yes - General phased approach planned" },
  { label: "No - Full production deployment planned", value: "No - Full production deployment planned" },
  { label: "No - Deployment approach not yet determined", value: "No - Deployment approach not yet determined" },
];

export const ROLLBACK_OPTIONS: OptionItem[] = [
 { label: "Instant - Automated rollback to previous state", value: "Instant - Automated rollback to previous state" },
  { label: "Rapid - Manual rollback within hours", value: "Rapid - Manual rollback within hours" },
  { label: "Moderate - Rollback within 1-3 days with some data loss", value: "Moderate - Rollback within 1-3 days with some data loss" },
  { label: "Limited - Difficult to rollback, significant effort", value: "Limited - Difficult to rollback, significant effort" },
  { label: "None - No rollback capability, forward-only", value: "None - No rollback capability, forward-only" },
];

export const CHANGE_MANAGEMENT_OPTIONS: OptionItem[] = [
 { label: "Yes - Comprehensive plan with training and communication", value: "Yes - Comprehensive plan with training and communication" },
  { label: "Yes - Basic plan with some training", value: "Yes - Basic plan with some training" },
  { label: "In Development - Plan being created", value: "In Development - Plan being created" },
  { label: "No - No formal change management planned", value: "No - No formal change management planned" },
  { label: "Not Sure", value: "Not Sure" },
];

export const MONITORING_AVAILABILITY_OPTIONS: OptionItem[] = [
 { label: "Yes - Comprehensive analytics and dashboards", value: "Yes - Comprehensive analytics and dashboards" },
  { label: "Yes - Basic usage metrics available", value: "Yes - Basic usage metrics available" },
  { label: "Limited - Some data available upon request", value: "Limited - Some data available upon request" },
  { label: "No - No interaction data provided", value: "No - No interaction data provided" },
  { label: "Unknown - Not yet discussed with vendor", value: "Unknown - Not yet discussed with vendor" },
];
export const AUDIT_LOGS_AVAILABLE: OptionItem[] = [
  { label: "Yes - Comprehensive audit logs with retention", value: "Yes - Comprehensive audit logs with retention" },
  { label: "Yes - Basic logging available", value: "Yes - Basic logging available" },
  { label: "Limited - Partial logging only", value: "Limited - Partial logging only" },
  { label: "No - No audit logs available", value: "No - No audit logs available" },
  { label: "Unknown - Not yet discussed with vendor", value: "Unknown - Not yet discussed with vendor" },
];
export const VENDOR_TESTING_RESULTS: OptionItem[] = [
   { label: "Yes - Comprehensive test reports from third party", value: "Yes - Comprehensive test reports from third party" },
  { label: "Yes - Internal testing results provided", value: "Yes - Internal testing results provided" },
  { label: "Limited - Some testing documentation available", value: "Limited - Some testing documentation available" },
  { label: "No - No testing results provided", value: "No - No testing results provided" },
  { label: "Unknown - Not yet requested", value: "Unknown - Not yet requested" },
];
