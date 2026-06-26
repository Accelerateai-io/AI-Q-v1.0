export const VENDOR_COTS_DATA = {
  customer_discovery: {
    0: {
      label: "What is the customer organization name?",
      placeholder: "Example: Acme Healthcare Systems",
      required: true,
    },
    1: {
      label: "What industry sector does this customer operate in?",
      placeholder: "Select the primary industry this customer operates in",
      required: true,
    },
    2: {
      label: "What is the primary business problem or pain point this customer is trying to solve?",
      placeholder: "Example: Manual claims processing taking 45 days on average, leading to customer dissatisfaction and high operational costs",
      required: true,
    },
    3: {
      label: "What are the customer's expected outcomes or success metrics?",
      placeholder: "Example: Reduce processing time to under 10 days, improve accuracy to 95%+, reduce operational costs by 30%",
      required: true,
    },
    4: {
      label: "What is the customer's budget range for this solution?",
      placeholder: "Select the budget range for initial year",
      required: true,
    },
    5: {
      label: "What is the customer's expected implementation timeline?",
      placeholder: "Select expected time from contract to production deployment",
      required: true,
    },
  },

  solution_fit: {
    0: {
      label: "Which product features directly address the customer's needs?",
      placeholder: "Select all features that solve the customer's pain point",
      required: true,
    },
    1: {
      label: "What is the proposed implementation approach?",
      placeholder: "Select the deployment model for this customer",
      required: true,
    },
    2: {
      label: "What level of customization is required for this customer?",
      placeholder: "Select the degree of product customization needed",
      required: true,
    },
    3: {
      label: "What is the integration complexity level for this deployment?",
      placeholder: "Select based on number and complexity of systems to integrate with",
      required: true,
    },
  },

  customer_risk_context: {
    0: {
      label: "What regulatory requirements apply to this customer?",
      placeholder: "Select all regulatory frameworks that apply",
      required: true,
    },
    1: {
      label: "What is the sensitivity level of data this customer will process?",
      placeholder: "Select the highest sensitivity level of data involved",
      required: true,
    },
    2: {
      label: "What is the customer's risk tolerance level?",
      placeholder: "Select based on customer's stated risk appetite and culture",
      required: true,
    },
  },

  competitive_analysis: {
    0: {
      label: "What alternatives or competitors is the customer considering?",
      placeholder: "Example: Considering UiPath, building in-house solution, or continuing manual process",
      required: false,
    },
    1: {
      label: "What are our key advantages versus the alternatives?",
      placeholder: "Example: Only solution with healthcare-specific compliance built-in, 50% faster implementation than competitors, proven ROI in similar deployments",
      required: true,
    },
  },

  customer_risk_mitigation: {
    0: {
      label: "What customer-specific risks have you identified for this deployment?",
      placeholder: "Select all risks specific to this customer deployment",
      required: true,
    },
  },

  auto_generated: {
    0: {
      label: "Identified Risks",
      placeholder: "Shows list of Risk IDs and titles that apply to this customer scenario",
      required: "auto",
    },
    1: {
      label: "Risk Domain Scores",
      placeholder: "Shows scores by domain (e.g., Privacy: 72, AI Safety: 45, Compliance: 88)",
      required: "auto",
    },
    2: {
      label: "Contextual Multipliers",
      placeholder: "Shows multipliers applied (e.g., Intent: Unintentional, Timing: Pre-deployment)",
      required: "auto",
    },
    3: {
      label: "Customer Risk Mitigation",
      placeholder: "Example: For integration complexity - propose phased approach with pilot in one department first. For compliance - provide HIPAA BAA and detailed security documentation. For user adoption - include 40 hours of training and change management support",
      required: "auto",
    },
  },
};
