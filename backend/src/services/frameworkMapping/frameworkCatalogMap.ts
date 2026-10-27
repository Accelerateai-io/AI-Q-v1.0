/**
 * Typed loader for frameworkCatalogMap.v1.json — the single source of truth for:
 *  - which catalogue each classifier class maps to (or "no_catalog_yet"),
 *  - canonical framework ids (so gap checks compare ids, not fuzzy names),
 *  - coverage equivalences (e.g. SOC 3 covered by a SOC 2 examination).
 */
import * as fs from "node:fs";

interface CatalogMapJson {
  map_version: string;
  classifierThreshold: number;
  noCatalogYetWording: string;
  classToCatalog: Record<string, { catalogName?: string; status?: string; basis?: string }>;
  regulatoryOptionToClass: Record<string, string>;
  canonicalFrameworks: Array<{ id: string; match: string[] }>;
  coverageEquivalents: Record<string, string[]>;
}

let cached: CatalogMapJson | null = null;
function cfg(): CatalogMapJson {
  if (!cached) {
    cached = JSON.parse(
      fs.readFileSync(new URL("./frameworkCatalogMap.v1.json", import.meta.url), "utf8"),
    ) as CatalogMapJson;
  }
  return cached;
}

export function getMapVersion(): string {
  return cfg().map_version;
}
export function getClassifierThreshold(): number {
  return cfg().classifierThreshold;
}
export function classToCatalogKeys(): string[] {
  return Object.keys(cfg().classToCatalog);
}

export type CatalogResolution =
  | { kind: "catalog"; catalogName: string; basis?: string }
  | { kind: "no_catalog_yet"; wording: string; basis?: string };

/** Resolve a classifier class to a catalogue name or an honest "no_catalog_yet" marker. */
export function resolveClassToCatalog(cls: string, frameworkLabel?: string): CatalogResolution {
  const entry = cfg().classToCatalog[cls] ?? cfg().classToCatalog.unclassified;
  if (entry?.catalogName) return { kind: "catalog", catalogName: entry.catalogName, basis: entry.basis };
  const wording = cfg().noCatalogYetWording.replace("{framework}", frameworkLabel || cls);
  return { kind: "no_catalog_yet", wording, basis: entry?.basis };
}

/** Canonical framework id for any free framework name/label (null when unrecognised). */
export function canonicalFrameworkId(name: string): string | null {
  const s = String(name ?? "").toLowerCase();
  if (!s.trim()) return null;
  for (const { id, match } of cfg().canonicalFrameworks) {
    if (match.some((m) => s.includes(m.toLowerCase()))) return id;
  }
  return null;
}

/**
 * Canonical id for a regulatory option string selected on an assessment.
 * Exact option map first, then the token resolver, then a stable slug so a genuinely
 * unknown-but-required framework still produces a gap (never silently passes).
 */
export function canonicalIdForRegulatoryOption(option: string): string | null {
  const raw = String(option ?? "").trim();
  if (!raw) return null;
  const mapped = cfg().regulatoryOptionToClass[raw];
  if (mapped && mapped !== "no_catalog_yet") return mapped;
  const resolved = canonicalFrameworkId(raw);
  if (resolved) return resolved;
  return `OTHER:${raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

/** True if a present canonical id covers a required canonical id (equality or basis equivalence). */
export function canonicalCovers(requiredId: string, presentId: string): boolean {
  if (requiredId === presentId) return true;
  const eq = cfg().coverageEquivalents[requiredId] ?? [];
  return eq.includes(presentId);
}
