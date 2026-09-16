import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { getJwtSecret } from "../config/auth.js";
import { db } from "../database/db.js";
import { createOrganization, usersTable } from "../schema/schema.js";
import { runWithRequestActor } from "../utils/requestActorContext.js";

interface AuthRequest extends Request {
  user?: string | JwtPayload;
}

function parseTokenUserId(decoded: unknown): number | null {
  if (decoded == null || typeof decoded !== "object" || Array.isArray(decoded)) {
    return null;
  }
  const p = decoded as Record<string, unknown>;
  const raw = p.id ?? p.userId;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function parseTokenEmail(decoded: unknown): string | undefined {
  if (decoded == null || typeof decoded !== "object" || Array.isArray(decoded)) {
    return undefined;
  }
  const email = (decoded as Record<string, unknown>).email;
  if (typeof email !== "string") return undefined;
  const trimmed = email.trim();
  return trimmed || undefined;
}

/** True when the user's organization row exists and organizationStatus is active. */
async function isUserOrganizationActive(userId: number): Promise<boolean> {
  const rows = await db
    .select({ organizationStatus: createOrganization.organizationStatus })
    .from(usersTable)
    .leftJoin(createOrganization, eq(usersTable.organization_id, createOrganization.id))
    .where(eq(usersTable.id, userId))
    .limit(1);
  const orgStatus = String(rows[0]?.organizationStatus ?? "").trim().toLowerCase();
  return orgStatus === "active";
}

/**
 * Keep ALS actor context alive until the HTTP response finishes.
 * Plain ALS.run(() => next()) exits when next() returns — before async handlers resume.
 */
function nextWithActor(
  actor: { userId?: number; email?: string },
  res: Response,
  next: NextFunction,
): Promise<void> {
  return runWithRequestActor(actor, () => {
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      res.on("finish", done);
      res.on("close", done);
      next();
    });
  });
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "Token missing" });

  const JWT_SECRET = getJwtSecret();
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const isExpired = err.name === "TokenExpiredError";
      return res
        .status(isExpired ? 401 : 403)
        .json({ message: isExpired ? "Token expired" : "Token invalid or expired" });
    }

    void (async () => {
      try {
        const userId = parseTokenUserId(decoded);
        const email = parseTokenEmail(decoded);
        if (userId != null) {
          const active = await isUserOrganizationActive(userId);
          if (!active) {
            return res.status(403).json({
              code: "organization_inactive",
              message:
                "Your organization is inactive. Access is denied. Please contact your administrator.",
            });
          }
        }
        if (decoded !== undefined) req.user = decoded;
        await nextWithActor(
          { userId: userId ?? undefined, email },
          res,
          next,
        );
      } catch (e) {
        console.error("authenticateToken organization check:", e);
        return res.status(500).json({ message: "Authorization check failed" });
      }
    })();
  });
};

export default authenticateToken;
