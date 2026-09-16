import { sql } from "drizzle-orm";
import { db } from "../database/db.js";

export const FUNDING_STATUS_VALUES = [
  "publicly_traded",
  "series_d_plus",
  "series_b_c",
  "series_a",
  "seed_angel",
  "bootstrapped",
] as const;

export const FINANCIAL_POSITION_VALUES = [
  "profitable_3_years",
  "profitable_1_year",
  "break_even",
  "funded_runway_2_years",
  "funded_runway_1_year",
  "uncertain",
] as const;

export const SECURITY_INCIDENT_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export interface VendorSecurityIncident {
  date: string;
  summary: string;
  source_url: string;
  severity: string;
  resolved: boolean;
}

export interface VendorOnboardingBusinessFields {
  fundingStatus: string | null;
  financialPosition: string | null;
  enterpriseCustomers: number | null;
  customerRetentionRate: string | null;
  trustCentreUrl: string | null;
  securityIncidents: VendorSecurityIncident[];
}

function asTrimmedString(value: unknown): string {
  return value != null ? String(value).trim() : "";
}

function allowedOrNull(value: unknown, allowed: readonly string[]): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  return allowed.includes(raw) ? raw : null;
}

function optionalInteger(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function optionalRetentionRate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n.toFixed(2);
}

function optionalUrl(value: unknown, maxLength: number): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  return raw.slice(0, maxLength);
}

function normalizeIncident(raw: unknown): VendorSecurityIncident | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const date = asTrimmedString(item.date);
  const summary = asTrimmedString(item.summary);
  const sourceUrl = asTrimmedString(item.source_url ?? item.sourceUrl);
  const severityRaw = asTrimmedString(item.severity).toLowerCase();
  const severity = SECURITY_INCIDENT_SEVERITIES.includes(
    severityRaw as (typeof SECURITY_INCIDENT_SEVERITIES)[number],
  )
    ? severityRaw
    : "";

  if (!date && !summary && !sourceUrl && !severity) return null;

  return {
    date,
    summary: summary.slice(0, 1000),
    source_url: sourceUrl.slice(0, 500),
    severity,
    resolved: Boolean(item.resolved),
  };
}

export function normalizeSecurityIncidents(raw: unknown): VendorSecurityIncident[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeIncident)
    .filter((item): item is VendorSecurityIncident => item != null);
}

export function normalizeVendorOnboardingBusinessFields(
  body: Record<string, unknown>,
): VendorOnboardingBusinessFields {
  return {
    fundingStatus: allowedOrNull(body.fundingStatus ?? body.funding_status, FUNDING_STATUS_VALUES),
    financialPosition: allowedOrNull(
      body.financialPosition ?? body.financial_position,
      FINANCIAL_POSITION_VALUES,
    ),
    enterpriseCustomers: optionalInteger(
      body.enterpriseCustomers ?? body.enterprise_customers,
    ),
    customerRetentionRate: optionalRetentionRate(
      body.customerRetentionRate ?? body.customer_retention_rate,
    ),
    trustCentreUrl: optionalUrl(body.trustCentreUrl ?? body.trust_centre_url, 500),
    securityIncidents: normalizeSecurityIncidents(
      body.securityIncidents ?? body.security_incidents,
    ),
  };
}

export async function persistVendorOnboardingBusinessFields(
  organizationId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const fields = normalizeVendorOnboardingBusinessFields(body);
  const vendorType = asTrimmedString(body.vendorType ?? body.vendor_type).slice(0, 100) || null;
  const vendorMaturity = asTrimmedString(body.vendorMaturity ?? body.vendor_maturity).slice(0, 100) || null;
  const companyWebsite = asTrimmedString(body.companyWebsite ?? body.company_website).slice(0, 2000) || null;
  const companyDescription = asTrimmedString(body.companyDescription ?? body.company_description) || null;
  const employeeCount = asTrimmedString(body.employeeCount ?? body.employee_count).slice(0, 50) || null;
  const headquartersLocation = asTrimmedString(
    body.headquartersLocation ?? body.headquarters_location,
  ).slice(0, 100) || null;
  const yearFoundedRaw = body.yearFounded ?? body.year_founded;
  const yearFounded =
    yearFoundedRaw == null || String(yearFoundedRaw).trim() === ""
      ? null
      : Number.parseInt(String(yearFoundedRaw), 10);
  const sectorVal = body.sector ?? body.target_industries;
  const sectorJson =
    sectorVal != null && typeof sectorVal === "object"
      ? JSON.stringify(sectorVal)
      : typeof sectorVal === "string" && sectorVal.trim()
        ? sectorVal
        : null;
  const operatingRegions = body.operatingRegions ?? body.operating_regions ?? body.operate_regions;
  const operatingJson =
    operatingRegions == null
      ? null
      : JSON.stringify(operatingRegions);

  await db.execute(sql`
    UPDATE public.vendor_onboarding
    SET
      funding_status = ${fields.fundingStatus},
      financial_position = ${fields.financialPosition},
      enterprise_customers = ${fields.enterpriseCustomers},
      customer_retention_rate = ${fields.customerRetentionRate},
      trust_centre_url = ${fields.trustCentreUrl},
      security_incidents = ${JSON.stringify(fields.securityIncidents)}::jsonb,
      vendor_type = COALESCE(${vendorType}, vendor_type),
      vendor_maturity = COALESCE(${vendorMaturity}, vendor_maturity),
      company_website = COALESCE(${companyWebsite}, company_website),
      company_description = COALESCE(${companyDescription}, company_description),
      employee_count = COALESCE(${employeeCount}, employee_count),
      headquarters_location = COALESCE(${headquartersLocation}, headquarters_location),
      year_founded = COALESCE(${Number.isInteger(yearFounded) ? yearFounded : null}, year_founded),
      sector = COALESCE(${sectorJson}, sector),
      operating_regions = COALESCE(${operatingJson}::jsonb, operating_regions),
      updated_at = now()
    WHERE organization_id = ${organizationId}
  `);
}

export async function loadVendorOnboardingBusinessFields(
  orgIdParam: string,
  orgName?: string | null,
): Promise<Record<string, unknown> | null> {
  const result = await db.execute(sql`
    SELECT
      funding_status AS "fundingStatus",
      financial_position AS "financialPosition",
      enterprise_customers AS "enterpriseCustomers",
      customer_retention_rate AS "customerRetentionRate",
      trust_centre_url AS "trustCentreUrl",
      security_incidents AS "securityIncidents"
    FROM public.vendor_onboarding
    WHERE organization_id = ${orgIdParam}
      ${orgName ? sql`OR organization_id = ${orgName}` : sql``}
    LIMIT 1
  `);
  const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
  return rows[0] ?? null;
}
