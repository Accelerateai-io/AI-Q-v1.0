import { logger } from "../../middlewares/logger.js";
import { getAiRiskApiKeyConfig } from "../admin/aiRiskApiKeyConfig.service.js";

/**
 * HTTP client for Risk Intellect (hosted AI Risk Intelligence).
 *
 * Hosted JSON list: GET /api/v1/risks  (X-API-Key from Controls).
 *
 * Filters (sector, domains, minQuality, updatedSince, limit) are sent as query
 * params and then re-applied here. AIRI may ignore query params and return the
 * full approved register; scoring must not use that unfiltered set.
 *
 * Fields used by scoring:
 * - intent → type 2/3 intent multiplier
 * - riskScoring.likelihood / impact / severityScore → type 1 VTS product risk (L × I)
 */

export type RiRiskExportDto = {
  id: string;
  riskTitle: string;
  domain: string;
  /** 0–1 (RI may send it as a numeric string, e.g. "0.91"). Not a 0–100 percentage. */
  qualityScore: number;
  description: string;
  attackVector: string;
  primaryRisk: string;
  /** Intentional / Unintentional — used for type 2/3 intent score after local risk match */
  intent: string | null;
  /** Likelihood 1–5 from Risk Intellect (VTS product risk). */
  likelihood: number | null;
  /** Impact 1–5 from Risk Intellect (VTS product risk). */
  impact: number | null;
  /** Severity 1–25 (often L×I) from Risk Intellect. */
  severity: number | null;
  sector: string | null;
  industry: string | null;
  sourceUrl: string;
  articleTitle: string;
  articleDate: string;
  catalogMatchId: string | null;
  catalogMatchTitle: string | null;
  /** All catalog match IDs (not only the first / highest-accuracy). */
  catalogMatchIds: string[];
};

export type RiExportResult = {
  risks: RiRiskExportDto[];
  total: number;
  limit: number;
  minQuality: number;
  domains: string[] | null;
  /** True when AIRI returned extra rows that we dropped locally. */
  clientFiltered: boolean;
};

export type RiExportParams = {
  domains?: string[];
  /** 0–1, matching RI's qualityScore scale. */
  minQuality?: number;
  sector?: string;
  limit?: number;
  /** ISO-8601; asks RI for risks changed since then instead of the whole set. */
  updatedSince?: string;
};

const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 150;
const MAX_SECTOR_QUERY_LEN = 80;

/** RI `sector` must be a short name (e.g. Healthcare). JSON blobs match nothing. */
export function sanitizeRiSectorParam(raw: string | undefined): string | undefined {
  const s = (raw ?? "").trim();
  if (!s) return undefined;
  if (s.startsWith("{") || s.startsWith("[")) return undefined;
  if (s.length > MAX_SECTOR_QUERY_LEN) return undefined;
  return s;
}

function splitFilterTokens(raw: string): string[] {
  return raw
    .split(/[,;/|]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function textMatchesFilter(haystack: string | null | undefined, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return false;
  const tokens = splitFilterTokens(haystack ?? "");
  if (tokens.length === 0) return false;
  return tokens.some((token) => token === n || token.includes(n) || n.includes(token));
}

function parseRiDate(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Re-apply requested filters locally. AIRI often returns the full register even
 * when query params were sent; callers must score only this subset.
 */
export function applyRequestedRiFilters(
  risks: RiRiskExportDto[],
  params: RiExportParams,
): RiRiskExportDto[] {
  const sector = sanitizeRiSectorParam(params.sector);
  const domains = (params.domains ?? [])
    .map((d) => d.trim())
    .filter(Boolean);
  const minQuality =
    typeof params.minQuality === "number" && Number.isFinite(params.minQuality)
      ? params.minQuality
      : undefined;
  const updatedSinceMs = params.updatedSince ? parseRiDate(params.updatedSince) : null;

  const filtered = risks.filter((risk) => {
    if (sector && !textMatchesFilter(risk.sector, sector) && !textMatchesFilter(risk.industry, sector)) {
      return false;
    }
    if (domains.length > 0 && !domains.some((d) => textMatchesFilter(risk.domain, d))) {
      return false;
    }
    if (minQuality !== undefined && risk.qualityScore < minQuality) {
      return false;
    }
    if (updatedSinceMs != null) {
      const articleMs = parseRiDate(risk.articleDate);
      if (articleMs == null || articleMs < updatedSinceMs) return false;
    }
    return true;
  });

  if (typeof params.limit === "number" && params.limit > 0) {
    return filtered.slice(0, params.limit);
  }
  return filtered;
}

export function getRiConfig(): { baseUrl: string; apiKey: string } {
  // Single platform key from AI-Q Controls (persisted to .env.local / process.env).
  const { baseUrl, apiKey } = getAiRiskApiKeyConfig();
  return { baseUrl, apiKey };
}

export function isRiskIntellectConfigured(): boolean {
  const { baseUrl, apiKey } = getRiConfig();
  return Boolean(baseUrl && apiKey);
}

/**
 * The list route is the only risk endpoint RI exposes to an API key. A former
 * /api/v1/risks/export fallback only ever 404'd after auth, costing every fetch an
 * extra request plus retry, and it was the only path filters were sent on — so
 * filtering was dead in both directions.
 */
const RI_RISKS_PATH = "/api/v1/risks";

export function buildExportUrl(
  baseUrl: string,
  params: RiExportParams,
  path: string = RI_RISKS_PATH,
): string {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}${path}`);
  if (params.domains && params.domains.length > 0) {
    url.searchParams.set("domains", params.domains.join(","));
  }
  if (params.minQuality !== undefined) {
    url.searchParams.set("minQuality", String(params.minQuality));
  }
  const sector = sanitizeRiSectorParam(params.sector);
  if (sector) {
    url.searchParams.set("sector", sector);
  }
  if (params.limit !== undefined) {
    url.searchParams.set("limit", String(params.limit));
  }
  if (params.updatedSince) {
    url.searchParams.set("updated_since", params.updatedSince);
  }
  return url.toString();
}

function riAuthHeaders(apiKey: string): Record<string, string> {
  // Hosted RI issues `ari_…` keys for the X-API-Key header. Do not send them as
  // Authorization Bearer — that JWT middleware 404s a valid service key.
  return {
    Accept: "application/json",
    "X-API-Key": apiKey,
  };
}

function firstPresent(r: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in r && r[key] != null && r[key] !== "") return r[key];
  }
  return undefined;
}

/** Clamp a Risk Intellect numeric score into [min, max]. Returns null if missing/invalid. */
export function parseRiBoundedScore(
  raw: unknown,
  min: number,
  max: number,
): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "string" ? Number(raw.trim()) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(max, Math.max(min, n));
}

function nestedRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function catalogMatchRecords(r: Record<string, unknown>): Record<string, unknown>[] {
  const analysis = nestedRecord(r["riskAnalysis"]);
  const matches = analysis?.["catalogMatches"];
  if (!Array.isArray(matches)) return [];
  return matches
    .map((item) => nestedRecord(item))
    .filter((item): item is Record<string, unknown> => item != null);
}

function catalogAccuracy(match: Record<string, unknown>): number {
  const raw = match["accuracyPercent"] ?? match["accuracy"] ?? match["score"] ?? 0;
  const n = typeof raw === "string" ? Number(raw) : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function bestCatalogMatch(r: Record<string, unknown>): Record<string, unknown> | null {
  const matches = catalogMatchRecords(r);
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => catalogAccuracy(b) - catalogAccuracy(a))[0] ?? null;
}

function allCatalogMatchIds(r: Record<string, unknown>, best: Record<string, unknown> | null): string[] {
  const ids = new Set<string>();
  const push = (raw: unknown) => {
    const s = raw == null ? "" : String(raw).trim();
    if (s) ids.add(s);
  };
  push(r["catalogMatchId"]);
  push(r["catalog_match_id"]);
  if (best) {
    push(best["id"]);
    push(best["riskId"]);
    push(best["risk_id"]);
    push(best["catalogMatchId"]);
  }
  for (const match of catalogMatchRecords(r)) {
    push(match["id"]);
    push(match["riskId"]);
    push(match["risk_id"]);
    push(match["catalogMatchId"]);
  }
  return [...ids];
}

function normalizeRiRisk(raw: unknown): RiRiskExportDto | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const scoring = nestedRecord(r["riskScoring"]) ?? {};
  const catalog = bestCatalogMatch(r);
  const catalogMatchIds = allCatalogMatchIds(r, catalog);
  const intentRaw = r["intent"] ?? r["Intent"] ?? scoring["intent"];
  const catalogMatchIdRaw =
    r["catalogMatchId"] ??
    r["catalog_match_id"] ??
    catalog?.["id"] ??
    catalog?.["riskId"] ??
    catalog?.["risk_id"] ??
    catalog?.["catalogMatchId"];
  const catalogMatchTitleRaw =
    r["catalogMatchTitle"] ??
    r["catalog_match_title"] ??
    catalog?.["title"] ??
    catalog?.["riskTitle"];
  const quality = Number(r["qualityScore"] ?? r["quality_score"] ?? 0);
  const likelihood = parseRiBoundedScore(
    firstPresent({ ...r, ...scoring }, [
      "likelihood",
      "likelihoodScore",
      "likelihood_score",
      "likelihoodRating",
      "likelihood_rating",
    ]),
    1,
    5,
  );
  const impact = parseRiBoundedScore(
    firstPresent({ ...r, ...scoring }, [
      "impact",
      "impactScore",
      "impact_score",
      "impactRating",
      "impact_rating",
    ]),
    1,
    5,
  );
  const severityRaw = parseRiBoundedScore(
    firstPresent({ ...r, ...scoring }, [
      "severity",
      "severityScore",
      "severity_score",
      "severityRating",
      "severity_rating",
    ]),
    1,
    25,
  );
  const severity =
    severityRaw ??
    (likelihood != null && impact != null ? likelihood * impact : null);
  return {
    id: String(r["id"] ?? r["displayId"] ?? ""),
    riskTitle: String(r["riskTitle"] ?? r["risk_title"] ?? r["title"] ?? ""),
    domain: String(r["domain"] ?? r["domains"] ?? ""),
    qualityScore: Number.isFinite(quality) ? quality : 0,
    description: String(r["description"] ?? ""),
    attackVector: String(r["attackVector"] ?? r["attack_vector"] ?? ""),
    primaryRisk: String(r["primaryRisk"] ?? r["primary_risk"] ?? ""),
    intent:
      intentRaw == null || String(intentRaw).trim() === ""
        ? null
        : String(intentRaw).trim(),
    likelihood,
    impact,
    severity,
    sector: r["sector"] == null ? null : String(r["sector"]),
    industry: r["industry"] == null ? null : String(r["industry"]),
    sourceUrl: String(r["sourceUrl"] ?? r["source_url"] ?? r["articleUrl"] ?? ""),
    articleTitle: String(r["articleTitle"] ?? r["article_title"] ?? ""),
    articleDate: String(r["articleDate"] ?? r["article_date"] ?? r["ingestedAt"] ?? ""),
    catalogMatchId:
      catalogMatchIdRaw == null || String(catalogMatchIdRaw).trim() === ""
        ? null
        : String(catalogMatchIdRaw).trim(),
    catalogMatchTitle:
      catalogMatchTitleRaw == null || String(catalogMatchTitleRaw).trim() === ""
        ? null
        : String(catalogMatchTitleRaw).trim(),
    catalogMatchIds,
  };
}

function extractRisksArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d["risks"])) return d["risks"];
  if (Array.isArray(d["items"])) return d["items"];
  if (Array.isArray(d["data"])) return d["data"];
  return null;
}

async function readErrorSnippet(response: Response): Promise<string> {
  try {
    const text = (await response.text()).replace(/\s+/g, " ").trim();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  let lastError: Error = new Error("Fetch failed");
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError;
}

/**
 * Fetches approved, quality-filtered risk incidents from Risk Intellect.
 * Returns null when unconfigured, unavailable, or response is invalid.
 */
export async function fetchRisksFromRI(
  params: RiExportParams = {},
): Promise<RiExportResult | null> {
  const { baseUrl, apiKey } = getRiConfig();
  if (!baseUrl || !apiKey) {
    logger.debug("ri.fetch.skipped", {
      service: "risk-intellect-client",
      event: "ri.fetch.skipped",
      reason: "not-configured",
    });
    return null;
  }

  const headers = riAuthHeaders(apiKey);
  const startMs = Date.now();

  let url: string;
  try {
    url = buildExportUrl(baseUrl, params);
  } catch {
    console.warn("[RI] fetch failed", { reason: "invalid-url", baseUrl });
    return null;
  }

  const fail = (reason: string, extra: Record<string, unknown> = {}): null => {
    const durationMs = Date.now() - startMs;
    logger.warn("ri.fetch.failed", {
      service: "risk-intellect-client",
      event: "ri.fetch.failed",
      reason,
      durationMs,
      ...extra,
    });
    console.warn("[RI] fetch failed", { reason, durationMs, url, ...extra });
    return null;
  };

  let response: Response;
  try {
    response = await fetchWithRetry(url, headers);
  } catch {
    return fail("network-error");
  }

  if (!response.ok) {
    return fail("http-error", {
      status: response.status,
      body: (await readErrorSnippet(response)) || undefined,
    });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return fail("parse-error");
  }

  const rawRisks = extractRisksArray(data);
  if (!rawRisks) return fail("invalid-shape");

  const payload = data as Record<string, unknown>;
  const allRisks = rawRisks
    .map((r) => normalizeRiRisk(r))
    .filter((r): r is RiRiskExportDto => r != null);
  const normalizedRisks = applyRequestedRiFilters(allRisks, params);
  const clientFiltered = normalizedRisks.length !== allRisks.length;
  const requestedRiFilters = Boolean(
    sanitizeRiSectorParam(params.sector) ||
      (params.domains && params.domains.length > 0) ||
      params.minQuality != null ||
      params.updatedSince ||
      params.limit,
  );

  const normalized: RiExportResult = {
    risks: normalizedRisks,
    total: normalizedRisks.length,
    limit: params.limit ?? normalizedRisks.length,
    minQuality: params.minQuality ?? 0,
    domains: params.domains ?? (Array.isArray(payload.domains) ? (payload.domains as string[]) : null),
    clientFiltered,
  };

  logger.info("ri.fetch.success", {
    service: "risk-intellect-client",
    event: "ri.fetch.success",
    count: normalized.risks.length,
    rawCount: allRisks.length,
    path: RI_RISKS_PATH,
    hasSector: !!sanitizeRiSectorParam(params.sector),
    clientFiltered,
    serverFiltered: requestedRiFilters && !clientFiltered,
    durationMs: Date.now() - startMs,
  });
  if (clientFiltered) {
    console.warn("[RI] AIRI returned an unfiltered register; applied filters locally", {
      rawCount: allRisks.length,
      filteredCount: normalizedRisks.length,
      sector: sanitizeRiSectorParam(params.sector) ?? null,
      domains: params.domains ?? null,
      minQuality: params.minQuality ?? null,
      limit: params.limit ?? null,
    });
  }
  console.log("[type-01 VTS] AI Risk Intellect export (L/I per risk)", {
    count: normalized.risks.length,
    rawCount: allRisks.length,
    path: RI_RISKS_PATH,
    sector: sanitizeRiSectorParam(params.sector) ?? null,
    clientFiltered,
    scores: normalized.risks.map((r) => ({
      catalogMatchId: r.catalogMatchId,
      riskTitle: r.riskTitle,
      likelihood: r.likelihood,
      impact: r.impact,
      severity: r.severity,
    })),
  });
  return normalized;
}