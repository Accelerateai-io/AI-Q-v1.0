import type { Request, Response } from "express";
import {
  getLlmModelUsageByDbId,
  listLlmModelUsage,
  listLlmModelUsageEventsByUsageId,
} from "../../services/observability/llmUsage.service.js";

/** GET /admin/services/llm-usage */
export async function getLlmUsageHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const rows = await listLlmModelUsage();
    res.status(200).json({ ok: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getLlmUsageHandler:", message);
    res.status(500).json({ ok: false, message: "Failed to load LLM usage" });
  }
}

/** GET /admin/services/llm-usage/:id */
export async function getLlmUsageByIdHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ ok: false, message: "Invalid usage id." });
      return;
    }
    const row = await getLlmModelUsageByDbId(id);
    if (!row) {
      res.status(404).json({ ok: false, message: "Model usage not found." });
      return;
    }
    res.status(200).json({ ok: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getLlmUsageByIdHandler:", message);
    res.status(500).json({ ok: false, message: "Failed to load LLM usage" });
  }
}

/** GET /admin/services/llm-usage/:id/events */
export async function getLlmUsageEventsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ ok: false, message: "Invalid usage id." });
      return;
    }
    const usage = await getLlmModelUsageByDbId(id);
    if (!usage) {
      res.status(404).json({ ok: false, message: "Model usage not found." });
      return;
    }
    const events = await listLlmModelUsageEventsByUsageId(id);
    res.status(200).json({ ok: true, data: events });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getLlmUsageEventsHandler:", message);
    res.status(500).json({ ok: false, message: "Failed to load usage events" });
  }
}
