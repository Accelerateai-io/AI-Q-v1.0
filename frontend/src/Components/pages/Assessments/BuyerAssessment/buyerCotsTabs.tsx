import {
  Building2,
  Target,
  Scale,
  Eye,
  Layers,
  ShieldCheck,
  DoorOpen,
  UserCheck,
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
  { id: "context", label: "Context", subTitle: "Organization record", icon: Building2 },
  { id: "purchase", label: "What we are buying", subTitle: "Vendor, use case, and success", icon: Target },
  { id: "data-legal", label: "Data and legal", subTitle: "Exposure and applicable rules", icon: Scale },
  { id: "oversight", label: "Oversight", subTitle: "Review and disclosure", icon: Eye },
  { id: "environment", label: "Environment", subTitle: "Hosting and implementation", icon: Layers },
  { id: "vendor-trust", label: "Vendor trust", subTitle: "Evidence in hand", icon: ShieldCheck },
  { id: "exit", label: "If it goes away", subTitle: "Continuity and contracts", icon: DoorOpen },
  { id: "provenance", label: "Provenance", subTitle: "Who completed this", icon: UserCheck },
  { id: "review", label: "Review", subTitle: "Review and submit", icon: FileText },
];
