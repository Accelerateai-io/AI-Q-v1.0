import { Building2, User, BarChart3, Globe, FileCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * Tab step config for Vendor Onboarding multi-step form.
 * Used with MultiStepTabs; content is injected in VendorMainForm.
 */
export interface VendorOnboardingStepConfig {
  id: string
  label: string
  icon: LucideIcon
}

export const VENDOR_ONBOARDING_TAB_STEPS: VendorOnboardingStepConfig[] = [
  { id: "company-profile", label: "Company Profile", icon: Building2 },
  { id: "contact-information", label: "Contact Information", icon: User },
  { id: "company-scale", label: "Company Scale", icon: BarChart3 },
  { id: "geography", label: "Geography", icon: Globe },
  { id: "review", label: "Review", icon: FileCheck },
]
