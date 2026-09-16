import type { Request, Response } from "express";
import { getOrganizationUsage } from "../../services/admin/orgUsage.service.js";
import {
  saveOrganizationTokenConfig,
  getOrganizationTokenConfig,
} from "../../services/admin/orgTokenConfig.service.js";
import {
  asNonNegInt,
  isOrgControlFeature,
} from "../../services/admin/orgControlFeatures.js";

function parseOrgId(value: unknown): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

function parseActorUserId(req: Request): number | null {
  const payload = req.user as { id?: number; userId?: string | number } | undefined;
  const rawId = payload?.id ?? payload?.userId;
  const userId = rawId != null ? Number(rawId) : NaN;
  if (!Number.isInteger(userId) || userId < 1) return null;
  return userId;
}

function parseIsoDate(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const parsed = new Date(`${value.trim()}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function defaultRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  from.setUTCDate(from.getUTCDate() - 29);
  const toDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  return { from, to: toDay };
}

/** GET /admin/services/org-usage/:organizationId */
export async function getOrgUsageHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const organizationId = parseOrgId(req.params.organizationId);
    if (organizationId == null) {
      res.status(400).json({ ok: false, message: "Invalid organization id." });
      return;
    }

    const fallback = defaultRange();
    let from = parseIsoDate(req.query.from, fallback.from);
    let to = parseIsoDate(req.query.to, fallback.to);
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }

    const data = await getOrganizationUsage(organizationId, from, to);
    if (!data) {
      res.status(404).json({ ok: false, message: "Organization not found." });
      return;
    }
    res.status(200).json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getOrgUsageHandler:", message);
    res.status(500).json({ ok: false, message: "Failed to load organization usage." });
  }
}

/** GET /admin/services/org-token-config/:organizationId */
export async function getOrgTokenConfigHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const organizationId = parseOrgId(req.params.organizationId);
    if (organizationId == null) {
      res.status(400).json({ ok: false, message: "Invalid organization id." });
      return;
    }
    const data = await getOrganizationTokenConfig(organizationId);
    if (!data) {
      res.status(404).json({ ok: false, message: "Organization not found." });
      return;
    }
    res.status(200).json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getOrgTokenConfigHandler:", message);
    res.status(500).json({
      ok: false,
      message: "Failed to load organization token configuration.",
    });
  }
}

/** PUT /admin/services/org-token-config/:organizationId */
export async function putOrgTokenConfigHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const organizationId = parseOrgId(req.params.organizationId);
    if (organizationId == null) {
      res.status(400).json({ ok: false, message: "Invalid organization id." });
      return;
    }

    const body = req.body as Record<string, unknown> | null;
    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ ok: false, message: "Invalid request body." });
      return;
    }

    if (!isOrgControlFeature(body.feature)) {
      res.status(400).json({ ok: false, message: "Invalid feature." });
      return;
    }

    const usersRaw = Array.isArray(body.users) ? body.users : [];
    const users = usersRaw.flatMap((row) => {
      if (row == null || typeof row !== "object" || Array.isArray(row)) return [];
      const rec = row as Record<string, unknown>;
      const userId = parseOrgId(rec.userId);
      if (userId == null) return [];
      return [
        {
          userId,
          inputTokens: asNonNegInt(rec.inputTokens),
          outputTokens: asNonNegInt(rec.outputTokens),
        },
      ];
    });

    const data = await saveOrganizationTokenConfig(organizationId, {
      feature: body.feature,
      inputTokenQuota: asNonNegInt(body.inputTokenQuota),
      outputTokenQuota: asNonNegInt(body.outputTokenQuota),
      allocatedBy: parseActorUserId(req),
      users,
    });
    if (!data) {
      res.status(404).json({ ok: false, message: "Organization not found." });
      return;
    }
    res.status(200).json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("putOrgTokenConfigHandler:", message);
    res.status(500).json({
      ok: false,
      message: "Failed to save organization token configuration.",
    });
  }
}
