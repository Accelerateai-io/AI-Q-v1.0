/**
 * Vendor COTS Assessment form schema (aligned with Excel: Section, Label, Input Type, Options/Validation, Required).
 * Drives multistep form rendering and validation.
 */

export type VendorCotsInputType = "text" | "textarea" | "select" | "multiselect";

export interface VendorCotsFieldConfig {
  /** Field key (camelCase) for form state and API */
  key: string
  /** Label for the field */
  label: string
  /** Placeholder or tooltip text */
  placeholder: string
  /** Input type from Excel "Input Type" column */
  inputType: VendorCotsInputType
  /** Key into vendorCotsOptions for select/multiselect (Options / Validation column) */
  optionsKey?: string
  /** Required from Excel "Required" column */
  required: boolean
}

export interface VendorCotsSectionConfig {
  id: string
  label: string
  subTitle?: string
  fields: VendorCotsFieldConfig[]
}

/** Section keys matching VENDOR_COTS_FIELD_KEYS order (excludes auto_generated and review). */
export const VENDOR_COTS_FORM_SECTIONS: VendorCotsSectionConfig[] = [
  {
    id: "customerDiscovery",
    label: "Customer Discovery",
    subTitle: "Basic information about the customer opportunity",
    fields: [
      {
        key: "customerOrganizationName",
        label: "What is the customer organization name?",
        placeholder: "Example: Acme Healthcare Systems",
        inputType: "text",
        required: true,
      },
      {
        key: "customerSector",
        label: "What industry sector does this customer operate in?",
        placeholder: "Select the primary industry this customer operates in",
        inputType: "select",
        optionsKey: "industrySector",
        required: true,
      },
      {
        key: "primaryPainPoint",
        label: "What is the primary business problem or pain point this customer is trying to solve?",
        placeholder: "Example: Manual claims processing taking 45 days on average, leading to customer dissatisfaction and high operational costs",
        inputType: "textarea",
        required: true,
      },
      {
        key: "expectedOutcomes",
        label: "What are the customer's expected outcomes or success metrics?",
        placeholder: "Example: Reduce processing time to under 10 days, improve accuracy to 95%+, reduce operational costs by 30%",
        inputType: "textarea",
        required: true,
      },
      {
        key: "customerBudgetRange",
        label: "What is the customer's budget range for this solution?",
        placeholder: "Select the budget range for initial year",
        inputType: "select",
        optionsKey: "budgetRange",
        required: true,
      },
      {
        key: "implementationTimeline",
        label: "What is the customer's expected implementation timeline?",
        placeholder: "Select expected time from contract to production deployment",
        inputType: "select",
        optionsKey: "implementationTimeline",
        required: true,
      },
    ],
  },
  {
    id: "solutionFit",
    label: "Solution Fit",
    subTitle: "Product fit and implementation approach",
    fields: [
      {
        key: "selectedProductId",
        label: "Which product is this assessment for?",
        placeholder: "Select a completed product",
        inputType: "select",
        optionsKey: "vendorCompletedProducts",
        required: true,
      },
      {
        key: "productFeatures",
        label: "Which product features directly address the customer's needs?",
        placeholder: "Select all features that solve the customer's pain point",
        inputType: "multiselect",
        optionsKey: "productFeatures",
        required: true,
      },
      {
        key: "implementationApproach",
        label: "What is the proposed implementation approach?",
        placeholder: "Select the deployment model for this customer",
        inputType: "select",
        optionsKey: "implementationApproach",
        required: true,
      },
      {
        key: "customizationLevel",
        label: "What level of customization is required for this customer?",
        placeholder: "Select the degree of product customization needed",
        inputType: "select",
        optionsKey: "customizationLevel",
        required: true,
      },
      {
        key: "integrationComplexity",
        label: "What is the integration complexity level for this deployment?",
        placeholder: "Select based on number and complexity of systems to integrate with",
        inputType: "select",
        optionsKey: "integrationComplexity",
        required: true,
      },
    ],
  },
  {
    id: "customerRiskContext",
    label: "Customer Risk Context",
    subTitle: "Regulatory and risk context for this customer",
    fields: [
      {
        key: "regulatoryRequirements",
        label: "What regulatory requirements apply to this customer?",
        placeholder: "Select all regulatory frameworks that apply",
        inputType: "multiselect",
        optionsKey: "regulatoryRequirements",
        required: true,
      },
      {
        key: "regulatoryRequirementsOther",
        label: "Please specify other regulatory requirements",
        placeholder: "Enter other regulatory requirements (max 300 characters)",
        inputType: "text",
        required: false,
      },
      {
        key: "dataSensitivity",
        label: "What is the sensitivity level of data this customer will process?",
        placeholder: "Select the highest sensitivity level of data involved",
        inputType: "select",
        optionsKey: "dataSensitivity",
        required: true,
      },
      {
        key: "customerRiskTolerance",
        label: "What is the customer's risk tolerance level?",
        placeholder: "Select based on customer's stated risk appetite and culture",
        inputType: "select",
        optionsKey: "riskTolerance",
        required: true,
      },
    ],
  },
  {
    id: "competitiveAnalysis",
    label: "Competitive Analysis",
    subTitle: "Alternatives and differentiators",
    fields: [
      {
        key: "alternativesConsidered",
        label: "What alternatives or competitors is the customer considering?",
        placeholder: "Example: Considering UiPath, building in-house solution, or continuing manual process",
        inputType: "textarea",
        required: false,
      },
      {
        key: "keyAdvantages",
        label: "What are our key advantages versus the alternatives?",
        placeholder: "Example: Only solution with healthcare-specific compliance built-in, 50% faster implementation than competitors, proven ROI in similar deployments",
        inputType: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "customerRiskMitigation",
    label: "Customer Risk Mitigation",
    subTitle: "Customer-specific risks and mitigations",
    fields: [
      {
        key: "customerSpecificRisks",
        label: "What customer-specific risks have you identified for this deployment?",
        placeholder: "Select all risks specific to this customer deployment",
        inputType: "multiselect",
        optionsKey: "customerSpecificRisks",
        required: true,
      },
      {
        key: "customerSpecificRisksOther",
        label: "Please specify other customer-specific risks",
        placeholder: "Enter other risks (max 300 characters)",
        inputType: "text",
        required: false,
      },
    ],
  },
]
