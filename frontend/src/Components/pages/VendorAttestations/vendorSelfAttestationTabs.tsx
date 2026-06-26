import {
  Building2,
  FileUp,
  Package,
  Cpu,
  ShieldCheck,
  Database,
  FlaskConical,
  Activity,
  Server,
  FileText,
  FileCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Tab step config for Vendor Self Attestation multi-step form.
 * Used with MultiStepTabs; content is injected in VendorAttestationsMainForm.
 * Heading, subheading, and icon align with Vendor Onboarding UI and Excel vendor_self_attestation (second sheet) structure.
 */
export interface VendorSelfAttestationStepConfig {
  id: string;
  label: string;
  subTitle?: string;
  icon: LucideIcon;
}

export const VENDOR_SELF_ATTESTATION_TAB_STEPS: VendorSelfAttestationStepConfig[] = [
  { id: "company-profile", label: "Company Profile", subTitle: "Basic information about your company", icon: Building2 },
  { id: "document-upload", label: "Document Upload", subTitle: "Upload marketing, technical, and compliance materials", icon: FileUp },
  { id: "product-profile", label: "Product Profile", subTitle: "Purchase decision makers, pain points, and unique value", icon: Package },
  { id: "ai-technical-capabilities", label: "AI Technical Capabilities", subTitle: "AI capabilities, model types, and decision autonomy", icon: Cpu },
  { id: "compliance-certifications", label: "Compliance & Certifications", subTitle: "Security certifications and assessment completion", icon: ShieldCheck },
  { id: "data-handling-privacy", label: "Data Handling & Privacy", subTitle: "PII handling, data residency, and retention policy", icon: Database },
  { id: "ai-safety-testing", label: "AI Safety & Testing", subTitle: "Bias testing, adversarial security, and human oversight", icon: FlaskConical },
  { id: "operations-reliability", label: "Operations & Reliability", subTitle: "Uptime SLA, incident response, and rollback capability", icon: Activity },
  { id: "deployment-architecture", label: "Deployment Architecture", subTitle: "Hosting, deployment scale, and product stage", icon: Server },
  { id: "evidence-supporting-doc", label: "Evidence & Supporting Documentation", subTitle: "Interaction data, audit logs, and testing results", icon: FileText },
  { id: "review", label: "Review", subTitle: "Review and submit your self-attestation", icon: FileCheck },
];
