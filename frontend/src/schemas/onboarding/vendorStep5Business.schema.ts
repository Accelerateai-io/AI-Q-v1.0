import { z } from "zod"

export const FUNDING_STATUS_VALUES = [
  "publicly_traded",
  "series_d_plus",
  "series_b_c",
  "series_a",
  "seed_angel",
  "bootstrapped",
] as const

export const FINANCIAL_POSITION_VALUES = [
  "profitable_3_years",
  "profitable_1_year",
  "break_even",
  "funded_runway_2_years",
  "funded_runway_1_year",
  "uncertain",
] as const

export const SECURITY_INCIDENT_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const

const optionalWholeNumber = z
  .union([z.literal(""), z.undefined(), z.null(), z.string(), z.number()])
  .refine(
    (v) => v == null || v === "" || (/^\d+$/.test(String(v).trim()) && Number(v) >= 0),
    "Enter a whole number of 0 or more"
  )

const optionalRetentionRate = z
  .union([z.literal(""), z.undefined(), z.null(), z.string(), z.number()])
  .refine((v) => {
    if (v == null || v === "") return true
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 && n <= 100
  }, "Enter a percentage between 0 and 100")

const optionalUrl = z
  .union([z.literal(""), z.undefined(), z.null(), z.string()])
  .refine((v) => {
    if (v == null || String(v).trim() === "") return true
    try {
      new URL(String(v).trim())
      return String(v).trim().length <= 500
    } catch {
      return false
    }
  }, "Must be a valid URL (https://...)")

const securityIncidentSchema = z.object({
  date: z.string().min(1, "Incident date is required"),
  summary: z.string().min(1, "Incident summary is required").max(1000, "Maximum 1000 characters"),
  sourceUrl: z
    .string()
    .optional()
    .refine((v) => {
      if (v == null || v.trim() === "") return true
      try {
        new URL(v.trim())
        return true
      } catch {
        return false
      }
    }, "Must be a valid URL"),
  severity: z.string().min(1, "Severity is required"),
  resolved: z.boolean(),
})

/**
 * Step 5: General business questions + verification of claims
 */
export const vendorStep5BusinessSchema = z
  .object({
    fundingStatus: z.string().min(1, "Single selection required"),
    financialPosition: z.string().min(1, "Single selection required"),
    enterpriseCustomers: optionalWholeNumber,
    customerRetentionRate: optionalRetentionRate,
    trustCentreUrl: optionalUrl,
    hasPublicSecurityIncident: z.string().min(1, "Please answer this question"),
    securityIncidents: z.array(securityIncidentSchema).default([]),
  })
  .refine(
    (value) =>
      value.hasPublicSecurityIncident !== "yes" || value.securityIncidents.length > 0,
    {
      message: "Add at least one publicly disclosed incident",
      path: ["securityIncidents"],
    }
  )

export type VendorStep5Business = z.infer<typeof vendorStep5BusinessSchema>
