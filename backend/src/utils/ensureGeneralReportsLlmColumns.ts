import { sql } from "drizzle-orm";
import { db } from "../database/db.js";

/**
 * Ensures general_reports has llm_model_id / llm_model_label so list/get/insert
 * do not fail with "column does not exist" on older databases.
 */
export async function ensureGeneralReportsLlmColumns(): Promise<void> {
  try {
    await db.execute(sql`
      ALTER TABLE public.general_reports
      ADD COLUMN IF NOT EXISTS llm_model_id varchar(512)
    `);
    await db.execute(sql`
      ALTER TABLE public.general_reports
      ADD COLUMN IF NOT EXISTS llm_model_label varchar(512)
    `);
  } catch {
    // Ignore (e.g. permission) — callers still surface a clear DB error if columns remain missing
  }
}
