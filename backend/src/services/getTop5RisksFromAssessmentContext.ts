import { db } from "../database/db.js";
import { sql, inArray } from "drizzle-orm";
import { riskTop5Mitigations } from "../schema/risks/riskTop5Mitigations.js";

export interface RiskMappingRow {
  risk_mapping_id: number;
  risk_id: string | null;
  risk_title: string | null;
  domains: string | null;
  description: string | null;
  technical_description: string | null;
  executive_summary: string | null;
  attack_vector: string | null;
  observable_indicators: string | null;
  data_to_identify_risk: string | null;
  evidence_sources: string | null;
  intent: string | null;
  timing: string | null;
  risk_type_detected: string | null;
  primary_risk: string | null;
  secondary_risks: string | null;
}

export interface MitigationRow {
  mapping_id: number;
  risk_id: string;
  mitigation_action_id: string;
  mitigation_action_name: string;
  mitigation_category: string;
  mitigation_definition: string | null;
}

export interface Top5RisksWithMitigations {
  top5Risks: RiskMappingRow[];
  mitigationsByRiskId: Record<string, MitigationRow[]>;
}

function toStr(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.length ? v.map(toStr).join(" ") : "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim();
}

/**
 * Extract assessment context for matching risk_mappings table on domain, timing, intent, primary_risk, secondary_risks.
 */
function extractContext(payload: Record<string, unknown>): {
  domain: string;
  intent: string;
  timing: string;
  primary_risk: string;
  secondary_risks: string;
} {
  const domain =
    toStr(payload.customer_sector ?? payload.customerSector) ||
    toStr(payload.industry_sector ?? payload.industrySector ?? payload.industry) ||
    toStr(payload.risk_domain_scores ?? payload.riskDomainScores).slice(0, 200);
  const intent =
    toStr(payload.expected_outcomes ?? payload.expectedOutcomes) ||
    toStr(payload.business_pain_point ?? payload.businessPainPoint) ||
    toStr(payload.regulatory_requirements ?? payload.regulatoryRequirements).slice(0, 200);
  const timing =
    toStr(payload.implementation_timeline ?? payload.implementationTimeline) ||
    toStr(payload.target_timeline ?? payload.targetTimeline);
  const primary_risk =
    toStr(payload.primary_pain_point ?? payload.primaryPainPoint) ||
    toStr(payload.business_pain_point ?? payload.businessPainPoint) ||
    toStr(payload.identified_risks ?? payload.identifiedRisks).slice(0, 200) ||
    toStr(payload.customer_specific_risks ?? payload.customerSpecificRisks).slice(0, 200);
  const secondary_risks =
    toStr(payload.identified_risks ?? payload.identifiedRisks).slice(0, 200) ||
    toStr(payload.customer_specific_risks ?? payload.customerSpecificRisks).slice(0, 200) ||
    "";
  return { domain, intent, timing, primary_risk, secondary_risks };
}

function extractMappingIds(payload: Record<string, unknown>): number[] {
  const raw = payload.risk_mitigation_mapping_ids ?? payload.riskMitigationMappingIds;
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const ids = list
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}

/**
 * Human-readable block for LLM prompts (same shape as vendor COTS "Database-matched top risks").
 */
export function formatTop5RisksForPrompt(top5: Top5RisksWithMitigations | null): string {
  if (!top5 || top5.top5Risks.length === 0) return "";
  const lines: string[] = ["--- Database-matched top risks and mitigations ---"];
  for (const r of top5.top5Risks) {
    lines.push(
      `Risk [${r.risk_id}]: ${r.risk_title ?? "N/A"} | Domain: ${r.domains ?? "N/A"} | Intent: ${r.intent ?? "N/A"} | Timing: ${r.timing ?? "N/A"} | Primary risk: ${r.primary_risk ?? "N/A"}`,
    );
    if (r.description) {
      lines.push(`  Description: ${r.description.slice(0, 300)}${r.description.length > 300 ? "..." : ""}`);
    }
    const mitigations = r.risk_id ? top5.mitigationsByRiskId[r.risk_id] ?? [] : [];
    for (const m of mitigations) {
      lines.push(
        `  Mitigation: ${m.mitigation_action_name} (${m.mitigation_category})${m.mitigation_definition ? ` – ${m.mitigation_definition.slice(0, 150)}` : ""}`,
      );
    }
  }
  lines.push("--- End of database-matched risks ---");
  return lines.join("\n");
}

/**
 * 1. Query risk_mappings table: compare assessment context (domain, timing, intent, primary_risk, secondary_risks)
 *    and get the top 5 matching rows by match score.
 * 2. Compare that data to risk_top5_mitigations table: fetch mitigations for those top 5 risk_ids
 *    and return risks with mitigations by risk_id.
 */
export async function getTop5RisksWithMitigations(
  payload: Record<string, unknown>
): Promise<Top5RisksWithMitigations> {
  const { domain, intent, timing, primary_risk, secondary_risks } = extractContext(payload);
  const explicitMappingIds = extractMappingIds(payload);

  const domainPattern = domain ? `%${domain}%` : null;
  const intentPattern = intent ? `%${intent}%` : null;
  const timingPattern = timing ? `%${timing}%` : null;
  const primaryRiskPattern = primary_risk ? `%${primary_risk}%` : null;
  const secondaryRisksPattern = secondary_risks ? `%${secondary_risks}%` : null;

  type QueryResult = { rows: RiskMappingRow[] };
  const selectedRows: RiskMappingRow[] = [];
  if (explicitMappingIds.length > 0) {
    const explicitTop5Result = await db.execute(sql`
      SELECT risk_mapping_id, risk_id, risk_title, domains, description, technical_description,
             executive_summary, attack_vector, observable_indicators, data_to_identify_risk,
             evidence_sources, intent, timing, risk_type_detected, primary_risk, secondary_risks
      FROM public.risk_mappings
      WHERE risk_mapping_id IN (${sql.join(explicitMappingIds.map((id) => sql`${id}`), sql`, `)})
      ORDER BY risk_mapping_id ASC
      LIMIT 5
    `);
    selectedRows.push(...((((explicitTop5Result as unknown) as QueryResult).rows ?? []) as RiskMappingRow[]));
  }

  const remaining = Math.max(0, 5 - selectedRows.length);
  const excludeIds = selectedRows.map((r) => r.risk_mapping_id).filter((n) => Number.isInteger(n));
  const fallbackResult =
    remaining > 0
      ? await db.execute(sql`
          WITH scored AS (
            SELECT *,
              (CASE WHEN ${domainPattern}::text IS NOT NULL AND domains IS NOT NULL AND domains ILIKE ${domainPattern} THEN 1 ELSE 0 END +
               CASE WHEN ${intentPattern}::text IS NOT NULL AND intent IS NOT NULL AND intent ILIKE ${intentPattern} THEN 1 ELSE 0 END +
               CASE WHEN ${timingPattern}::text IS NOT NULL AND timing IS NOT NULL AND timing ILIKE ${timingPattern} THEN 1 ELSE 0 END +
               CASE WHEN ${primaryRiskPattern}::text IS NOT NULL AND primary_risk IS NOT NULL AND primary_risk ILIKE ${primaryRiskPattern} THEN 1 ELSE 0 END +
               CASE WHEN ${secondaryRisksPattern}::text IS NOT NULL AND secondary_risks IS NOT NULL AND secondary_risks ILIKE ${secondaryRisksPattern} THEN 1 ELSE 0 END) AS match_score
            FROM public.risk_mappings
          )
          SELECT risk_mapping_id, risk_id, risk_title, domains, description, technical_description,
                 executive_summary, attack_vector, observable_indicators, data_to_identify_risk,
                 evidence_sources, intent, timing, risk_type_detected, primary_risk, secondary_risks
          FROM scored
          ${excludeIds.length > 0 ? sql`WHERE risk_mapping_id NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})` : sql``}
          ORDER BY match_score DESC NULLS LAST, risk_mapping_id ASC
          LIMIT ${remaining}
        `)
      : null;
  const fallbackRows: RiskMappingRow[] = fallbackResult
    ? (((fallbackResult as unknown) as QueryResult).rows ?? [])
    : [];
  const rows: RiskMappingRow[] = [...selectedRows, ...fallbackRows].slice(0, 5);

  const riskIds = [...new Set(rows.map((r) => r.risk_id).filter(Boolean) as string[])];

  let mitigationsByRiskId: Record<string, MitigationRow[]> = {};
  if (riskIds.length > 0) {
    const mitigationsRows = await db
      .select()
      .from(riskTop5Mitigations)
      .where(inArray(riskTop5Mitigations.risk_id, riskIds));
    const mitigations: MitigationRow[] = mitigationsRows.map((m) => ({
      mapping_id: m.mapping_id,
      risk_id: m.risk_id,
      mitigation_action_id: m.mitigation_action_id,
      mitigation_action_name: m.mitigation_action_name,
      mitigation_category: m.mitigation_category,
      mitigation_definition: m.mitigation_definition ?? null,
    }));
    mitigationsByRiskId = riskIds.reduce<Record<string, MitigationRow[]>>((acc, id) => {
      acc[id] = mitigations.filter((m) => m.risk_id === id);
      return acc;
    }, {});
  }

  return {
    top5Risks: rows,
    mitigationsByRiskId,
  };
}
