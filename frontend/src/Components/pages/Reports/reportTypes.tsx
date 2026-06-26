import {
  FileText,
  LayoutGrid,
  ListChecks,
  Presentation,
  Route,
  ShieldCheck,
  ShieldAlert,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface ReportTypeOption {
  label: string;
  Icon: LucideIcon;
  /** Used for popup option styling (border/text color). */
  accent: "sales" | "exec" | "risk" | "roadmap";
  /** Which portal can generate this report type. Vendor-only types are not shown in the buyer Assessment Analysis popup. */
  forPortal: "vendor" | "buyer";
}

/** Report types available in Assessment Analysis. Vendor-only types are shown only for vendor portal; buyer-only for buyer portal.
 *  Accent colors match vendor popup: sales (#2563eb), exec (#7c3aed), risk (#059669), roadmap (#be123c). */
export const REPORT_TYPES: ReportTypeOption[] = [
  { label: "Sales Qualification Report", Icon: Target, accent: "sales", forPortal: "vendor" },
  { label: "Executive Stakeholder Brief", Icon: Presentation, accent: "exec", forPortal: "vendor" },
  { label: "Customer Risk Mitigation Plan", Icon: ShieldCheck, accent: "risk", forPortal: "vendor" },
  { label: "Implementation Roadmap Proposal", Icon: Route, accent: "roadmap", forPortal: "vendor" },
  { label: "Vendor Comparison Matrix", Icon: LayoutGrid, accent: "exec", forPortal: "buyer" },
  { label: "Compliance & Risk Summary", Icon: ShieldAlert, accent: "risk", forPortal: "buyer" },
  { label: "Implementation Risk Assessment", Icon: ShieldCheck, accent: "roadmap", forPortal: "buyer" },
  { label: "Mitigation Action Plan", Icon: ListChecks, accent: "sales", forPortal: "buyer" },
];

/** Report types to show in the report-type popup for the given portal (vendor or buyer). */
export function getReportTypesForPortal(portal: "vendor" | "buyer"): ReportTypeOption[] {
  return REPORT_TYPES.filter((t) => t.forPortal === portal);
}

const ICON_BY_LABEL = new Map<string, LucideIcon>(
  REPORT_TYPES.map((t) => [t.label, t.Icon])
);
/** Backward compatibility: old reports may have reportType "Qualification". */
ICON_BY_LABEL.set("Qualification", Target);

const ACCENT_BY_LABEL = new Map<string, ReportTypeOption["accent"]>(
  REPORT_TYPES.map((t) => [t.label, t.accent])
);
ACCENT_BY_LABEL.set("Qualification", "sales");

export function getReportTypeIcon(reportType: string): LucideIcon {
  return ICON_BY_LABEL.get(reportType.trim()) ?? FileText;
}

export function getReportTypeAccent(reportType: string): ReportTypeOption["accent"] | undefined {
  return ACCENT_BY_LABEL.get(reportType.trim());
}

/** Display label on cards etc. Maps legacy "Qualification" to "Sales Qualification Report". */
export function getReportTypeDisplayLabel(reportType: string): string {
  const t = reportType.trim();
  if (t === "Qualification") return "Sales Qualification Report";
  return t || reportType;
}
