import { z } from "zod"

/**
 * Step 1: Company Profile
 * Shared sector schema used by step 1 and full onboarding schema.
 */
export const industrySectorSchema = z
  .object({
    public_sector: z.array(z.string()).default([]),
    private_sector: z.array(z.string()).default([]),
    non_profit_sector: z.array(z.string()).default([]),
  })
  .refine(
    (v) =>
      v.public_sector.length +
        v.private_sector.length +
        v.non_profit_sector.length >
      0,
    {
      message: "Please select at least one industry sector",
      path: [],
    }
  )

/** Step 1 – Company Profile schema (vendorName, vendorType, sector, maturity, website, description) */
export const vendorStep1CompanyProfileSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required").max(255, "Maximum 255 characters"),
  vendorType: z.string().min(1, "Single selection required"),
  sector: industrySectorSchema,
  vendorMaturity: z.string().min(1, "Single selection required"),
  companyWebsite: z.string().url("Must be valid URL format (https://...)"),
  companyDescription: z
    .string()
    .min(1, "Company description is required")
    .max(500, "Maximum 500 characters"),
})

/** Re-export for backward compatibility: full vendor onboarding (all steps combined) */
export const emailSchema = z.string().min(1).email("Invalid email address")
export const vendorOnboardingSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required").max(255, "Maximum 255 characters"),
  vendorType: z.string().min(1, "Single selection required"),
  sector: industrySectorSchema,
  vendorMaturity: z.string().min(1, "Single selection required"),
  companyWebsite: z.string().url("Must be valid URL format (https://...)"),
  companyDescription: z
    .string()
    .min(1, "Company description is required")
    .max(500, "Maximum 500 characters"),
  primaryContactName: z
    .string()
    .min(2, "Primary contact name is required")
    .max(200, "2-200 characters"),
  primaryContactRole: z.string().min(1, "Single selection required"),
  primaryContactEmail: emailSchema,
  employeeCount: z.string().min(1, "Single selection required"),
  yearFounded: z.union([z.string().min(1, "Year founded is required"), z.number()]),
  headquartersLocation: z
    .string()
    .min(
      1,
      'Single selection required. If "Other" is selected, a text input will appear.'
    ),
  operatingRegions: z.union([
    z.array(z.string()).min(1, "At least one operating region is required"),
    z.string().min(1, "At least one operating region is required"),
  ]),
})
