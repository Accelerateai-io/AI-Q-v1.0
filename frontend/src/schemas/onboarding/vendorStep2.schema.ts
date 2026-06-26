import { z } from "zod"

/**
 * Step 2: Contact Information
 * Required fields for primary contact (name, email, role).
 */
const emailSchema = z.string().min(1, "Email is required").email("Invalid email address")

export const vendorStep2ContactSchema = z.object({
  primaryContactName: z
    .string()
    .min(2, "Primary contact name is required")
    .max(200, "2-200 characters"),
  primaryContactEmail: emailSchema,
  primaryContactRole: z.string().min(1, "Single selection required"),
})

export type VendorStep2Contact = z.infer<typeof vendorStep2ContactSchema>
