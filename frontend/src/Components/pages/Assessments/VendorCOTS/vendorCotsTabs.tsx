import {
  Search,
  Puzzle,
  AlertTriangle,
  BarChart2,
  Shield,
  FileCheck,
  Building2,
  BadgeCheck,
  Cloud,
  Brain,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface VendorCotsTabStep {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const VENDOR_COTS_TAB_STEPS: VendorCotsTabStep[] = [
  { id: "customer-discovery", label: "Customer Discovery", icon: Search },
  { id: "customer-profile", label: "Customer Profile", icon: Building2 },
  { id: "solution-fit", label: "Solution Fit", icon: Puzzle },
  { id: "customer-risk-context", label: "Customer Risk Context", icon: AlertTriangle },
  { id: "compliance-posture", label: "Compliance Posture", icon: BadgeCheck },
  { id: "technology-signals", label: "Technology Signals", icon: Cloud },
  { id: "ai-maturity", label: "AI Maturity", icon: Brain },
  { id: "competitive-analysis", label: "Our Product View", icon: BarChart2 },
  { id: "customer-risk-mitigation", label: "Customer Risk", icon: Shield },
  { id: "provenance", label: "Provenance", icon: ClipboardList },
  { id: "review", label: "Review", icon: FileCheck },
];
