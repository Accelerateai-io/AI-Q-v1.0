import type { Request, Response } from "express";
import { db } from "../../database/db.js";
import { vendors, usersTable, createOrganization, vendorSelfAttestations } from "../../schema/schema.js";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

/**
 * GET /vendorDirectory
 * Returns vendors with at least one product marked "Visible to buyers" (COMPLETED + visible_to_buyer).
 * Public Directory Listing is no longer required — product-level visibility is enough.
 * When DB has public_directory_listing column, it is still selected but not used as a filter.
 * Query ?scope=all (system admin only): returns all vendors, no filter (includes inactive organizations).
 * Otherwise excludes vendors whose organization is not active — they do not appear in the AI Vendor Directory.
 */
const listPublicVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const scopeAll = typeof req.query?.scope === "string" && req.query.scope.trim().toLowerCase() === "all";
    let isSystemAdmin = false;
    if (scopeAll) {
      const payload = req.user as { id?: number; userId?: string | number; email?: string } | undefined;
      const rawId = payload?.id ?? payload?.userId;
      const userId = rawId != null ? Number(rawId) : NaN;
      if (Number.isInteger(userId) && userId >= 1) {
        const [row] = await db
          .select({ user_platform_role: usersTable.user_platform_role, role: usersTable.role, organization_id: usersTable.organization_id })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1);
        const r = row as Record<string, unknown> | undefined;
        const platformRole = String(r?.user_platform_role ?? "").trim().toLowerCase();
        const role = String(r?.role ?? "").trim().toLowerCase();
        const orgId = r?.organization_id;
        isSystemAdmin =
          platformRole === "system admin" ||
          platformRole === "system_admin" ||
          platformRole === "systemadmin" ||
          (Number(orgId) === 1 && role === "admin");
      }
    }

    const selectFields = {
      id: vendors.id,
      userId: vendors.userId,
      organizationId: vendors.organizationId,
      vendorType: vendors.vendorType,
      companyWebsite: vendors.companyWebsite,
      companyDescription: vendors.companyDescription,
      headquartersLocation: vendors.headquartersLocation,
      vendorMaturity: vendors.vendorMaturity,
      sector: vendors.sector,
      publicDirectoryListing: vendors.publicDirectoryListing,
      organizationName: createOrganization.organizationName,
    };
    const joinCondition = sql`${createOrganization.id} = (${vendors.organizationId})::int`;
    const rows =
      scopeAll && isSystemAdmin
        ? await db
            .select(selectFields)
            .from(vendors)
            .leftJoin(createOrganization, joinCondition)
        : await db
            .select(selectFields)
            .from(vendors)
            .leftJoin(createOrganization, joinCondition)
            .where(
              and(
                // Public Directory Listing no longer required — vendors appear if they have visible products
                // eq(vendors.publicDirectoryListing, true),
                eq(createOrganization.organizationStatus, "active"),
              ),
            );
    const vendorOrgIds = [
      ...new Set(
        rows
          .map((r) => String(r.organizationId ?? "").trim())
          .filter((id) => id.length > 0),
      ),
    ];
    const productRows =
      vendorOrgIds.length > 0
        ? await db
            .select({
              organization_id: vendorSelfAttestations.organization_id,
              product_name: vendorSelfAttestations.product_name,
            })
            .from(vendorSelfAttestations)
            .where(
              and(
                inArray(vendorSelfAttestations.organization_id, vendorOrgIds),
                eq(vendorSelfAttestations.visible_to_buyer, true),
                sql`upper(${vendorSelfAttestations.status}) = 'COMPLETED'`,
                sql`(${vendorSelfAttestations.expiry_at} IS NULL OR ${vendorSelfAttestations.expiry_at} >= now())`,
                isNull(vendorSelfAttestations.user_archived_at)
              )
            )
        : [];
    const productNamesByOrgId: Record<string, string[]> = {};
    for (const pr of productRows) {
      const oid = String(pr.organization_id ?? "").trim();
      if (!oid) continue;
      const name = (pr.product_name ?? "").trim();
      if (!name) continue;
      if (!productNamesByOrgId[oid]) productNamesByOrgId[oid] = [];
      if (!productNamesByOrgId[oid].includes(name)) productNamesByOrgId[oid].push(name);
    }

    let list = rows.map((r) => {
      const orgId = String(r.organizationId ?? "").trim();
      return {
        id: r.id,
        userId: r.userId,
        organizationId: r.organizationId,
        organizationName: r.organizationName ?? null,
        vendorType: r.vendorType ?? "",
        companyWebsite: r.companyWebsite ?? "",
        companyDescription: r.companyDescription ?? "",
        headquartersLocation: r.headquartersLocation ?? "",
        vendorMaturity: r.vendorMaturity ?? "",
        sector: r.sector ?? null,
        productNames: orgId && productNamesByOrgId[orgId] ? productNamesByOrgId[orgId] : [],
      };
    });
    if (!(scopeAll && isSystemAdmin)) {
      list = list.filter(
        (v) => Array.isArray(v.productNames) && v.productNames.length > 0,
      );
    }

    res.status(200).json({
      success: true,
      vendors: list,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    const msg = err?.message ?? "";
    if (msg.includes("public_directory_listing") || msg.includes("does not exist")) {
      res.status(200).json({ success: true, vendors: [] });
      return;
    }
    console.error("listPublicVendors error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default listPublicVendors;
