/**
 * Vendor COTS Assessment form schema (aligned with Excel field spec v2).
 * Drives multistep form rendering and validation.
 */

export type VendorCotsInputType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "date"
  | "repeater";

export interface VendorCotsRepeaterColumn {
  key: string;
  label: string;
  inputType: "text" | "select";
  optionsKey?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface VendorCotsFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  inputType: VendorCotsInputType;
  optionsKey?: string;
  required: boolean;
  maxLength?: number;
  showWhen?: { key: string; includes: string };
  exclusiveValue?: string;
  repeater?: {
    minRows: number;
    maxRows: number;
    itemLabel: string;
    columns: VendorCotsRepeaterColumn[];
  };
}

export interface VendorCotsSectionConfig {
  id: string;
  label: string;
  subTitle?: string;
  fields: VendorCotsFieldConfig[];
}

export const VENDOR_COTS_FORM_SECTIONS: VendorCotsSectionConfig[] = [
  {
    id: "customerDiscovery",
    label: "Customer Discovery",
    subTitle: "What we can infer about this customer without contacting them",
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
        label: "What business problem do we believe this customer is trying to solve?",
        placeholder:
          "Our hypothesis from public signals. Example: Manual claims processing taking 45 days on average",
        inputType: "textarea",
        required: true,
      },
      {
        key: "expectedOutcomes",
        label: "What outcomes would we target for this customer?",
        placeholder:
          "Example: Reduce processing time to under 10 days, improve accuracy to 95%+, reduce operational costs by 30%",
        inputType: "textarea",
        required: true,
        maxLength: 4000,
      },
      {
        key: "customerBudgetRange",
        label: "What budget range do we estimate for this solution?",
        placeholder: "Estimate from employee count / revenue if not public",
        inputType: "select",
        optionsKey: "budgetRange",
        required: true,
      },
      {
        key: "implementationTimeline",
        label: "What implementation timeline would we expect?",
        placeholder: "Estimate from customer size and sector",
        inputType: "select",
        optionsKey: "implementationTimeline",
        required: true,
      },
    ],
  },
  {
    id: "customerProfile",
    label: "Customer Profile",
    subTitle: "Public desk research — size, ownership, and footprint",
    fields: [
      {
        key: "customerEmployeeCount",
        label: "How many employees does the customer have?",
        placeholder: "From the LinkedIn company page header",
        inputType: "select",
        optionsKey: "employeeCount",
        required: true,
      },
      {
        key: "customerEngHeadcount",
        label: "Approximate engineering / technical headcount",
        placeholder: "Select a band, or Not known",
        inputType: "select",
        optionsKey: "engHeadcount",
        required: false,
      },
      {
        key: "customerAnnualRevenue",
        label: "Customer annual revenue",
        placeholder: "From 10-K / annual report / Crunchbase",
        inputType: "select",
        optionsKey: "annualRevenue",
        required: false,
      },
      {
        key: "customerOwnership",
        label: "Customer ownership structure",
        placeholder: "From investors page / Crunchbase",
        inputType: "select",
        optionsKey: "ownership",
        required: false,
      },
      {
        key: "customerHqCountry",
        label: "Customer headquarters country",
        placeholder: "Reuse the attestation country list",
        inputType: "select",
        optionsKey: "hqCountry",
        required: false,
      },
      {
        key: "customerOperatingRegions",
        label: "Customer operating regions",
        placeholder: "From the website Locations / About page",
        inputType: "multiselect",
        optionsKey: "operatingRegions",
        required: false,
        exclusiveValue: "Global (exclusive)",
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
        label: "Which product features address this customer's needs?",
        placeholder: "Select all features that solve the customer's pain point",
        inputType: "multiselect",
        optionsKey: "productFeatures",
        required: true,
      },
      {
        key: "implementationApproach",
        label: "What implementation approach would we propose?",
        placeholder: "Select the deployment model for this customer",
        inputType: "select",
        optionsKey: "implementationApproach",
        required: true,
      },
      {
        key: "customizationLevel",
        label: "What level of customization would this customer need?",
        placeholder: "Select the degree of product customization needed",
        inputType: "select",
        optionsKey: "customizationLevel",
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
        placeholder: "Select all that apply. None is exclusive.",
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
        maxLength: 300,
        showWhen: { key: "regulatoryRequirements", includes: "Other (Specify in Notes)" },
      },
      {
        key: "dataSensitivity",
        label: "What sensitivity of data would this customer process?",
        placeholder: "Select the highest sensitivity level of data involved",
        inputType: "select",
        optionsKey: "dataSensitivity",
        required: true,
      },
      {
        key: "customerRiskTolerance",
        label: "What risk posture would we expect from this customer?",
        placeholder: "Select a posture, or Not known so the engine can infer",
        inputType: "select",
        optionsKey: "riskTolerance",
        required: true,
      },
    ],
  },
  {
    id: "compliancePosture",
    label: "Compliance Posture",
    subTitle: "What the customer publishes about its own compliance",
    fields: [
      {
        key: "customerCertifications",
        label: "Certifications the customer publishes for itself",
        placeholder: "From the customer trust centre / security page",
        inputType: "multiselect",
        optionsKey: "customerCertifications",
        required: false,
      },
      {
        key: "customerRegulators",
        label: "Primary regulator(s)",
        placeholder: "From investor-relations or compliance pages",
        inputType: "multiselect",
        optionsKey: "customerRegulators",
        required: false,
      },
      {
        key: "customerPublicIncident",
        label: "Publicly disclosed security incident in the last 24 months?",
        placeholder: "News search / state AG breach registries",
        inputType: "select",
        optionsKey: "publicIncident",
        required: false,
      },
    ],
  },
  {
    id: "technologySignals",
    label: "Technology Signals",
    subTitle: "Public technology stack and likely integrations",
    fields: [
      {
        key: "customerCloudProvider",
        label: "Primary cloud provider",
        placeholder: "Job postings, engineering blog, cloud-vendor case studies",
        inputType: "select",
        optionsKey: "cloudProvider",
        required: false,
      },
      {
        key: "customerIdentityProvider",
        label: "Identity provider",
        placeholder: "Job postings / StackShare",
        inputType: "select",
        optionsKey: "identityProvider",
        required: false,
      },
      {
        key: "customerScmPlatform",
        label: "Source-control platform",
        placeholder: "Job postings, public repos, engineering blog",
        inputType: "select",
        optionsKey: "scmPlatform",
        required: false,
      },
      {
        key: "customerIncumbentAiTooling",
        label: "Known incumbent AI tooling",
        placeholder: "Press releases, job posts, competitor customer-story pages",
        inputType: "multiselect",
        optionsKey: "incumbentAiTooling",
        required: false,
      },
      {
        key: "likelyIntegrationSystems",
        label: "Which systems would this likely integrate with?",
        placeholder: "Named systems replace the old complexity band",
        inputType: "multiselect",
        optionsKey: "likelyIntegrationSystems",
        required: true,
      },
    ],
  },
  {
    id: "aiMaturity",
    label: "AI Maturity",
    subTitle: "Public evidence of the customer's AI adoption",
    fields: [
      {
        key: "customerAiMaturityEvidence",
        label: "Public evidence of the customer's AI adoption",
        placeholder: "Job postings + newsroom + engineering blog",
        inputType: "multiselect",
        optionsKey: "aiMaturityEvidence",
        required: true,
        exclusiveValue: "No public evidence",
      },
      {
        key: "customerAiLeadership",
        label: "Named AI or data leadership",
        placeholder: "LinkedIn title search at the company",
        inputType: "select",
        optionsKey: "aiLeadership",
        required: false,
      },
      {
        key: "customerPublicAiPolicy",
        label: "Has the customer published an AI policy or responsible-AI principles?",
        placeholder: "Website / ESG or annual report",
        inputType: "select",
        optionsKey: "publicAiPolicy",
        required: false,
      },
    ],
  },
  {
    id: "competitiveAnalysis",
    label: "Our Product View",
    subTitle: "Opportunity type, likely alternatives, and our advantages",
    fields: [
      {
        key: "opportunityType",
        label: "What kind of opportunity is this?",
        placeholder: "Internal knowledge — no customer contact required",
        inputType: "select",
        optionsKey: "opportunityType",
        required: true,
      },
      {
        key: "targetUserFunction",
        label: "Which function inside the customer would use this?",
        placeholder: "Who our product serves",
        inputType: "multiselect",
        optionsKey: "targetUserFunction",
        required: true,
      },
      {
        key: "estimatedUsersInScope",
        label: "Estimated users in scope, year one",
        placeholder: "Our estimate, not a confirmed number",
        inputType: "select",
        optionsKey: "estimatedUsers",
        required: false,
      },
      {
        key: "competitors",
        label: "Likely alternatives",
        placeholder: "1–8 named alternatives. Seed from incumbent AI tooling where known.",
        inputType: "repeater",
        required: true,
        repeater: {
          minRows: 1,
          maxRows: 8,
          itemLabel: "Competitor",
          columns: [
            { key: "name", label: "Name", inputType: "text", required: true, maxLength: 120 },
            { key: "incumbent", label: "Incumbent?", inputType: "select", optionsKey: "yesNo", required: true },
            {
              key: "basis",
              label: "Basis",
              inputType: "select",
              optionsKey: "competitorBasis",
              required: true,
            },
          ],
        },
      },
      {
        key: "buildVsBuySignal",
        label: "Is there a signal the customer might build this in-house?",
        placeholder: "Engineering blog, open-source presence, job ads",
        inputType: "select",
        optionsKey: "buildVsBuy",
        required: true,
      },
      {
        key: "keyAdvantagesRows",
        label: "Our key advantages",
        placeholder: "Start with one advantage; add more if needed (10–200 characters each)",
        inputType: "repeater",
        required: true,
        repeater: {
          minRows: 1,
          maxRows: 5,
          itemLabel: "Advantage",
          columns: [
            {
              key: "advantage",
              label: "Advantage",
              inputType: "text",
              required: true,
              minLength: 10,
              maxLength: 200,
            },
            {
              key: "category",
              label: "Category",
              inputType: "select",
              optionsKey: "advantageCategory",
              required: true,
            },
          ],
        },
      },
    ],
  },
  {
    id: "customerRiskMitigation",
    label: "Customer Risk",
    subTitle: "Customer-specific risks we anticipate",
    fields: [
      {
        key: "customerSpecificRisks",
        label: "What customer-specific risks do we anticipate?",
        placeholder: "Select all that apply. None Identified is exclusive.",
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
        maxLength: 300,
        showWhen: { key: "customerSpecificRisks", includes: "Other (Specify Below)" },
      },
    ],
  },
  {
    id: "provenance",
    label: "Provenance",
    subTitle: "Where these answers came from",
    fields: [
      {
        key: "informationBasis",
        label: "What is this assessment based on?",
        placeholder: "Select all that apply",
        inputType: "multiselect",
        optionsKey: "informationBasis",
        required: true,
      },
      {
        key: "answerConfidence",
        label: "Confidence in these answers",
        placeholder: "How verified are these inputs?",
        inputType: "select",
        optionsKey: "answerConfidence",
        required: true,
      },
      {
        key: "researchDate",
        label: "Date the research was carried out",
        placeholder: "Cannot be in the future",
        inputType: "date",
        required: false,
      },
    ],
  },
];
