import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { getJwtSecret } from "../config/auth.js";
import { db } from "../database/db.js";
import { createOrganization, usersTable } from "../schema/schema.js";
import { runWithRequestActor } from "../utils/requestActorContext.js";
import { isSessionTokenPayload, sessionUserId } from "../utils/accessControl.js";

interface AuthRequest extends Request {
  user?: string | JwtPayload;
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

interface SessionUserStatus {
  found: boolean;
  userActive: boolean;
  orgActive: boolean;
}

/** Fetch the session user's own status + organization status in one query. */
async function getSessionUserStatus(userId: number): Promise<SessionUserStatus> {
  const rows = await db
    .select({
      userStatus: usersTable.userStatus,
      organizationStatus: createOrganization.organizationStatus,
    })
    .from(usersTable)
    .leftJoin(createOrganization, eq(usersTable.organization_id, createOrganization.id))
    .where(eq(usersTable.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return { found: false, userActive: false, orgActive: false };
  const userStatus = String(row.userStatus ?? "").trim().toLowerCase();
  const orgStatus = String(row.organizationStatus ?? "").trim().toLowerCase();
  return { found: true, userActive: userStatus === "active", orgActive: orgStatus === "active" };
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
        // Only true login session tokens may authenticate an API request.
        // Invite, password-reset and onboarding tokens must not act as sessions.
        if (!isSessionTokenPayload(decoded)) {
          return res.status(403).json({ message: "Not a session token" });
        }
        const userId = sessionUserId(decoded)!;
        const email = parseTokenEmail(decoded);

        const status = await getSessionUserStatus(userId);
        if (!status.found) {
          return res.status(403).json({ message: "User not found" });
        }
        if (!status.userActive) {
          return res.status(403).json({
            code: "inactive",
            message: "This account is inactive. Please contact your administrator.",
          });
        }
        if (!status.orgActive) {
          return res.status(403).json({
            code: "organization_inactive",
            message:
              "Your organization is inactive. Access is denied. Please contact your administrator.",
          });
        }

        req.user = decoded;
        await nextWithActor(
          { userId, email },
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
