import {
  Search,
  Puzzle,
  AlertTriangle,
  BarChart2,
  Shield,
  Sparkles,
  FileCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface VendorCotsTabStep {
  id: string;
  label: string;
  icon: LucideIcon;
}

// After step 5 (Customer Risk Mitigation) go to preview; Auto-Generated step commented out for now
export const VENDOR_COTS_TAB_STEPS: VendorCotsTabStep[] = [
  { id: "customer-discovery", label: "Customer Discovery", icon: Search },
  { id: "solution-fit", label: "Solution Fit", icon: Puzzle },
  { id: "customer-risk-context", label: "Customer Risk Context", icon: AlertTriangle },
  { id: "competitive-analysis", label: "Competitive Analysis", icon: BarChart2 },
  { id: "customer-risk-mitigation", label: "Customer Risk Mitigation", icon: Shield },
  // { id: "auto-generated", label: "Auto-Generated", icon: Sparkles },
  { id: "review", label: "Review", icon: FileCheck },
];
