import {
  INDUSTRY_SECTOR_OPTIONS,
  EMPLOYEE_COUNT_OPTIONS,
  OPERATING_REGIONS_OPTIONS,
  OWNING_DEPARTMENT_OPTIONS,
  BUDGET_RANGE_OPTIONS,
  TARGET_TIMELINE_OPTIONS,
  CRITICALITY_OPTIONS,
  INTEGRATION_SYSTEMS_OPTIONS,
  TECH_STACK_OPTIONS,
  MATURITY_LEVEL_OPTIONS,
  YES_NO_OPTIONS,
  IMPLEMENTATION_TEAM_OPTIONS,
  DATA_SENSITIVITY_OPTIONS,
  REGULATORY_OPTIONS,
  RISK_APPETITE_OPTIONS,
  DECISION_STAKES_OPTIONS,
  IMPACTED_STAKEHOLDERS_OPTIONS,
  VENDOR_VALIDATION_OPTIONS,
  SECURITY_POSTURE_OPTIONS,
  VENDOR_CERTIFICATIONS_OPTIONS,
  PILOT_ROLLOUT_OPTIONS,
  ROLLBACK_OPTIONS,
  CHANGE_MANAGEMENT_OPTIONS,
  MONITORING_AVAILABILITY_OPTIONS,
  DIGITAL_MATURITY_LEVEL_OPTIONS,
  AI_GOVERANCE_YES_NO_OPTIONS,
  AUDIT_LOGS_AVAILABLE,
  VENDOR_TESTING_RESULTS,
} from "./buyerCotsOptions";

export const BUYER_COTS_ASSESSMENT = {
  organizationProfile: {
    0: {
      label: "What is your organization name?",
      placeholder: "Example: Memorial Health System",
      required: "true",
    },
    1: {
      label: "What industry sector does your organization operate in?",
      placeholder: "Select your organization's primary industry sector",
      required: "true",
      options: INDUSTRY_SECTOR_OPTIONS,
    },
    2: {
      label: "How many employees does your organization have?",
      placeholder: "Select your total employee count range",
      required: "",
      options: EMPLOYEE_COUNT_OPTIONS,
    },
    3: {
      label: "In which geographic regions does your organization operate?",
      placeholder: "Select all regions where you have operations or customers",
      required: "true",
      options: OPERATING_REGIONS_OPTIONS,
      multiselect: true,
    },
  },
  useCase: {
    0: {
      label: "What business pain point are you trying to solve with AI?",
      placeholder:
        "Example: Our claims adjudication process takes 45 days on average, creating customer dissatisfaction and high operational costs. We need to reduce this to under 10 days while maintaining accuracy.",
      required: "true",
    },
    1: {
      label: "What are your expected business outcomes or success metrics?",
      placeholder:
        "Example: Reduce processing time by 75%, improve accuracy to 98%+, reduce operational costs by 40%, improve customer satisfaction scores",
      required: "true",
    },
    2: {
      label:
        "Which department or business unit will own this AI implementation?",
      placeholder:
        "Select the primary department responsible for this implementation",
      required: "true",
      options: OWNING_DEPARTMENT_OPTIONS,
    },
    3: {
      label: "What is your budget range for this AI implementation?",
      placeholder: "Select your total implementation budget (first year)",
      required: "true",
      options: BUDGET_RANGE_OPTIONS,
    },
    4: {
      label: "What is your target timeline for implementation?",
      placeholder:
        "Select expected time from vendor selection to production deployment",
      required: "true",
      options: TARGET_TIMELINE_OPTIONS,
    },
    5: {
      label: "How critical is this AI solution to your business operations?",
      placeholder: "Select the criticality level of this AI solution",
      required: "true",
      options: CRITICALITY_OPTIONS,
    },
  },
  vendorEvaluation: {
    0: {
      label: "What is the vendor name for the AI solution you're evaluating?",
      placeholder:
        "Choose from the AI Vendor Directory, or type a name if not listed",
      required: "true",
    },
    1: {
      label: "What is the specific product or solution name?",
      placeholder:
        "Select a product after choosing a directory vendor, or type the product name",
      required: "true",
    },
    2: {
      label:
        "What gaps exist between your requirements and the vendor's product features?",
      placeholder:
        "Example: Product lacks native integration with our EHR system. Missing role-based access controls for our compliance needs. No support for batch processing of historical data.",
      required: "true",
    },
    3: {
      label: "What systems does this AI solution need to integrate with?",
      placeholder: "Select all systems requiring integration",
      required: "true",
      options: INTEGRATION_SYSTEMS_OPTIONS,
      multiselect: true,
    },
    4: {
      label: "What is your current technology stack and infrastructure?",
      placeholder: "Select all that describe your infrastructure",
      required: "true",
      options: TECH_STACK_OPTIONS,
      multiselect: true,
    },
  },
  readiness: {
    0: {
      label: "What is your organization's digital maturity level?",
      placeholder: "Select the level that best describes your organization",
      required: "true",
      options: DIGITAL_MATURITY_LEVEL_OPTIONS,
    },
    1: {
      label: "What is your data governance maturity level?",
      placeholder: "Select your current data governance maturity",
      required: "true",
      options: MATURITY_LEVEL_OPTIONS,
    },
    2: {
      label: "Does your organization have an AI Governance Board or Committee?",
      placeholder: "Indicate if you have AI governance oversight",
      required: "true",
      options: AI_GOVERANCE_YES_NO_OPTIONS,
    },
    3: {
      label: "Does your organization have an AI Ethics Policy?",
      placeholder: "Indicate your AI ethics policy status",
      required: "true",
      options: YES_NO_OPTIONS,
    },
    4: {
      label: "What is your implementation team composition?",
      placeholder: "Select all roles included in your implementation team",
      required: "true",
      options: IMPLEMENTATION_TEAM_OPTIONS,
      multiselect: true,
    },
  },
  riskProfile: {
    0: {
      label:
        "What is the sensitivity level of data this AI solution will process?",
      placeholder: "Select the highest sensitivity level of data involved",
      required: "true",
      options: DATA_SENSITIVITY_OPTIONS,
    },
    1: {
      label: "What regulatory requirements apply to your organization?",
      placeholder:
        "Select all regulatory frameworks that apply to your organization",
      required: "true",
      options: REGULATORY_OPTIONS,
      multiselect: true,
    },
    2: {
      label: "What is your organization's AI risk appetite?",
      placeholder: "Select your organization's tolerance for AI-related risks",
      required: "true",
      options: RISK_APPETITE_OPTIONS,
    },
    3: {
      label: "What is at stake if AI decisions are wrong?",
      placeholder: "Select the severity of potential AI decision errors",
      required: "true",
      options: DECISION_STAKES_OPTIONS,
    },
    4: {
      label: "Who will be impacted by this AI system?",
      placeholder: "Select all stakeholder groups that will be affected",
      required: "true",
      options: IMPACTED_STAKEHOLDERS_OPTIONS,
      multiselect: true,
    },
  },
  vendorRisk: {
    0: {
      label: "How will you validate the vendor's capabilities?",
      placeholder: "Select your planned vendor validation approach",
      required: "true",
      options: VENDOR_VALIDATION_OPTIONS,
    },
    1: {
      label: "What is your assessment of the vendor's security posture?",
      placeholder: "Select based on your security assessment of the vendor",
      required: "true",
      options: SECURITY_POSTURE_OPTIONS,
    },
    2: {
      label:
        "What compliance certifications has the vendor provided and verified?",
      placeholder: "Select all certifications you have verified",
      required: "true",
      options: VENDOR_CERTIFICATIONS_OPTIONS,
      multiselect: true,
    },
  },
  implementation: {
    0: {
      label: "Do you have a pilot or phased rollout plan?",
      placeholder: "Indicate if you plan staged deployment",
      required: "true",
      options: PILOT_ROLLOUT_OPTIONS,
    },
    1: {
      label: "What rollback capability will you have if the AI solution fails?",
      placeholder: "Select your rollback capability",
      required: "true",
      options: ROLLBACK_OPTIONS,
    },
    2: {
      label: "Do you have a change management plan?",
      placeholder: "Indicate your change management preparation",
      required: "true",
      options: CHANGE_MANAGEMENT_OPTIONS,
    },
  },
  evidence: {
    0: {
      label: "Upload vendor compliance documentation",
      placeholder:
        "Upload any vendor-provided compliance or security documentation",
      required: "false",
    },
    1: {
      label:
        "Does the vendor provide interaction or usage data for monitoring?",
      placeholder: "Indicate availability of monitoring data",
      required: "true",
      options: MONITORING_AVAILABILITY_OPTIONS,
    },
    2: {
      label: "Are audit logs available for AI decisions and system access?",
      placeholder: "Indicate audit logging capabilities",
      required: "true",
      options: AUDIT_LOGS_AVAILABLE,
    },
    3: {
      label:
        "Has the vendor provided testing results (bias, security, performance)?",
      placeholder: "Indicate availability of testing documentation",
      required: "true",
      options: VENDOR_TESTING_RESULTS,
    },
  },
  /** Auto-Generated section: helptext/placeholder and Notes from AI EVAL Database Fields Reference - Buyer Side CSV */
  autoGenerated: {
    0: {
      label: "Identified Risks",
      placeholder: "Shows list of Risk IDs and titles applicable to your use case",
      helpText:
        "Risk linkage based on sector, use case, and AI capabilities. System automatically identifies relevant risks (Risk_id from database).",
    },
    1: {
      label: "Risk Domain Scores",
      placeholder:
        "Shows risk scores by domain (e.g., Privacy: 72, AI Safety: 45, Compliance: 88)",
      helpText:
        "Domain-level scoring for risk reporting. Used in buyer readiness score calculation (Domains – calculated scores).",
    },
    2: {
      label: "Contextual Multipliers",
      placeholder:
        "Shows multipliers applied (e.g., Intent: Unintentional, Timing: Pre-deployment)",
      helpText:
        "Risk calculation components showing context adjustments. Shows how your context affects final risk scores (Intent, Timing multipliers).",
    },
    3: {
      label: "Buyer Risk Mitigation",
      placeholder:
        "Example: For integration complexity - propose phased approach with pilot in one department first. For compliance - provide HIPAA BAA and detailed security documentation. For user adoption - include 40 hours of training and change management support",
      helpText:
        "Risk response strategy and mitigation planning. Auto-recommended mitigation tactics mapped to identified risks. Provides actionable risk response strategies (e.g., phased rollout, training programs, compliance documentation). Vendor can customize recommendations.",
    },
  },
};

// 0:{
//     label: "",
//     placeholder: "",
//     required:"true",
// },
