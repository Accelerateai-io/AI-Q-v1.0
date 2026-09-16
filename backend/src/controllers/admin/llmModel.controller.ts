import type { Request, Response } from "express";
import {
  getLlmModelConfigAsync,
  setLlmModel,
  validateLlmModel,
} from "../../services/admin/llmModelConfig.service.js";

function readModelId(body: unknown): string {
  if (body == null || typeof body !== "object" || Array.isArray(body)) return "";
  const modelId = (body as Record<string, unknown>).modelId;
  return typeof modelId === "string" ? modelId.trim() : "";
}

/** GET /admin/services/llm-model */
export async function getLlmModelHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const config = await getLlmModelConfigAsync();
    res.status(200).json({ ok: true, ...config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getLlmModelHandler:", message);
    res.status(500).json({ ok: false, message: "Failed to load LLM model config" });
  }
}

/** POST /admin/services/llm-model/test */
export async function testLlmModelHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const modelId = readModelId(req.body);
    if (!modelId) {
      res.status(400).json({ success: false, message: "Model is required." });
      return;
    }
    if (modelId.length > 256) {
      res.status(400).json({ success: false, message: "Model id is too long." });
      return;
    }
    const result = await validateLlmModel(modelId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("testLlmModelHandler:", message);
    res.status(500).json({ success: false, message: "LLM model test failed" });
  }
}

/** PUT /admin/services/llm-model */
export async function setLlmModelHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const modelId = readModelId(req.body);
  if (!modelId) {
    res.status(400).json({
      ok: false,
      error: { message: "Model is required." },
    });
    return;
  }
  if (modelId.length > 256) {
    res.status(400).json({
      ok: false,
      error: { message: "Model id is too long." },
    });
    return;
  }

  try {
    const config = await setLlmModel(modelId);
    res.status(200).json({
      ok: true,
      message: "LLM model updated.",
      ...config,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update LLM model.";
    res.status(400).json({
      ok: false,
      error: { message },
    });
  }
}
