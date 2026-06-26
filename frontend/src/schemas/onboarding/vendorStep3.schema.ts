import { z } from "zod"

/**
 * Step 3: Company Scale
 * Required fields: employee count, year founded.
 */
const currentYear = new Date().getFullYear()

export const vendorStep3CompanyScaleSchema = z.object({
  employeeCount: z.string().min(1, "Single selection required"),
  yearFounded: z.union([
    z.string().min(1, "Year founded is required"),
    z
      .number()
      .min(1950, "Year must be 1950 or later")
      .max(currentYear, `Year must be ${currentYear} or earlier`),
  ]),
})

export type VendorStep3CompanyScale = z.infer<typeof vendorStep3CompanyScaleSchema>
