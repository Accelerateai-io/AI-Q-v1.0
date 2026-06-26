import { z } from "zod"

const buyerIndustrySectorSchema = z
  .object({
    public_sector: z.array(z.string()).default([]),
    private_sector: z.array(z.string()).default([]),
    non_profit_sector: z.array(z.string()).default([]),
  })
  .refine(
    (v) =>
      v.public_sector.length + v.private_sector.length + v.non_profit_sector.length > 0,
    { message: "Please select at least one industry sector", path: [] }
  )

/** Step 0: Organization Profile */
export const buyerStep0OrganizationProfileSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  organizationType: z.string().min(1, "Single selection required"),
  sector: buyerIndustrySectorSchema,
  organizationWebsite: z.string().url("Must be valid URL format (https://...)"),
  organizationDescription: z
    .string()
    .min(1, "Organization description is required")
    .max(500, "Maximum 500 characters"),
})

/** Step 1: Contact Information */
const emailSchema = z.string().min(1, "Email is required").email("Invalid email address")
export const buyerStep1ContactSchema = z.object({
  primaryContactName: z
    .string()
    .min(2, "Primary contact name is required")
    .max(200, "2-200 characters"),
  primaryContactEmail: emailSchema,
  primaryContactRole: z.string().min(1, "Single selection required"),
  departmentOwner: z.string().min(1, "Department/Business unit is required"),
})

/** Step 2: Organization Scale */
const currentYear = new Date().getFullYear()
export const buyerStep2OrganizationScaleSchema = z.object({
  employeeCount: z.string().min(1, "Organization size is required"),
  annualRevenue: z.string().optional(),
  yearFounded: z.union([
    z.string().optional(),
    z.number().min(1950).max(currentYear),
  ]).optional(),
})

/** Step 3: Geography */
export const buyerStep3GeographySchema = z.object({
  headquartersLocation: z
    .string()
    .min(1, 'Single selection required. If "Other" is selected, a text input will appear.'),
  operatingRegions: z.array(z.string()).min(1, "At least one operating region is required"),
  dataResidencyRequirements: z.array(z.string()).min(1, "At least one data residency requirement is required"),
})

/** Step 4: Current AI Maturity */
export const buyerStep4CurrentAiMaturitySchema = z.object({
  existingAIInitiatives: z.string().optional(),
  aiGovernanceMaturity: z.string().min(1, "Single selection required"),
  dataGovernanceMaturity: z.string().min(1, "Single selection required"),
  aiSkillsAvailability: z.string().min(1, "Single selection required"),
  changeManagementCapability: z.string().min(1, "Single selection required"),
})

/** Step 5: Regulatory Context */
export const buyerStep5RegulatoryContextSchema = z.object({
  primaryRegulatoryFrameworks: z.array(z.string()).min(1, "At least one regulatory framework is required"),
  regulatoryPenaltyExposure: z.string().min(1, "Single selection required"),
  dataClassificationHandled: z.array(z.string()).min(1, "At least one data classification is required"),
  piiHandling: z.string().min(1, "Single selection required"),
})

/** Step 6: Technical Environment (existingTechStack optional) */
export const buyerStep6TechnicalEnvironmentSchema = z.object({
  existingTechStack: z.array(z.string()).default([]),
})

/** Step 7: Risk Appetite */
export const buyerStep7RiskAppetiteSchema = z.object({
  aiRiskAppetite: z.string().min(1, "Single selection required"),
  acceptableRiskLevel: z.string().min(1, "Single selection required"),
})
