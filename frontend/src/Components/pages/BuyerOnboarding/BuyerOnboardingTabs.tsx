import {
  Building2,
  User,
  BarChart3,
  Globe,
  Cpu,
  Scale as ScaleIcon,
  Server,
  Shield,
  FileCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * Tab step config for Buyer Onboarding multi-step form.
 * Used with MultiStepTabs; content is injected in BuyerMainForm.
 * Labels can be driven by config (e.g. buyerOnboardingData) if needed.
 */
export interface BuyerOnboardingStepConfig {
  id: string
  label: string
  subTitle?: string
  icon: LucideIcon
}

export const BUYER_ONBOARDING_TAB_STEPS: BuyerOnboardingStepConfig[] = [
  { id: "organization-profile", label: "Organization Profile", subTitle: "Basic information about your organization", icon: Building2 },
  { id: "contact-information", label: "Contact Information", subTitle: "Primary contact for this AI implementation", icon: User },
  { id: "organization-scale", label: "Organization Scale", subTitle: "Size and scale of your organization", icon: BarChart3 },
  { id: "geography", label: "Geography", subTitle: "Where you operate and data residency", icon: Globe },
  { id: "current-ai-maturity", label: "Current AI Maturity", subTitle: "Existing AI initiatives and governance", icon: Cpu },
  { id: "regulatory-context", label: "Regulatory Context", subTitle: "Applicable frameworks and data handling", icon: ScaleIcon },
  { id: "technical-environment", label: "Technical Environment", subTitle: "Current technology stack", icon: Server },
  { id: "risk-appetite", label: "Risk Appetite", subTitle: "AI risk tolerance and acceptable level", icon: Shield },
  { id: "review", label: "Review", subTitle: "Review and submit your onboarding", icon: FileCheck },
]
