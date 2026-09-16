import type { ReactNode } from "react";
import { formatDateDDMMMYYYY } from "./formatDate.js";
import {
  formatFinancialPosition,
  formatFundingStatus,
  formatSecurityIncidents,
} from "../constants/vendorOnboardingData";

/** Format sector object to readable string for preview */
function formatSectorForPreview(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const sectorMap: Record<string, unknown> = {
    "Public Sector": v.public_sector,
    "Private Sector": v.private_sector,
    "Non-Profit Sector": v.non_profit_sector,
  };
  const parts: string[] = [];
  Object.entries(sectorMap).forEach(([label, values]) => {
    if (Array.isArray(values) && values.length > 0) {
      parts.push(`${label}: ${values.join(", ")}`);
    }
  });
  return parts.length > 0 ? parts.join("; ") : null;
}

export function formatPreviewValue(value: unknown, label?: string): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="vendor_preview_na">—</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="vendor_preview_na">—</span>
    if (typeof value[0] === "object" && value[0] !== null) {
      return (
        <ul className="vendor_preview_nested_list">
          {value.map((item, index) => {
            const o = item as Record<string, unknown>
            const date = o.date != null ? String(o.date) : "Date not provided"
            const summary = o.summary != null ? String(o.summary) : "No summary"
            const severity = o.severity != null ? String(o.severity) : "unspecified"
            const resolved = o.resolved ? "resolved" : "open"
            return (
              <li key={index}>
                {date} — {severity} — {resolved}: {summary}
              </li>
            )
          })}
        </ul>
      )
    }
    return value.join(", ")
  }
  if (typeof value === "object") {
    const sectorText = formatSectorForPreview(value);
    if (sectorText !== null) {
      return sectorText;
    }
    return (
      <ul className="vendor_preview_nested_list">
        {Object.entries(value as Record<string, unknown>).map(([k, vals]) => (
          <li key={k}>
            <span className="vendor_preview_nested_label">{k}:</span>{" "}
            {Array.isArray(vals) ? vals.join(", ") : String(vals)}
          </li>
        ))}
      </ul>
    );
  }
  const key = (label ?? "").toLowerCase();
  if (key.includes("funding status")) {
    const formatted = formatFundingStatus(String(value));
    return formatted === "—" ? <span className="vendor_preview_na">—</span> : formatted;
  }
  if (key.includes("financial position")) {
    const formatted = formatFinancialPosition(String(value));
    return formatted === "—" ? <span className="vendor_preview_na">—</span> : formatted;
  }
  if (key.includes("retention")) {
    return `${value}%`;
  }

  let str = String(value);
  if (str === "[object Object]") {
    return <span className="vendor_preview_na">—</span>;
  }
  if (label?.toLowerCase().includes("sector") && str.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(str) as unknown;
      const sectorText = formatSectorForPreview(parsed);
      if (sectorText !== null) return sectorText;
    } catch {
      /* use str as-is */
    }
  }
  if (label?.toLowerCase().includes("email")) {
    return (
      <a href={`mailto:${str}`} className="vendor_preview_link">
        {str}
      </a>
    );
  }
  if (
    label?.toLowerCase().includes("website") ||
    label?.toLowerCase().includes("url") ||
    label?.toLowerCase().includes("trust")
  ) {
    const href = str.startsWith("http") ? str : `https://${str}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="vendor_preview_link"
      >
        {str}
      </a>
    );
  }
  return str;
}

export function formatOnboardingDate(isoString: unknown): string | null {
  if (!isoString) return null;
  const s = formatDateDDMMMYYYY(isoString);
  return s === "—" ? null : s;
}

const SKIP_ONBOARDING_KEYS = [
  "id",
  "createdAt",
  "updatedAt",
  "userId",
  "organizationId",
  "completedBy",
  "completedAt",
  "publicDirectoryListing",
  "public_directory_listing",
];

const ONBOARDING_FIELD_LABELS: Record<string, string> = {
  vendorName: "Vendor Name",
  vendorType: "Vendor Type",
  vendorMaturity: "Vendor Maturity",
  companyWebsite: "Company Website",
  companyDescription: "Company Description",
  primaryContactName: "Primary Contact Name",
  primaryContactEmail: "Primary Contact Email",
  primaryContactRole: "Primary Contact Role",
  employeeCount: "Employee Count",
  yearFounded: "Year Founded",
  headquartersLocation: "Headquarters Location",
  operatingRegions: "Operating Regions",
  fundingStatus: "Funding Status",
  financialPosition: "Financial Position",
  enterpriseCustomers: "Enterprise Customers",
  customerRetentionRate: "Annual Customer Retention Rate",
  trustCentreUrl: "Trust Centre URL",
  securityIncidents: "Public Security Incidents (24 months)",
};

const ONBOARDING_FIELD_ORDER = [
  "vendorName",
  "vendorType",
  "sector",
  "vendorMaturity",
  "companyWebsite",
  "companyDescription",
  "primaryContactName",
  "primaryContactEmail",
  "primaryContactRole",
  "employeeCount",
  "yearFounded",
  "headquartersLocation",
  "operatingRegions",
  "fundingStatus",
  "financialPosition",
  "enterpriseCustomers",
  "customerRetentionRate",
  "trustCentreUrl",
  "securityIncidents",
];

function formatLabel(key: string): string {
  if (ONBOARDING_FIELD_LABELS[key]) return ONBOARDING_FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

export type OnboardingField = {
  label: string;
  value: (obj: Record<string, unknown>) => unknown;
};

export function buildOnboardingFields(
  data: Record<string, unknown> | null | undefined,
): OnboardingField[] {
  if (!data || typeof data !== "object") return [];
  const keys = Object.keys(data).filter((k) => !SKIP_ONBOARDING_KEYS.includes(k));
  const ordered = [
    ...ONBOARDING_FIELD_ORDER.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !ONBOARDING_FIELD_ORDER.includes(key)),
  ];
  return ordered.map((key) => ({
    label: formatLabel(key),
    value: (obj: Record<string, unknown>) => {
      const raw = obj[key];
      if (key === "securityIncidents" && (!Array.isArray(raw) || raw.length === 0))
        return "None disclosed";
      if (key === "securityIncidents")
        return formatSecurityIncidents(raw as Array<Record<string, unknown>>);
      return raw;
    },
  }));
}
