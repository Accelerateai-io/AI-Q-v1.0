import { z } from "zod"

/**
 * Step 4: Geography
 * Required fields: headquarters location, operating regions.
 */
export const vendorStep4GeographySchema = z.object({
  headquartersLocation: z
    .string()
    .min(
      1,
      'Single selection required. If "Other" is selected, a text input will appear.'
    ),
  operatingRegions: z
    .array(z.string())
    .min(1, "At least one operating region is required"),
})

export type VendorStep4Geography = z.infer<typeof vendorStep4GeographySchema>
