import type { Request, Response } from "express";
import {
  getAiRiskApiKeyConfig,
  setAiRiskApiKey,
} from "../../services/admin/aiRiskApiKeyConfig.service.js";

function readApiKey(body: unknown): string {
  if (body == null || typeof body !== "object" || Array.isArray(body)) return "";
  const apiKey = (body as Record<string, unknown>).apiKey;
  return typeof apiKey === "string" ? apiKey.trim() : "";
}

/** GET /admin/services/ai-risk-api-key */
export async function getAiRiskApiKeyHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const config = getAiRiskApiKeyConfig();
    res.status(200).json({ ok: true, ...config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getAiRiskApiKeyHandler:", message);
    res.status(500).json({ ok: false, message: "Failed to load AI Risk API key" });
  }
}

/** PUT /admin/services/ai-risk-api-key */
export async function setAiRiskApiKeyHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const apiKey = readApiKey(req.body);
  if (!apiKey) {
    res.status(400).json({
      ok: false,
      error: { message: "API key is required." },
    });
    return;
  }

  try {
    const config = setAiRiskApiKey(apiKey);
    res.status(200).json({
      ok: true,
      message: "AI Risk API key saved.",
      ...config,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save AI Risk API key.";
    res.status(400).json({
      ok: false,
      error: { message },
    });
  }
}
