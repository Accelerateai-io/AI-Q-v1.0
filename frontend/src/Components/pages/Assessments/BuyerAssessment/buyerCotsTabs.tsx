import {
  Building2,
  Target,
  Search,
  ClipboardCheck,
  Shield,
  AlertTriangle,
  Settings,
  FileCheck,
  // Sparkles,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BuyerCotsTabStep {
  id: string;
  label: string;
  subTitle?: string;
  icon: LucideIcon;
}

export const BUYER_COTS_TAB_STEPS: BuyerCotsTabStep[] = [
  { id: "organization-profile", label: "Organization Profile", subTitle: "Basic organization context", icon: Building2 },
  { id: "use-case", label: "Use Case", subTitle: "Business pain points and outcomes", icon: Target },
  { id: "vendor-evaluation", label: "Vendor Evaluation", subTitle: "Vendor and product details", icon: Search },
  { id: "readiness", label: "Readiness", subTitle: "Digital and governance maturity", icon: ClipboardCheck },
  { id: "risk-profile", label: "Risk Profile", subTitle: "Data sensitivity and risk appetite", icon: Shield },
  { id: "vendor-risk", label: "Vendor Risk", subTitle: "Vendor validation and security", icon: AlertTriangle },
  { id: "implementation", label: "Implementation", subTitle: "Rollout and change management", icon: Settings },
  { id: "evidence", label: "Evidence", subTitle: "Monitoring and audit availability", icon: FileCheck },
  // { id: "auto-generated", label: "Auto-Generated", subTitle: "System-generated risk analysis", icon: Sparkles },
  { id: "review", label: "Review", subTitle: "Review and submit", icon: FileText },
];
