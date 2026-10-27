import type { Pool } from "pg";

/**
 * Runtime guard for the additive `report_status` column (20261021_report_status.sql).
 * The column may not exist yet if the migration has not been applied, so report
 * reads/writes must probe first rather than assume it is present.
 *
 * Mirrors services/cotsBuyerArchivedColumn.ts: only `true` is cached (so applying
 * the migration without a restart is picked up), and a missing column is re-probed
 * at most once per minute.
 */
const cachedHas: Record<string, boolean> = {};
const lastNegativeProbeMs: Record<string, number> = {};
const NEGATIVE_PROBE_TTL_MS = 60_000;

function pgCode(e: unknown): string {
  return e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
}

const ALLOWED_TABLES = new Set([
  "customer_risk_assessment_reports",
  "cots_buyer_assessments",
]);

export async function hasReportStatusColumn(
  pool: Pool,
  table: "customer_risk_assessment_reports" | "cots_buyer_assessments",
): Promise<boolean> {
  if (!ALLOWED_TABLES.has(table)) return false;
  if (cachedHas[table] === true) return true;
  const now = Date.now();
  if (now - (lastNegativeProbeMs[table] ?? 0) < NEGATIVE_PROBE_TTL_MS) return false;
  try {
    await pool.query(`SELECT report_status FROM ${table} LIMIT 0`);
    cachedHas[table] = true;
    return true;
  } catch (e: unknown) {
    const code = pgCode(e);
    if (code === "42703" || code === "42P01") {
      lastNegativeProbeMs[table] = now;
      return false;
    }
    throw e;
  }
}

export function resetReportStatusColumnCache(): void {
  for (const k of Object.keys(cachedHas)) delete cachedHas[k];
  for (const k of Object.keys(lastNegativeProbeMs)) delete lastNegativeProbeMs[k];
}
