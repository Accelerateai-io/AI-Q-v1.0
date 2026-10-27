/**
 * mapping-baseline.ts — PROMPT 0 baseline snapshot of risk/framework mapping behavior.
 *
 * Purpose
 * -------
 * Record exactly how the current top-5 risk-mapping logic behaves so that later PRs
 * can prove nothing else changed. This script is READ-ONLY with respect to any database
 * and never mutates product code.
 *
 * Two run modes
 * -------------
 *   1. DB mode (when backend/.env.local exists, or --db is passed):
 *      Reads the database inside an explicit READ ONLY transaction
 *      (db.transaction(..., { accessMode: "read only" })) and issues only SELECTs.
 *      For every stored assessment records the top-5 risk ids, intent multiplier,
 *      likelihood/impact/severity, and the stored score(s); for every stored compliance
 *      document records detected class, mapped catalog, mapped control ids, relevanceScore,
 *      and gap rows. (Pending dev env access — not exercised in offline runs.)
 *
 *   2. Offline mode (default when no .env.local, or --offline):
 *      Calls the REAL product functions exported from
 *      backend/src/services/getTop5RisksFromAssessmentContext.ts
 *      (extractContext, extractMappingIds, isType01AttestationPayload, computeIntentScore,
 *      classifyIntentToken) so the offline snapshot can't drift from production logic.
 *      Only the match-score ranking is reproduced here (it runs as SQL ILIKE in production
 *      and cannot execute against a flat catalogue file). The risk catalogue is loaded from
 *      a CSV if provided via RISK_CATALOG_CSV, otherwise the `risk_mappings` COPY block of a
 *      non-prod SQL dump in DataBase/. Fixtures live in backend/test/fixtures/mapping/.
 *
 * Importing the service constructs a pg Pool but does NOT connect (pg connects lazily on the
 * first query; db.ts never queries at import), so offline mode stays offline.
 *
 * Output:
 *   backend/scripts/out/mapping-baseline-<YYYY-MM-DD>.json + .md   (gitignored, per-run)
 *   backend/scripts/baselines/baseline-before.json                 (committed, --freeze only,
 *                                                                    deterministic: no timestamp)
 *
 * Usage:
 *   npx tsx backend/scripts/mapping-baseline.ts              # auto: DB if .env.local present, else offline
 *   npx tsx backend/scripts/mapping-baseline.ts --offline    # force offline
 *   npx tsx backend/scripts/mapping-baseline.ts --offline --freeze   # also (re)write the frozen before-snapshot
 *   npx tsx backend/scripts/mapping-baseline.ts --db         # force DB mode
 *   RISK_DUMP=DataBase/11Aug2026_aiq_db.sql npx tsx backend/scripts/mapping-baseline.ts --offline
 *   RISK_CATALOG_CSV=/path/Enhanced_Risk_Database_Final.csv npx tsx backend/scripts/mapping-baseline.ts --offline
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
// Real product functions — offline mode calls these instead of re-implementing them.
import {
  extractContext,
  extractMappingIds,
  isType01AttestationPayload,
  computeIntentScore,
  classifyIntentToken,
} from "../src/services/getTop5RisksFromAssessmentContext.js";
// risk-mapping v2 selector (offline "after" snapshot for before/after regression).
import { selectTop5, selectedBecauseLine } from "../src/services/riskMapping/selectTop5.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const BACKEND_ROOT = path.resolve(__dirname, "..");
const DATABASE_DIR = path.join(REPO_ROOT, "DataBase");
const FIXTURES_DIR = path.join(BACKEND_ROOT, "test", "fixtures", "mapping");
const OUT_DIR = path.join(__dirname, "out");
const BASELINES_DIR = path.join(__dirname, "baselines");
const FROZEN_BEFORE_PATH = path.join(BASELINES_DIR, "baseline-before.json");

// Non-prod dumps only, in preference order. Avoids any file labelled "prod".
const PREFERRED_DUMPS = ["11Aug2026_aiq_db.sql", "ai_q_06May2026.sql", "ai_23Apr26.sql"];

const RISK_MAPPINGS_COLUMNS = [
  "risk_mapping_id",
  "risk_id",
  "risk_title",
  "domains",
  "description",
  "technical_description",
  "executive_summary",
  "attack_vector",
  "observable_indicators",
  "data_to_identify_risk",
  "evidence_sources",
  "intent",
  "timing",
  "risk_type_detected",
  "primary_risk",
  "secondary_risks",
] as const;

interface RiskMappingRow {
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

type ExtractedContext = ReturnType<typeof extractContext>;

// Offline VTS defaults when Risk Intellect is not configured
// (getTop5RisksFromAssessmentContext.ts:94-96, :248-254).
const DEFAULT_LI_SEVERITY = { likelihood: 3, impact: 3, severity: 9, source: "default" as const };

// ---------------------------------------------------------------------------
// ILIKE match-score ranking — mirrors the fallback SQL in getTop5RisksWithMitigations
// :717-741 (WITH scored ... match_score ... ORDER BY match_score DESC NULLS LAST, risk_mapping_id ASC).
// This is the ONLY piece reproduced in TS: production runs it as SQL ILIKE, which cannot
// execute against a flat catalogue file.
// ---------------------------------------------------------------------------

/** Convert a SQL LIKE pattern (with % and _ wildcards) to an anchored, case-insensitive RegExp (ILIKE). */
function likeToRegExp(pattern: string): RegExp {
  let out = "";
  for (const ch of pattern) {
    if (ch === "%") out += "[\\s\\S]*";
    else if (ch === "_") out += "[\\s\\S]";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + out + "$", "i");
}

/** ILIKE(value, '%needle%') — false when the column is null or the needle is empty (matches the SQL guards). */
function ilikeContains(value: string | null, needle: string): boolean {
  if (value == null || needle === "") return false;
  return likeToRegExp("%" + needle + "%").test(value);
}

interface RankedRisk extends RiskMappingRow {
  match_score: number;
  rank: number;
}

function rankTop5(rows: RiskMappingRow[], ctx: ExtractedContext, explicitMappingIds: number[]): {
  top5: RankedRisk[];
  usedExplicitPath: boolean;
} {
  // Explicit path — :702-713. Mapping ids are treated as risk_mappings PKs (risk_mapping_id).
  const selected: RiskMappingRow[] = [];
  if (explicitMappingIds.length > 0) {
    const byId = new Map(rows.map((r) => [r.risk_mapping_id, r]));
    for (const id of [...explicitMappingIds].sort((a, b) => a - b)) {
      const r = byId.get(id);
      if (r) selected.push(r);
      if (selected.length >= 5) break;
    }
  }

  const remaining = Math.max(0, 5 - selected.length);
  const excludeIds = new Set(selected.map((r) => r.risk_mapping_id));
  let fallback: RankedRisk[] = [];
  if (remaining > 0) {
    const scored = rows
      .filter((r) => !excludeIds.has(r.risk_mapping_id))
      .map((r) => {
        const match_score =
          (ctx.domain && ilikeContains(r.domains, ctx.domain) ? 1 : 0) +
          (ctx.intent && ilikeContains(r.intent, ctx.intent) ? 1 : 0) +
          (ctx.timing && ilikeContains(r.timing, ctx.timing) ? 1 : 0) +
          (ctx.primary_risk && ilikeContains(r.primary_risk, ctx.primary_risk) ? 1 : 0) +
          (ctx.secondary_risks && ilikeContains(r.secondary_risks, ctx.secondary_risks) ? 1 : 0);
        return { ...r, match_score, rank: 0 };
      });
    // ORDER BY match_score DESC NULLS LAST, risk_mapping_id ASC
    scored.sort((a, b) => b.match_score - a.match_score || a.risk_mapping_id - b.risk_mapping_id);
    fallback = scored.slice(0, remaining);
  }

  const combined: RankedRisk[] = [
    ...selected.map((r) => ({ ...r, match_score: NaN, rank: 0 })),
    ...fallback,
  ].slice(0, 5);
  combined.forEach((r, i) => (r.rank = i + 1));
  return { top5: combined, usedExplicitPath: explicitMappingIds.length > 0 && selected.length > 0 };
}

// ---------------------------------------------------------------------------
// Risk catalogue loaders (offline)
// ---------------------------------------------------------------------------

/** Unescape a Postgres COPY (text format) field. \N is handled by the caller. */
function unescapeCopyField(s: string): string {
  return s.replace(/\\(.)/g, (_m, c: string) => {
    switch (c) {
      case "t": return "\t";
      case "n": return "\n";
      case "r": return "\r";
      case "\\": return "\\";
      default: return c;
    }
  });
}

function rowFromValues(values: string[]): RiskMappingRow {
  const obj: Record<string, string | number | null> = {};
  RISK_MAPPINGS_COLUMNS.forEach((col, i) => {
    const raw = values[i];
    const val = raw === undefined || raw === "\\N" ? null : unescapeCopyField(raw);
    obj[col] = val;
  });
  return {
    ...(obj as unknown as RiskMappingRow),
    risk_mapping_id: Number(obj.risk_mapping_id),
  };
}

function loadFromSqlDump(dumpPath: string): RiskMappingRow[] {
  const text = fs.readFileSync(dumpPath, "utf8");
  const lines = text.split("\n");
  const startIdx = lines.findIndex((l) => l.startsWith("COPY public.risk_mappings "));
  if (startIdx < 0) throw new Error(`No "COPY public.risk_mappings" block in ${dumpPath}`);
  const rows: RiskMappingRow[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    let line = lines[i] ?? "";
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line === "\\.") break;
    if (line === "") continue;
    rows.push(rowFromValues(line.split("\t")));
  }
  return rows;
}

/** Minimal CSV parser (RFC-4180-ish) for an Enhanced-Risk-Database CSV, if one is ever provided. */
function loadFromCsv(csvPath: string): RiskMappingRow[] {
  const text = fs.readFileSync(csvPath, "utf8").replace(/\r\n/g, "\n");
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { record.push(field); field = ""; }
    else if (ch === "\n") { record.push(field); records.push(record); field = ""; record = []; }
    else field += ch;
  }
  if (field.length > 0 || record.length > 0) { record.push(field); records.push(record); }
  if (records.length === 0) return [];
  const header = records[0]!.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  const idx = (name: string) => header.indexOf(name);
  return records.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((r, n) => {
    const get = (name: string): string | null => {
      const j = idx(name);
      const v = j >= 0 ? r[j] : undefined;
      return v == null || v === "" ? null : v;
    };
    const idVal = get("risk_mapping_id");
    return {
      risk_mapping_id: idVal != null ? Number(idVal) : n + 1,
      risk_id: get("risk_id"),
      risk_title: get("risk_title"),
      domains: get("domains"),
      description: get("description"),
      technical_description: get("technical_description"),
      executive_summary: get("executive_summary"),
      attack_vector: get("attack_vector"),
      observable_indicators: get("observable_indicators"),
      data_to_identify_risk: get("data_to_identify_risk"),
      evidence_sources: get("evidence_sources"),
      intent: get("intent"),
      timing: get("timing"),
      risk_type_detected: get("risk_type_detected"),
      primary_risk: get("primary_risk"),
      secondary_risks: get("secondary_risks"),
    } satisfies RiskMappingRow;
  });
}

interface CatalogSource {
  type: "csv" | "sql_dump";
  file: string;
  rowCount: number;
  rows: RiskMappingRow[];
}

function resolveOfflineCatalog(): CatalogSource {
  const csvEnv = process.env.RISK_CATALOG_CSV;
  if (csvEnv && fs.existsSync(csvEnv)) {
    const rows = loadFromCsv(csvEnv);
    return { type: "csv", file: csvEnv, rowCount: rows.length, rows };
  }
  // No "Enhanced Risk Database Final" CSV exists in the repo; the risk catalogue ships inside
  // the DataBase/*.sql dumps. Prefer a non-prod dump.
  let dumpRel = process.env.RISK_DUMP;
  if (!dumpRel) {
    for (const name of PREFERRED_DUMPS) {
      if (fs.existsSync(path.join(DATABASE_DIR, name))) { dumpRel = name; break; }
    }
  }
  if (!dumpRel) {
    const candidates = fs.existsSync(DATABASE_DIR)
      ? fs.readdirSync(DATABASE_DIR).filter((f) => f.endsWith(".sql") && !/prod/i.test(f))
      : [];
    dumpRel = candidates.sort()[0];
  }
  if (!dumpRel) throw new Error("No risk catalogue source found (no CSV, no non-prod SQL dump).");
  const dumpPath = path.isAbsolute(dumpRel) ? dumpRel : path.join(DATABASE_DIR, dumpRel);
  if (/prod/i.test(path.basename(dumpPath))) {
    throw new Error(`Refusing to read a prod-labelled dump: ${dumpPath}`);
  }
  const rows = loadFromSqlDump(dumpPath);
  return { type: "sql_dump", file: path.relative(REPO_ROOT, dumpPath), rowCount: rows.length, rows };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface Fixture {
  id: string;
  label: string;
  assessmentType: string;
  payload: Record<string, unknown>;
}

function loadFixtures(): Fixture[] {
  if (!fs.existsSync(FIXTURES_DIR)) return [];
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const parsed = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, f), "utf8"));
      return {
        id: parsed.id ?? f,
        label: parsed.label ?? f,
        assessmentType: parsed.assessmentType ?? "unknown",
        payload: parsed.payload ?? {},
      } satisfies Fixture;
    });
}

// ---------------------------------------------------------------------------
// Offline run
// ---------------------------------------------------------------------------

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function runOffline(freeze: boolean) {
  const catalog = resolveOfflineCatalog();
  const fixtures = loadFixtures();
  const generatedAt = new Date().toISOString();

  const results = fixtures.map((fx) => {
    const ctx = extractContext(fx.payload);
    const explicitMappingIds = extractMappingIds(fx.payload);
    const { top5, usedExplicitPath } = rankTop5(catalog.rows, ctx, explicitMappingIds);
    const intentScore = computeIntentScore(
      top5.map((r) => r.intent),
      top5.some((r) => classifyIntentToken(r.intent)) ? "local_db" : "default",
    );
    return {
      assessmentId: fx.id,
      label: fx.label,
      assessmentType: fx.assessmentType,
      isType01Attestation: isType01AttestationPayload(fx.payload),
      extractedContext: ctx,
      explicitMappingIds,
      usedExplicitMappingPath: usedExplicitPath,
      top5: top5.map((r) => ({
        rank: r.rank,
        risk_mapping_id: r.risk_mapping_id,
        risk_id: r.risk_id,
        risk_title: r.risk_title,
        domains: r.domains,
        intent: r.intent,
        timing: r.timing,
        primary_risk: r.primary_risk,
        match_score: Number.isNaN(r.match_score) ? "explicit" : r.match_score,
      })),
      intentMultiplier: intentScore,
      likelihoodImpactSeverity: DEFAULT_LI_SEVERITY,
      storedScore: null as null, // offline: no stored assessment records
    };
  });

  const makePayload = (gen: string | null) => ({
    mode: "offline" as const,
    generatedAt: gen,
    note:
      "Offline baseline. Risk/framework scoring formulas and weights are reproduced read-only, not modified. " +
      "Offline mode calls the real exported product functions (extractContext/extractMappingIds/intent); only the " +
      "SQL ILIKE match-score ranking is reproduced in TS. Full DB baseline (per-assessment stored scores, " +
      "compliance-doc classes/controls/gaps) is PENDING dev env access.",
    catalogSource: { type: catalog.type, file: catalog.file, rowCount: catalog.rowCount },
    liSeverityNote:
      "Risk Intellect not called offline -> likelihood/impact/severity use the product's static fallback (L=3, I=3, S=9, source=default).",
    results,
  });
  const payload = makePayload(generatedAt);

  // Summary stats
  const sets = new Map<string, number>();
  for (const r of results) {
    const key = r.top5.map((t) => t.risk_id).join(",");
    sets.set(key, (sets.get(key) ?? 0) + 1);
  }
  const NAMED = ["RISK-1", "RISK-10", "RISK-100", "RISK-1000", "RISK-1001"];
  const namedCounts: Record<string, number> = {};
  for (const name of NAMED) {
    namedCounts[name] = results.filter((r) => r.top5.some((t) => t.risk_id === name)).length;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const date = todayIso();
  const jsonPath = path.join(OUT_DIR, `mapping-baseline-${date}.json`);
  const mdPath = path.join(OUT_DIR, `mapping-baseline-${date}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  // Frozen before-snapshot: deterministic (generatedAt=null) so git diffs are meaningful.
  if (freeze) {
    fs.mkdirSync(BASELINES_DIR, { recursive: true });
    fs.writeFileSync(FROZEN_BEFORE_PATH, JSON.stringify(makePayload(null), null, 2) + "\n");
  }

  const md: string[] = [];
  md.push(`# Mapping baseline (offline) — ${date}`);
  md.push("");
  md.push(`- Mode: **offline** (no DB; DB baseline pending dev env access)`);
  md.push(`- Risk catalogue source: \`${catalog.file}\` (${catalog.type}), **${catalog.rowCount}** risk rows`);
  md.push(`- Fixtures evaluated: **${results.length}** (${results.map((r) => r.assessmentId).join(", ")})`);
  md.push(`- likelihood/impact/severity: static fallback L=3, I=3, S=9 (Risk Intellect not called offline)`);
  md.push("");
  md.push(`## Distinct top-5 sets across the ${results.length} fixtures: **${sets.size}**`);
  md.push("");
  for (const [key, count] of sets) md.push(`- \`[${key}]\` — appears in ${count} fixture(s)`);
  md.push("");
  md.push(`## Frequency of named catalogue risks across fixtures`);
  md.push("");
  for (const name of NAMED) md.push(`- **${name}**: ${namedCounts[name]} / ${results.length} fixtures`);
  md.push("");
  md.push(`## Per-fixture top-5`);
  for (const r of results) {
    md.push("");
    md.push(`### ${r.assessmentId} — ${r.label} (${r.assessmentType})`);
    md.push(`- extracted domain: \`${r.extractedContext.domain}\``);
    md.push(`- extracted intent: \`${r.extractedContext.intent}\``);
    md.push(`- extracted timing: \`${r.extractedContext.timing || "(empty)"}\``);
    md.push(`- extracted primary_risk: \`${r.extractedContext.primary_risk}\``);
    md.push(`- intent multiplier: ${r.intentMultiplier.label} (source=${r.intentMultiplier.source})`);
    md.push(`- top-5 (risk_mapping_id · risk_id · match_score):`);
    for (const t of r.top5) {
      md.push(`  ${t.rank}. ${t.risk_mapping_id} · ${t.risk_id} · score=${t.match_score} — ${t.risk_title ?? ""}`);
    }
  }
  md.push("");
  fs.writeFileSync(mdPath, md.join("\n"));

  // Console output
  console.log(`\n=== mapping-baseline (offline) ===`);
  console.log(`catalogue: ${catalog.file} (${catalog.rowCount} rows)`);
  for (const r of results) {
    console.log(`\n--- ${r.assessmentId}: ${r.label} (${r.assessmentType}) ---`);
    console.log(`  domain   = ${JSON.stringify(r.extractedContext.domain)}`);
    console.log(`  intent   = ${JSON.stringify(r.extractedContext.intent)}`);
    console.log(`  timing   = ${JSON.stringify(r.extractedContext.timing)}`);
    console.log(`  primary  = ${JSON.stringify(r.extractedContext.primary_risk)}`);
    console.log(`  intentMultiplier = ${r.intentMultiplier.label} (${r.intentMultiplier.source})`);
    console.log(`  L/I/S = ${DEFAULT_LI_SEVERITY.likelihood}/${DEFAULT_LI_SEVERITY.impact}/${DEFAULT_LI_SEVERITY.severity} (default)`);
    console.log(`  top-5:`);
    for (const t of r.top5) {
      console.log(`    ${t.rank}. id=${t.risk_mapping_id} ${t.risk_id} score=${t.match_score} | ${t.risk_title ?? ""}`);
    }
  }
  console.log(`\nDistinct top-5 sets across ${results.length} fixtures: ${sets.size}`);
  console.log(`Named-risk frequency: ${NAMED.map((n) => `${n}=${namedCounts[n]}`).join(", ")}`);
  console.log(`\nWrote:\n  ${path.relative(REPO_ROOT, jsonPath)}\n  ${path.relative(REPO_ROOT, mdPath)}`);
  if (freeze) console.log(`  ${path.relative(REPO_ROOT, FROZEN_BEFORE_PATH)} (frozen before-snapshot)`);
  console.log("");
}

// ---------------------------------------------------------------------------
// DB run (SELECT-only, inside a READ ONLY transaction; PENDING dev env access)
// ---------------------------------------------------------------------------

async function runDb() {
  console.log("[mapping-baseline] DB mode — SELECT-only, inside a READ ONLY transaction.");
  // Lazy imports so offline mode never needs the drizzle query path.
  const { db } = await import("../src/database/db.js");
  const { sql } = await import("drizzle-orm");
  const { getTop5RisksWithMitigations } = await import("../src/services/getTop5RisksFromAssessmentContext.js");

  const generatedAt = new Date().toISOString();
  const out: {
    mode: "db";
    generatedAt: string;
    assessments: unknown[];
    complianceDocuments: unknown[];
  } = { mode: "db", generatedAt, assessments: [], complianceDocuments: [] };

  // Assessment source tables (Type 1/2/3). Stored score columns vary, so we capture every
  // column whose name contains "score" rather than guessing exact names.
  const ASSESSMENT_TABLES = [
    { table: "cots_buyer_assessments", type: "buyer_cots" },
    { table: "cots_vendor_assessments", type: "vendor_cots" },
    { table: "custom_ai_assessments", type: "custom_ai" },
    { table: "vendor_self_attestations", type: "vendor_self_attestation" },
  ];

  // All of this script's direct reads run inside one explicit READ ONLY transaction, so the
  // database will reject any accidental write. (getTop5RisksWithMitigations issues only SELECTs.)
  await db.transaction(
    async (tx) => {
      for (const { table, type } of ASSESSMENT_TABLES) {
        let rows: Record<string, unknown>[] = [];
        try {
          const res = await tx.execute(sql.raw(`SELECT * FROM public.${table}`));
          rows = ((res as unknown as { rows?: Record<string, unknown>[] }).rows ?? []) as Record<string, unknown>[];
        } catch (e) {
          console.warn(`[mapping-baseline] skip ${table}: ${(e as Error).message}`);
          continue;
        }
        for (const row of rows) {
          const scoreCols: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) if (/score/i.test(k)) scoreCols[k] = v;
          let top5Ids: (string | null)[] = [];
          let intentValue: number | null = null;
          let lis: { likelihood: number; impact: number; severity: number; source: string } | null = null;
          try {
            const t5 = await getTop5RisksWithMitigations(row);
            top5Ids = t5.top5Risks.map((r) => r.risk_id);
            intentValue = t5.intentScore?.value ?? null;
            lis = t5.liSeverityScore
              ? {
                  likelihood: t5.liSeverityScore.likelihood,
                  impact: t5.liSeverityScore.impact,
                  severity: t5.liSeverityScore.severity,
                  source: t5.liSeverityScore.source,
                }
              : null;
          } catch (e) {
            console.warn(`[mapping-baseline] top5 failed for ${table} row: ${(e as Error).message}`);
          }
          out.assessments.push({
            table,
            assessmentType: type,
            id: row.id ?? row.assessment_id ?? null,
            top5RiskIds: top5Ids,
            intentMultiplier: intentValue,
            likelihoodImpactSeverity: lis,
            storedScores: scoreCols,
          });

          // Compliance docs live on vendor_self_attestations.compliance_document_expiries.
          const cde = row.compliance_document_expiries;
          if (cde && typeof cde === "object") {
            for (const [fileName, entry] of Object.entries(cde as Record<string, any>)) {
              out.complianceDocuments.push({
                attestationId: row.id ?? null,
                fileName,
                category: entry?.category ?? null,
                detectedClass: entry?.documentClass ?? null,
                mappedFramework: entry?.frameworkMapping?.framework ?? null,
                mappedControlIds: Array.isArray(entry?.frameworkMapping?.controls)
                  ? entry.frameworkMapping.controls.map((c: any) => c.controlId)
                  : [],
                relevanceScores: Array.isArray(entry?.frameworkMapping?.controls)
                  ? entry.frameworkMapping.controls.map((c: any) => c.relevanceScore)
                  : [],
                validation: entry?.validation ?? null,
              });
            }
          }
        }
      }
    },
    { accessMode: "read only" },
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const date = todayIso();
  const jsonPath = path.join(OUT_DIR, `mapping-baseline-${date}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
  console.log(
    `[mapping-baseline] DB baseline: ${out.assessments.length} assessments, ${out.complianceDocuments.length} compliance docs -> ${path.relative(REPO_ROOT, jsonPath)}`,
  );
}

// ---------------------------------------------------------------------------
// Offline v2 run — "after" snapshot using the real selectTop5 selector
// ---------------------------------------------------------------------------

function runOfflineV2(freeze: boolean) {
  const catalog = resolveOfflineCatalog();
  const fixtures = loadFixtures();
  const results = fixtures.map((fx) => {
    const type1 = isType01AttestationPayload(fx.payload);
    const sel = selectTop5(catalog.rows, fx.payload, { type1 });
    return {
      assessmentId: fx.id,
      label: fx.label,
      assessmentType: fx.assessmentType,
      reason: sel.reason ?? null,
      top5: sel.selected.map((r, i) => ({
        rank: i + 1,
        risk_mapping_id: r.risk_mapping_id,
        risk_id: r.risk_id,
        risk_title: r.risk_title,
        domains: r.domains,
        score: r.match_trace.score,
        selected_because: selectedBecauseLine(r.match_trace),
      })),
    };
  });

  const payload = {
    mode: "offline-v2" as const,
    lookup_version: "v1",
    catalogSource: { type: catalog.type, file: catalog.file, rowCount: catalog.rowCount },
    results,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const date = todayIso();
  fs.writeFileSync(path.join(OUT_DIR, `mapping-after-${date}.json`), JSON.stringify(payload, null, 2));
  if (freeze) {
    fs.mkdirSync(BASELINES_DIR, { recursive: true });
    fs.writeFileSync(path.join(BASELINES_DIR, "baseline-after.json"), JSON.stringify(payload, null, 2) + "\n");
  }

  console.log(`\n=== mapping-baseline (offline v2) ===`);
  console.log(`catalogue: ${catalog.file} (${catalog.rowCount} rows)`);
  for (const r of results) {
    console.log(`\n--- ${r.assessmentId}: ${r.label} (${r.assessmentType}) ---`);
    if (r.reason) console.log(`  reason: ${r.reason}`);
    for (const t of r.top5) {
      console.log(`  ${t.rank}. id=${t.risk_mapping_id} ${t.risk_id} [${t.domains}] score=${t.score}`);
      console.log(`      ${t.risk_title ?? ""}`);
      console.log(`      ${t.selected_because}`);
    }
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const forceOffline = args.includes("--offline");
  const forceDb = args.includes("--db");
  const freeze = args.includes("--freeze");
  const envLocalExists = fs.existsSync(path.join(BACKEND_ROOT, ".env.local"));
  const mode = forceOffline ? "offline" : forceDb ? "db" : envLocalExists ? "db" : "offline";

  if (mode === "db") {
    await runDb();
  } else if (args.includes("--v2")) {
    runOfflineV2(freeze);
  } else {
    runOffline(freeze);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[mapping-baseline] failed:", e);
    process.exit(1);
  });
