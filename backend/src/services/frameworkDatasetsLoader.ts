/**
 * Loads CISO framework control catalogs from backend data dirs.
 * Shared by compliance PDF mapping and framework-mapping row enrichment.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

export type FrameworkControl = {
  controlId: string;
  title: string;
  description?: string;
  implementationGuidance?: string;
  aiRiskDomains?: string[];
};

export type FrameworkDataset = {
  framework: { name?: string; version?: string };
  controls: FrameworkControl[];
};

function resolveBackendDataDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "src", "data"),
    path.resolve(process.cwd(), "dist", "data"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
    } catch {
      /* ignore */
    }
  }
  return path.resolve(process.cwd(), "src", "data");
}

const DATA_DIR = resolveBackendDataDir();
const CISO_FRAMEWORKS_DIR = path.join(DATA_DIR, "ciso-frameworks");

let frameworkCache: FrameworkDataset[] | null = null;

/** Collapse duplicate controlIds within a dataset to one row per id (prefer category "Requirement"). */
function dedupeControlsById(ds: FrameworkDataset, filePath: string): FrameworkDataset {
  const out: FrameworkControl[] = [];
  const idxById = new Map<string, number>();
  let merges = 0;
  for (const c of ds.controls) {
    const id = String(c.controlId ?? "").trim();
    if (!id) {
      out.push(c);
      continue;
    }
    if (!idxById.has(id)) {
      idxById.set(id, out.length);
      out.push(c);
      continue;
    }
    merges++;
    const idx = idxById.get(id)!;
    const cat = String((c as unknown as { category?: string }).category ?? "").toLowerCase();
    const prevCat = String((out[idx] as unknown as { category?: string }).category ?? "").toLowerCase();
    if (cat === "requirement" && prevCat !== "requirement") out[idx] = c;
  }
  if (merges > 0) {
    console.log(
      `[frameworkDatasets] ${ds.framework?.name ?? path.basename(filePath)}: merged ${merges} duplicate controlId(s) -> ${out.length} unique`,
    );
  }
  return { ...ds, controls: out };
}

function parseFrameworkDatasetFile(filePath: string): FrameworkDataset | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    if (!Array.isArray(o.controls) || o.controls.length === 0) return null;
    if (!o.framework || typeof o.framework !== "object") return null;
    return dedupeControlsById(raw as FrameworkDataset, filePath);
  } catch {
    return null;
  }
}

/**
 * Load every framework library under `src/data/ciso-frameworks` plus top-level `src/data/*.json`
 * control catalogs. Dedupes by framework name + version.
 */
export function loadFrameworkDatasets(): FrameworkDataset[] {
  if (frameworkCache) return frameworkCache;
  const datasets: FrameworkDataset[] = [];
  const seen = new Set<string>();

  const addFile = (filePath: string) => {
    const ds = parseFrameworkDatasetFile(filePath);
    if (!ds) return;
    const name = String(ds.framework?.name ?? "unknown").trim().toLowerCase();
    const ver = String(ds.framework?.version ?? "").trim().toLowerCase();
    const key = `${name}::${ver}`;
    if (seen.has(key)) return;
    seen.add(key);
    datasets.push(ds);
  };

  try {
    if (fs.existsSync(CISO_FRAMEWORKS_DIR) && fs.statSync(CISO_FRAMEWORKS_DIR).isDirectory()) {
      for (const name of fs.readdirSync(CISO_FRAMEWORKS_DIR)) {
        if (!name.toLowerCase().endsWith(".json")) continue;
        addFile(path.join(CISO_FRAMEWORKS_DIR, name));
      }
    }
  } catch {
    /* ciso-frameworks dir missing */
  }

  try {
    for (const name of fs.readdirSync(DATA_DIR)) {
      if (!name.toLowerCase().endsWith(".json")) continue;
      const full = path.join(DATA_DIR, name);
      if (!fs.statSync(full).isFile()) continue;
      addFile(full);
    }
  } catch {
    /* data dir missing */
  }

  frameworkCache = datasets;
  return datasets;
}

function stripVersionParenthetical(s: string): string {
  return s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function datasetMatchesRowLabel(ds: FrameworkDataset, hint: string): boolean {
  const name = String(ds.framework?.name ?? "").trim().toLowerCase();
  if (!name || !hint) return false;
  if (hint.includes(name) || name.includes(hint)) return true;
  const hintFirst = hint.split(/[\s/]+/).find((p) => p.length >= 3) ?? "";
  return hintFirst.length >= 3 && name.includes(hintFirst);
}

/** Loose match for control IDs across attestation vs catalog (e.g. "GOVERN 1.1" vs "GOVERN-1.1"). */
export function normalizeControlIdKey(controlId: string): string {
  return String(controlId ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function descriptionFromCatalogControl(c: FrameworkControl): string {
  const d = String(c.description ?? "").trim();
  if (d) return d;
  return String(c.implementationGuidance ?? "").trim();
}

export function slimFieldsFromCatalogControl(c: FrameworkControl): {
  controlId: string;
  title: string;
  description: string;
} {
  const controlId = String(c.controlId ?? "").trim();
  const title = String(c.title ?? "").trim() || controlId;
  let description = descriptionFromCatalogControl(c);
  if (description.length > MAX_LOOKUP_DESCRIPTION_LEN) {
    description = `${description.slice(0, MAX_LOOKUP_DESCRIPTION_LEN)}…`;
  }
  return { controlId, title, description: description || "—" };
}

function normalizeAiRiskDomainLabel(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * True if the control lists any of the focus AI risk domains (from `src/data` catalogs).
 * When `focusDomains` is empty, returns true (no domain filter).
 */
export function controlMatchesAiRiskDomains(
  control: FrameworkControl,
  focusDomains: string[],
): boolean {
  if (!focusDomains.length) return true;
  const fds = new Set(focusDomains.map(normalizeAiRiskDomainLabel));
  const ard = control.aiRiskDomains;
  if (!ard?.length) return false;
  return ard.some((d) => fds.has(normalizeAiRiskDomainLabel(d)));
}

/**
 * First dataset whose framework name matches a mapping row label (e.g. "PCI DSS (4.0)", "GDPR").
 */
export function findDatasetForMappingRowLabel(rowLabel: string): FrameworkDataset | null {
  const hint = stripVersionParenthetical(String(rowLabel ?? "").toLowerCase());
  if (!hint) return null;
  const datasets = loadFrameworkDatasets();
  for (const ds of datasets) {
    if (datasetMatchesRowLabel(ds, hint)) return ds;
  }
  return null;
}

import { buildBm25Index, bm25Query, normalizeScores } from "./frameworkMapping/bm25.js";

export type AttestationControlHint = { controlId: string; relevanceScore?: number };

const SLIM_CONTROL_DESC_CAP = 4000;
/** Minimum normalised BM25 relevance for a control to be shown for a framework row (risks + evidence). */
const PICK_CONTROL_RELEVANCE_THRESHOLD = 0.2;

/**
 * Up to `limit` controls for a framework row, ranked by BM25 relevance to the assessment's risks +
 * the vendor's evidence (`queryText`). There is NO AI-risk-domain filter (every control is tagged
 * "Privacy and Security", so it filters nothing) and NEVER an id/alphabetical fallback: if nothing is
 * relevant, returns [] (the caller shows "No control matched"). Vendor-attested controls are boosted
 * so the vendor's own evidence surfaces among the relevant controls.
 */
export function pickTopControlsForFrameworkAndAiDomains(
  rowFrameworkLabel: string,
  queryText: string,
  limit: number,
  attestationHints: AttestationControlHint[] | undefined,
): Array<{ controlId: string; title: string; description: string }> {
  const cap = Math.min(99, Math.max(1, limit));
  const hints = attestationHints ?? [];
  const hintKeys = new Set(
    hints.map((h) => normalizeControlIdKey(String(h.controlId ?? "").trim())).filter(Boolean),
  );

  const ds = findDatasetForMappingRowLabel(rowFrameworkLabel);
  if (!ds) {
    // No catalogue for this framework row — keep the vendor's own attestation-listed controls by relevance.
    const out: Array<{ controlId: string; title: string; description: string }> = [];
    for (const h of [...hints].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))) {
      if (out.length >= cap) break;
      const controlId = String(h.controlId ?? "").trim();
      if (!controlId) continue;
      let description = lookupControlDescription(rowFrameworkLabel, controlId);
      if (description.length > SLIM_CONTROL_DESC_CAP) description = `${description.slice(0, SLIM_CONTROL_DESC_CAP)}…`;
      out.push({ controlId, title: controlId, description: description || "—" });
    }
    return out;
  }

  const index = buildBm25Index(
    ds.controls.map((c) => ({
      id: String(c.controlId ?? "").trim(),
      text: `${c.controlId ?? ""} ${c.title ?? ""} ${c.description ?? ""} ${c.implementationGuidance ?? ""}`,
    })),
  );
  const byId = new Map(ds.controls.map((c) => [String(c.controlId ?? "").trim(), c]));
  const ranked = normalizeScores(bm25Query(index, queryText))
    .map((r) => ({ ...r, score: hintKeys.has(normalizeControlIdKey(r.id)) ? r.score + 1 : r.score }))
    .filter((r) => r.id && byId.has(r.id) && r.score >= PICK_CONTROL_RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return ranked.slice(0, cap).map((r) => slimFieldsFromCatalogControl(byId.get(r.id)!));
}

const MAX_LOOKUP_DESCRIPTION_LEN = 4000;

/**
 * Resolve catalog text for a control ID using the framework name on the mapping row
 * (e.g. "GDPR (2016/679)" or "NIST AI RMF") and optional global fallback when the ID is unique.
 */
export function lookupControlDescription(
  rowFrameworkLabel: string,
  controlId: string,
): string {
  const id = String(controlId ?? "").trim();
  if (!id) return "";
  const hint = stripVersionParenthetical(String(rowFrameworkLabel ?? "").toLowerCase());
  const datasets = loadFrameworkDatasets();
  const idLower = id.toLowerCase();

  const tryFind = (ds: FrameworkDataset): string => {
    for (const c of ds.controls) {
      if (String(c.controlId ?? "").trim().toLowerCase() === idLower) {
        const text = descriptionFromCatalogControl(c);
        if (text.length > MAX_LOOKUP_DESCRIPTION_LEN) {
          return `${text.slice(0, MAX_LOOKUP_DESCRIPTION_LEN)}…`;
        }
        return text;
      }
    }
    return "";
  };

  for (const ds of datasets) {
    if (!datasetMatchesRowLabel(ds, hint)) continue;
    const found = tryFind(ds);
    if (found) return found;
  }

  for (const ds of datasets) {
    const found = tryFind(ds);
    if (found) return found;
  }

  return "";
}
