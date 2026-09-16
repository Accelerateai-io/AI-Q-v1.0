import type { Request, Response } from "express";
import { db } from "../../database/db.js";
import { createOrganization, vendors, vendorSelfAttestations } from "../../schema/schema.js";
import { and, eq, or } from "drizzle-orm";
import {
  mapAttestationRow,
  companyProfileFromAttestationRow,
} from "../../utils/mapVendorSelfAttestationApi.js";
import {
  firstNonEmptyString,
  lookupOrganizationName,
} from "../../utils/lookupOrganizationName.js";

function parseVendorSector(sectorRaw: unknown): Record<string, unknown> {
  if (sectorRaw != null && typeof sectorRaw === "object" && !Array.isArray(sectorRaw)) {
    return sectorRaw as Record<string, unknown>;
  }
  if (typeof sectorRaw === "string" && sectorRaw.trim()) {
    try {
      const parsed = JSON.parse(sectorRaw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function companyProfileFromVendorRow(row: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!row) return {};
  const operatingRegions = Array.isArray(row.operatingRegions)
    ? row.operatingRegions
    : (row.operatingRegions != null && typeof row.operatingRegions === "object"
      ? (row.operatingRegions as string[])
      : []);
  return {
    vendorName: row.vendorName ?? "",
    vendorType: row.vendorType ?? "",
    sector: parseVendorSector(row.sector),
    vendorMaturity: row.vendorMaturity ?? "",
    companyWebsite: row.companyWebsite ?? "",
    companyDescription: row.companyDescription ?? "",
    employeeCount: row.employeeCount ?? "",
    yearFounded: row.yearFounded ?? null,
    headquartersLocation: row.headquartersLocation ?? "",
    operatingRegions,
    fundingStatus: row.fundingStatus ?? "",
    financialPosition: row.financialPosition ?? "",
    enterpriseCustomers: row.enterpriseCustomers ?? "",
    customerRetentionRate: row.customerRetentionRate ?? "",
    trustCentreUrl: row.trustCentreUrl ?? "",
    securityIncidents: Array.isArray(row.securityIncidents) ? row.securityIncidents : [],
  };
}

/**
 * GET /orgAttestationPreview/:orgId/:attestationId - returns full attestation + companyProfile for preview.
 * Used by organization page to show attestation preview modal (system admin viewing org's attestations).
 */
const getOrgAttestationPreview = async (req: Request, res: Response) => {
  try {
    const orgIdParam = String(req.params.orgId ?? "").trim();
    const attestationId = String(req.params.attestationId ?? "").trim();
    if (!orgIdParam || !attestationId) {
      return res.status(400).json({ message: "Organization ID and attestation ID are required" });
    }

    const orgRow = await db
      .select({
        id: createOrganization.id,
        organizationName: createOrganization.organizationName,
      })
      .from(createOrganization)
      .where(eq(createOrganization.id, Number(orgIdParam) || 0))
      .limit(1);

    let orgName: string | null = orgRow[0]?.organizationName ?? null;
    if (!orgName) {
      orgName = (await lookupOrganizationName(orgIdParam)) || null;
    }

    const whereClause = orgName
      ? and(
          eq(vendorSelfAttestations.id, attestationId),
          or(
            eq(vendorSelfAttestations.organization_id, orgIdParam),
            eq(vendorSelfAttestations.organization_id, orgName)
          )
        )
      : and(
          eq(vendorSelfAttestations.id, attestationId),
          eq(vendorSelfAttestations.organization_id, orgIdParam)
        );

    const [one] = await db
      .select()
      .from(vendorSelfAttestations)
      .where(whereClause)
      .limit(1);

    if (!one) {
      return res.status(404).json({
        success: false,
        message: "Attestation not found",
        companyProfile: {},
        attestation: {},
      });
    }

    const oneRow = one as Record<string, unknown>;
    const attestation = mapAttestationRow(oneRow);

    const vendorWhere = orgName
      ? or(eq(vendors.organizationId, orgIdParam), eq(vendors.organizationId, orgName))
      : eq(vendors.organizationId, orgIdParam);

    const [vendorRow] = await db
      .select({
        vendorName: vendors.vendorName,
        vendorType: vendors.vendorType,
        sector: vendors.sector,
        vendorMaturity: vendors.vendorMaturity,
        companyWebsite: vendors.companyWebsite,
        companyDescription: vendors.companyDescription,
        employeeCount: vendors.employeeCount,
        yearFounded: vendors.yearFounded,
        headquartersLocation: vendors.headquartersLocation,
        operatingRegions: vendors.operatingRegions,
        fundingStatus: vendors.fundingStatus,
        financialPosition: vendors.financialPosition,
        enterpriseCustomers: vendors.enterpriseCustomers,
        customerRetentionRate: vendors.customerRetentionRate,
        trustCentreUrl: vendors.trustCentreUrl,
        securityIncidents: vendors.securityIncidents,
      })
      .from(vendors)
      .where(vendorWhere)
      .limit(1);

    const fromOnboarding = companyProfileFromVendorRow(vendorRow as Record<string, unknown> | undefined);
    const fromAttestation = companyProfileFromAttestationRow(oneRow);
    const companyProfile: Record<string, unknown> = { ...fromOnboarding };
    for (const [key, value] of Object.entries(fromAttestation)) {
      if (value == null || value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value as Record<string, unknown>).length === 0
      ) {
        continue;
      }
      companyProfile[key] = value;
    }
    companyProfile.vendorName = firstNonEmptyString(
      fromOnboarding.vendorName,
      await lookupOrganizationName(
        oneRow.organization_id == null ? undefined : String(oneRow.organization_id),
      ),
      orgName,
    );

    if (!attestation.trust_centre_url && fromOnboarding.trustCentreUrl) {
      attestation.trust_centre_url = fromOnboarding.trustCentreUrl;
    }
    if (
      (!Array.isArray(attestation.security_incidents) || attestation.security_incidents.length === 0) &&
      Array.isArray(fromOnboarding.securityIncidents) &&
      fromOnboarding.securityIncidents.length > 0
    ) {
      attestation.security_incidents = fromOnboarding.securityIncidents;
      if (!attestation.has_public_security_incident) {
        attestation.has_public_security_incident = "yes";
      }
    }

    return res.status(200).json({
      success: true,
      message: "Attestation preview fetched successfully",
      companyProfile,
      attestation,
    });
  } catch (error) {
    console.error(
      "Error in getOrgAttestationPreview:",
      error instanceof Error ? error.message : String(error)
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      companyProfile: {},
      attestation: {},
    });
  }
};

export default getOrgAttestationPreview;
