import type { Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import { or, eq } from "drizzle-orm";
import { db } from "../../database/db.js";
import { vendorSelfAttestations } from "../../schema/schema.js";
import { getCallerContext, canDownloadAttestation } from "../../utils/accessControl.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads_vendor_attestations");

/**
 * Sanitize file name: allow only base name (no path segments) to prevent path traversal.
 */
function safeFileName(name: string): string {
  const base = path.basename(name);
  if (!base || base === "." || base === "..") return "";
  return base;
}

/**
 * GET /vendorSelfAttestation/document/:attestationId/:fileName
 * Serves an uploaded attestation document so the user can open it from the preview.
 * File must exist under uploads/vendor-attestations/:attestationId/:fileName.
 * Returns 404 if file does not exist.
 */
const getAttestationDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const attestationId = String(req.params.attestationId ?? "").trim();
    let rawFileName = String(req.params.fileName ?? "").trim();
    try {
      if (rawFileName && /%[0-9A-Fa-f]{2}/.test(rawFileName)) {
        rawFileName = decodeURIComponent(rawFileName);
      }
    } catch {
      // use rawFileName as-is if decode fails
    }
    const fileName = safeFileName(rawFileName);

    if (!attestationId || !fileName) {
      res.status(400).json({ success: false, message: "Attestation ID and file name are required" });
      return;
    }

    // Authorize: only the owning org, internal users, or a buyer when the
    // attestation is visible to buyers may download the document.
    const caller = await getCallerContext(req);
    if (!caller) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const [att] = await db
      .select({
        organization_id: vendorSelfAttestations.organization_id,
        visible_to_buyer: vendorSelfAttestations.visible_to_buyer,
      })
      .from(vendorSelfAttestations)
      .where(
        or(
          eq(vendorSelfAttestations.id, attestationId),
          eq(vendorSelfAttestations.vendor_self_attestation_id, attestationId),
        ),
      )
      .limit(1);
    if (!att) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }
    const ownerOrgId = att.organization_id != null ? Number(att.organization_id) : null;
    if (
      !canDownloadAttestation({
        isInternal: caller.isInternal,
        callerOrgId: caller.organizationId,
        ownerOrgId,
        callerPlatformRole: caller.platformRole,
        visibleToBuyer: att.visible_to_buyer === true,
      })
    ) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const dir = path.resolve(UPLOADS_DIR, attestationId);
    const filePath = path.resolve(dir, fileName);
    const uploadsResolved = path.resolve(UPLOADS_DIR);

    // Ensure resolved path is under UPLOADS_DIR (no path traversal)
    const relative = path.relative(uploadsResolved, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        console.error("getAttestationDocument sendFile error:", err);
        res.status(500).json({ success: false, message: "Failed to send document" });
      }
    });
  } catch (err) {
    console.error("getAttestationDocument error:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
};

export default getAttestationDocument;
