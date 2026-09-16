import { eq } from "drizzle-orm";
import { db } from "../database/db.js";
import { assessmentRisks } from "../schema/assessments/assessmentRisks.js";
import { risks } from "../schema/risks/risks.js";
import type { Top5RisksWithMitigations } from "./getTop5RisksFromAssessmentContext.js";

/**
 * Persist the catalog risks used for type-01 VTS onto assessment_risks.
 * Best-effort: scoring still succeeds if this write fails.
 */
export async function persistAssessmentRisks(
  assessmentId: string,
  top5: Top5RisksWithMitigations,
): Promise<void> {
  const id = assessmentId.trim();
  if (!id) return;

  await db.delete(assessmentRisks).where(eq(assessmentRisks.assessment_id, id));

  const seenCatalog = new Set<string>();
  const seenUuid = new Set<string>();
  for (const row of top5.top5Risks) {
    const catalogId = String(row.risk_id ?? "").trim().slice(0, 50);
    if (!catalogId || seenCatalog.has(catalogId)) continue;
    seenCatalog.add(catalogId);

    const [existing] = await db
      .select({ id: risks.id })
      .from(risks)
      .where(eq(risks.risk_id, catalogId))
      .limit(1);
    let riskUuid = existing?.id ?? null;
    if (!riskUuid) {
      const [inserted] = await db
        .insert(risks)
        .values({
          risk_id: catalogId,
          title: String(row.risk_title ?? catalogId).slice(0, 500),
          domain: row.domains != null ? String(row.domains).slice(0, 100) : null,
          description: row.description != null ? String(row.description) : null,
        })
        .returning({ id: risks.id });
      riskUuid = inserted?.id ?? null;
    }
    if (!riskUuid || seenUuid.has(riskUuid)) continue;
    seenUuid.add(riskUuid);
    await db.insert(assessmentRisks).values({
      assessment_id: id,
      risk_id: riskUuid,
    });
  }
}
