import type { Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import multer, { type FileFilterCallback } from "multer";
import { db } from "../../database/db.js";
import { usersTable, vendorSelfAttestations } from "../../schema/schema.js";
import { eq } from "drizzle-orm";
import { canAccessOrgAttestation } from "../../utils/attestationAccess.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads_vendor_attestations");

const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
const MAX_FILENAME_LENGTH = 255;

function safeFileName(name: string): string {
  const base = path.basename(name);
  if (!base || base === "." || base === "..") return "";
  if (base.length > MAX_FILENAME_LENGTH) return base.slice(0, MAX_FILENAME_LENGTH);
  const ext = path.extname(base).toLowerCase();
  if (ext && !ALLOWED_EXT.includes(ext)) return "";
  return base;
}

/**
 * POST /vendorSelfAttestation/upload/:attestationId
 * Accepts multipart/form-data with field "document" (single file) or "documents" (multiple).
 * Stores file(s) under uploads/vendor-attestations/:attestationId/.
 * Attestation must exist and belong to the current user.
 */
export async function uploadAttestationDocument(req: Request, res: Response): Promise<void> {
  const attestationId = String(req.params?.attestationId ?? "").trim();
  if (!attestationId) {
    res.status(400).json({ success: false, message: "Attestation ID is required" });
    return;
  }

  const payload = req.user as { id?: number; userId?: string | number } | undefined;
  const rawId = payload?.id ?? payload?.userId;
  const userId = rawId != null ? Number(rawId) : NaN;

  try {
    // No email-lookup fallback: only a verified session token's id may upload.
    if (!Number.isInteger(userId) || userId < 1) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    // Any user in the owning organization may upload evidence (not just the
    // original author) — authorize via canAccessOrgAttestation.
    const [caller] = await db
      .select({ orgId: usersTable.organization_id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const callerOrgId = caller?.orgId != null ? String(caller.orgId) : null;
    const [row] = await db
      .select({
        id: vendorSelfAttestations.id,
        organization_id: vendorSelfAttestations.organization_id,
        user_id: vendorSelfAttestations.user_id,
      })
      .from(vendorSelfAttestations)
      .where(eq(vendorSelfAttestations.id, attestationId))
      .limit(1);
    if (!row) {
      res.status(404).json({ success: false, message: "Attestation not found" });
      return;
    }
    if (!canAccessOrgAttestation(row.organization_id, row.user_id, callerOrgId, userId)) {
      res.status(403).json({ success: false, message: "You do not have access to this attestation" });
      return;
    }

    const dir = path.resolve(UPLOADS_DIR, attestationId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) =>
        cb(null, dir),
      filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const safe = safeFileName(file.originalname || "document");
        const name = safe || `upload-${Date.now()}${path.extname(file.originalname || "") || ".bin"}`;
        cb(null, name);
      },
    });
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file
    const upload = multer({
      storage,
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const name = file.originalname || "";
        const ext = path.extname(name).toLowerCase();
        if (ext && !ALLOWED_EXT.includes(ext)) {
          return cb(new Error("Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX"));
        }
        cb(null, true);
      },
    });

    const run = (): void => {
      const single = upload.single("document");
      single(req, res, (err: unknown) => {
        if (err) {
          const multerErr = err as { code?: string };
          if (multerErr?.code === "LIMIT_FILE_SIZE") {
            res.status(400).json({ success: false, message: "File too large (max 10MB per file)" });
            return;
          }
          res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Upload failed" });
          return;
        }
        const file = (req as Request & { file?: { filename: string } }).file;
        if (!file) {
          res.status(400).json({ success: false, message: "No file in field 'document'" });
          return;
        }
        res.status(200).json({ success: true, fileName: file.filename });
      });
    };

    run();
  } catch (e) {
    console.error("uploadAttestationDocument error:", e);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

