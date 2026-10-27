/**
 * Extract text from compliance PDFs (pdf-parse-new) and infer certificate/report expiry dates.
 * Used after vendor attestation submit (COMPLETED) for slot-2 categorized compliance documents.
 */
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse-new") as (
  dataBuffer: Buffer,
  options?: { verbosityLevel?: number },
) => Promise<{ text?: string }>;
import { db } from "../database/db.js";
import { vendorSelfAttestations } from "../schema/schema.js";
import { eq } from "drizzle-orm";
import { buildFrameworkMappingRowsFromComplianceExpiries } from "./frameworkMappingFromCompliance.js";
import { loadFrameworkDatasets, type FrameworkControl } from "./frameworkDatasetsLoader.js";
import { resolveClassToCatalog, getClassifierThreshold } from "./frameworkMapping/frameworkCatalogMap.js";
import { buildBm25Index, bm25Query, normalizeScores } from "./frameworkMapping/bm25.js";

/** Minimum normalised BM25 relevance (0-1) for a control to be shown for a document. Calibrated on fixtures. */
const DOC_CONTROL_RELEVANCE_THRESHOLD = 0.35;

const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads_vendor_attestations");

export type ComplianceDocExpiryEntry = {
  category: string;
  expiryAt: string | null;
  parsedAt: string;
  documentClass?: string;
  frameworkMapping?: {
    framework: string;
    version?: string;
    status?: "mapped" | "no_catalog_yet";
    basis?: string;
    controls: Array<{
      controlId: string;
      title: string;
      /** Full catalog description for this control (from framework JSON). */
      description: string;
      relevanceScore: number;
      matchedTerms?: string[];
    }>;
  };
  validation?: {
    isValid: boolean;
    reason: string;
    controlsMapped: number;
    status?: "mapped" | "no_catalog_yet" | "unclassified";
    noCatalogYet?: boolean;
  };
  error?: string;
};

export type ComplianceDocExpiryMap = Record<string, ComplianceDocExpiryEntry>;

const MONTHS =
  "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";

/** Lines that suggest an expiry / validity end date (compliance certs, SOC reports). */
const EXPIRY_LINE =
  /valid\s*(?:until|through|to|from)|expir(?:es|y|ation)|certificate\s*(?:is\s*)?valid|period\s*(?:of\s*)?(?:validity|coverage)|report\s*period|audit\s*period|coverage\s*period|effective\s*(?:until|through)|remains\s*valid|due\s*for\s*renewal/i;

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizeText(s: string): Set<string> {
  return new Set(
    normalizeToken(s)
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  );
}

type WeightedPattern = { re: RegExp; w: number };
/** Word-boundary, case-insensitive patterns on full names AND acronyms, scored per class. */
const DOC_CLASS_PATTERNS: Array<{ cls: string; patterns: WeightedPattern[] }> = [
  { cls: "HIPAA", patterns: [{ re: /health insurance portability/i, w: 2 }, { re: /\bbusiness associate (agreement|contract)\b/i, w: 2 }, { re: /\bHIPAA\b/i, w: 2 }, { re: /\b45\s*CFR\s*164\b/i, w: 2 }] },
  { cls: "HITECH", patterns: [{ re: /\bHITECH\b/i, w: 2 }] },
  { cls: "GDPR", patterns: [{ re: /general data protection regulation/i, w: 2 }, { re: /\bdata processing (agreement|addendum)\b/i, w: 2 }, { re: /\bGDPR\b/i, w: 2 }] },
  { cls: "PCI-DSS", patterns: [{ re: /payment card industry data security standard/i, w: 2 }, { re: /\bPCI[\s-]?DSS\b/i, w: 2 }] },
  { cls: "SOC3", patterns: [{ re: /\bSOC\s?3\b/i, w: 2 }] },
  { cls: "SOC2", patterns: [{ re: /\bSOC\s?2\b/i, w: 2 }] },
  { cls: "ISO27001", patterns: [{ re: /\bISO\/?\s?(IEC\s?)?27001\b/i, w: 2 }] },
  { cls: "ISO42001", patterns: [{ re: /\bISO\/?\s?(IEC\s?)?42001\b/i, w: 2 }] },
  { cls: "ISO27701", patterns: [{ re: /\bISO\/?\s?(IEC\s?)?27701\b/i, w: 2 }] },
  { cls: "NIST-800-53", patterns: [{ re: /\bSP\s?800-53\b/i, w: 2 }, { re: /\b800-53\b/, w: 2 }, { re: /\bNIST\b/i, w: 1 }] },
  { cls: "NIST-800-171", patterns: [{ re: /\bSP\s?800-171\b/i, w: 2 }, { re: /\b800-171\b/, w: 2 }] },
  { cls: "NIST-AI-RMF", patterns: [{ re: /\bAI\s?RMF\b/i, w: 2 }, { re: /ai risk management framework/i, w: 2 }] },
  { cls: "NIST-CSF", patterns: [{ re: /\bNIST\s?CSF\b/i, w: 2 }, { re: /cybersecurity framework/i, w: 2 }] },
  { cls: "DORA", patterns: [{ re: /\bDORA\b/, w: 2 }, { re: /digital operational resilience act/i, w: 2 }] },
  { cls: "CMMC", patterns: [{ re: /\bCMMC\b/i, w: 2 }] },
  { cls: "FEDRAMP", patterns: [{ re: /\bFedRAMP\b/i, w: 2 }] },
];

/** Score every class; return the highest-scoring class, or "unclassified" below the threshold. */
export function classifyDocument(fileName: string, text: string): string {
  const hay = `${fileName}\n${text.slice(0, 8000)}`;
  const scores: Record<string, number> = {};
  const add = (cls: string, w: number) => { scores[cls] = (scores[cls] ?? 0) + w; };
  for (const { cls, patterns } of DOC_CLASS_PATTERNS) {
    for (const { re, w } of patterns) if (re.test(hay)) add(cls, w);
  }
  // PHI counts for HIPAA ONLY with HIPAA / Business Associate context (so "phishing" never triggers HIPAA).
  if (/\be?phi\b/i.test(hay) && /(hipaa|business associate|health insurance portability)/i.test(hay)) add("HIPAA", 1);
  // "Attestation of Compliance" + payment-card wording => PCI DSS (AOC), even when "PCI" is absent.
  if (/attestation of compliance/i.test(hay) && /(payment card|cardholder|pci)/i.test(hay)) add("PCI-DSS", 2);

  let best = "unclassified";
  let bestScore = 0;
  for (const [cls, s] of Object.entries(scores)) {
    if (s > bestScore) { best = cls; bestScore = s; }
  }
  return bestScore >= getClassifierThreshold() ? best : "unclassified";
}

function categoryExpectedClass(category: string): string | null {
  const c = category.toLowerCase();
  if (/soc\s*3/.test(c)) return "SOC3";
  if (/soc\s*2/.test(c)) return "SOC2";
  if (/iso\s*27001/.test(c)) return "ISO27001";
  if (/iso\s*42001/.test(c)) return "ISO42001";
  if (/hitrust/.test(c)) return "HIPAA";
  if (/fedramp/.test(c)) return "FEDRAMP";
  if (/pci/.test(c)) return "PCI-DSS";
  if (/hipaa/.test(c)) return "HIPAA";
  if (/gdpr/.test(c)) return "GDPR";
  return null;
}

function classMatchesCategory(docClass: string, category: string): boolean {
  const expected = categoryExpectedClass(category);
  if (!expected) return true;
  return docClass === expected;
}

const MAX_STORED_CONTROL_DESCRIPTION_LEN = 4000;

export interface FrameworkMappingResult {
  framework: string;
  version?: string;
  status: "mapped" | "no_catalog_yet";
  basis?: string;
  controls: Array<{
    controlId: string;
    title: string;
    description: string;
    relevanceScore: number;
    matchedTerms: string[];
  }>;
}

/**
 * Map a classified document to its catalogue controls via the versioned frameworkCatalogMap.
 * Resolves the class to exactly one catalogue by name (no fuzzy framework matching). A class with
 * no catalogue returns an honest { status: "no_catalog_yet" } marker with zero controls — never
 * null (which the old flow treated as "invalid").
 */
export function mapToFrameworkControls(text: string, docClass: string): FrameworkMappingResult {
  const resolution = resolveClassToCatalog(docClass, docClass);
  if (resolution.kind === "no_catalog_yet") {
    return { framework: resolution.wording, status: "no_catalog_yet", basis: resolution.basis, controls: [] };
  }
  const ds = loadFrameworkDatasets().find(
    (d) => String(d.framework?.name ?? "").trim() === resolution.catalogName,
  );
  if (!ds) {
    return { framework: resolution.catalogName, status: "no_catalog_yet", basis: resolution.basis, controls: [] };
  }
  // BM25 relevance of each control (id + title + description) against the document text.
  const index = buildBm25Index(
    ds.controls.map((c: FrameworkControl) => ({
      id: String(c.controlId ?? "").trim(),
      text: `${c.controlId ?? ""} ${c.title ?? ""} ${c.description ?? ""}`,
    })),
  );
  const byId = new Map(ds.controls.map((c) => [String(c.controlId ?? "").trim(), c]));
  const controls = normalizeScores(bm25Query(index, text.slice(0, 20000)))
    .filter((r) => r.id && r.score >= DOC_CONTROL_RELEVANCE_THRESHOLD)
    .slice(0, 10)
    .map((r) => {
      const c = byId.get(r.id)!;
      const descRaw = String(c.description ?? c.implementationGuidance ?? "").trim();
      const description =
        descRaw.length > MAX_STORED_CONTROL_DESCRIPTION_LEN
          ? `${descRaw.slice(0, MAX_STORED_CONTROL_DESCRIPTION_LEN)}…`
          : descRaw;
      return {
        controlId: r.id,
        title: String(c.title ?? "").trim(),
        description,
        relevanceScore: r.score,
        matchedTerms: r.matchedTerms.slice(0, 12),
      };
    });
  return {
    framework: String(ds.framework?.name ?? resolution.catalogName),
    version: ds.framework?.version,
    status: "mapped",
    basis: resolution.basis,
    controls,
  };
}

function padY(y: number): number {
  if (y >= 0 && y < 100) return y >= 50 ? 1900 + y : 2000 + y;
  return y;
}

function parseDateCandidate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY or MM/DD/YYYY (prefer day-first for EU certs; if first part > 12 it's DMY)
  m = s.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (m) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y = padY(y);
    let day: number;
    let month: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      day = b;
      month = a;
    } else {
      // ambiguous: assume MM/DD (US) for SOC-style reports
      month = a;
      day = b;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(y, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Month DD, YYYY
  const re = new RegExp(
    `\\b(${MONTHS})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})\\b`,
    "i",
  );
  m = s.match(re);
  if (m) {
    const d = new Date(`${m[1]} ${m[2]}, ${m[3]}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD Month YYYY
  const re2 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\s+(\\d{4})\\b`, "i");
  m = s.match(re2);
  if (m) {
    const d = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function extractDatesFromChunk(chunk: string): Date[] {
  const out: Date[] = [];
  const isoAll = chunk.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g);
  for (const x of isoAll) {
    const d = parseDateCandidate(x[1] ?? "");
    if (d) out.push(d);
  }
  const slashAll = chunk.matchAll(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g);
  for (const x of slashAll) {
    const d = parseDateCandidate(x[0] ?? "");
    if (d) out.push(d);
  }
  const monthAll = chunk.matchAll(
    new RegExp(`\\b(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{4}\\b`, "gi"),
  );
  for (const x of monthAll) {
    const d = parseDateCandidate(x[0] ?? "");
    if (d) out.push(d);
  }
  const dmyAll = chunk.matchAll(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\s+\\d{4}\\b`, "gi"));
  for (const x of dmyAll) {
    const d = parseDateCandidate(x[0] ?? "");
    if (d) out.push(d);
  }
  return out;
}

function isReasonableCertDate(d: Date): boolean {
  const y = d.getFullYear();
  return y >= 2020 && y <= 2048;
}

/** YYYY-MM-DD in local calendar (avoids UTC off-by-one for cert wording dates). */
function toDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Pick best expiry from certificate-style text: prefer dates on/near expiry keywords, else latest reasonable date in those lines.
 */
export function extractExpiryFromText(fullText: string): Date | null {
  const text = fullText.replace(/\r\n/g, "\n").slice(0, 600_000);
  const lines = text.split("\n");
  const keywordDates: Date[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!EXPIRY_LINE.test(line)) continue;
    const window = [line, lines[i + 1] ?? "", lines[i - 1] ?? ""].join(" ");
    const dates = extractDatesFromChunk(window).filter(isReasonableCertDate);
    for (const d of dates) keywordDates.push(d);
  }
  if (keywordDates.length > 0) {
    keywordDates.sort((a, b) => b.getTime() - a.getTime());
    return keywordDates[0] ?? null;
  }
  // Fallback: last ISO or slash date in first 80 lines (cover page often has period)
  const head = lines.slice(0, 80).join("\n");
  const headDates = extractDatesFromChunk(head).filter(isReasonableCertDate);
  if (headDates.length > 0) {
    headDates.sort((a, b) => b.getTime() - a.getTime());
    return headDates[0] ?? null;
  }
  return null;
}

async function extractTextFromFile(filePath: string, ext: string): Promise<string> {
  const buf = await fs.promises.readFile(filePath);
  const e = ext.toLowerCase();
  if (e === ".pdf") {
    const data = await pdfParse(buf, { verbosityLevel: 0 });
    return (data.text ?? "").trim();
  }
  if (e === ".docx" || e === ".doc") {
    throw new Error("Only PDF is parsed for expiry; export or upload as PDF.");
  }
  if (e === ".ppt" || e === ".pptx") {
    throw new Error("Slides are not parsed for expiry; export or upload as PDF.");
  }
  throw new Error(`Unsupported extension: ${ext}`);
}

function collectComplianceFiles(
  documentUploads: Record<string, unknown> | null | undefined,
): Array<{ fileName: string; category: string }> {
  const out: Array<{ fileName: string; category: string }> = [];
  const seen = new Set<string>();
  if (!documentUploads || typeof documentUploads !== "object") return out;
  const addFile = (rawName: string, category: string) => {
    const base = path.basename(rawName.trim());
    if (!base || base === "." || base === "..") return;
    if (path.extname(base).toLowerCase() !== ".pdf") return;
    if (seen.has(base)) return;
    seen.add(base);
    out.push({ fileName: base, category });
  };
  const addFiles = (files: unknown, category: string) => {
    if (!Array.isArray(files)) return;
    for (const f of files) {
      if (typeof f !== "string" || !f.trim()) continue;
      addFile(f, category);
    }
  };

  addFiles(documentUploads["0"], "marketing_material");
  addFiles(documentUploads["1"], "technical_material");
  addFiles(documentUploads["evidenceTestingPolicy"], "evidence_testing_policy");

  const slot2 = documentUploads["2"];
  if (slot2 != null && typeof slot2 === "object" && !Array.isArray(slot2)) {
    const byCat = (slot2 as Record<string, unknown>).byCategory;
    if (byCat && typeof byCat === "object") {
      for (const [category, files] of Object.entries(byCat)) {
        addFiles(files, category);
      }
    }
  }
  return out;
}

/**
 * Parse compliance uploads on disk and persist expiry metadata for the attestation.
 */
export async function parseAndStoreComplianceDocumentExpiries(
  attestationId: string,
  documentUploads: Record<string, unknown> | null | undefined,
): Promise<ComplianceDocExpiryMap> {
  const items = collectComplianceFiles(documentUploads);
  const result: ComplianceDocExpiryMap = {};
  const dir = path.resolve(UPLOADS_DIR, attestationId);
  const baseResolved = path.resolve(UPLOADS_DIR);
  if (!dir.startsWith(baseResolved)) {
    return result;
  }

  const nowIso = new Date().toISOString();

  for (const { fileName, category } of items) {
    const safe = path.basename(fileName);
    const filePath = path.resolve(dir, safe);
    if (!filePath.startsWith(dir) || !fs.existsSync(filePath)) {
      result[safe] = {
        category,
        expiryAt: null,
        parsedAt: nowIso,
        error: "File not found on server",
      };
      continue;
    }
    const ext = path.extname(safe);
    try {
      const text = await extractTextFromFile(filePath, ext);
      if (!text || text.length < 20) {
        result[safe] = {
          category,
          expiryAt: null,
          parsedAt: nowIso,
          error: "Could not extract enough text from document",
        };
        continue;
      }
      const expiry = extractExpiryFromText(text);
      const documentClass = classifyDocument(safe, text);
      const frameworkMapping = mapToFrameworkControls(text, documentClass);
      const recognized = documentClass !== "unclassified";
      const noCatalogYet = frameworkMapping.status === "no_catalog_yet";
      const controlsMapped = frameworkMapping.controls.length;
      const expired =
        expiry != null && expiry.getTime() < Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
      const mismatch = recognized && !classMatchesCategory(documentClass, category);
      // A recognised document (including one with no catalogue yet) is NOT invalid. Only an
      // unclassified, expired, or category-mismatched document fails validation.
      const isValid = recognized && !expired && !mismatch;
      const reasons: string[] = [];
      if (!recognized) reasons.push("Document could not be classified to a known framework (unclassified).");
      if (noCatalogYet) reasons.push(frameworkMapping.framework);
      if (expired) reasons.push("Certificate expiry date is in the past");
      if (mismatch) reasons.push(`Document class ${documentClass} does not match selected category ${category}`);
      const validation = {
        isValid,
        reason: reasons.join("; "),
        controlsMapped,
        mismatch,
        expired: Boolean(expired),
        status: noCatalogYet ? ("no_catalog_yet" as const) : recognized ? ("mapped" as const) : ("unclassified" as const),
        noCatalogYet,
      };
      result[safe] = {
        category,
        expiryAt: expiry ? toDateOnlyLocal(expiry) : null,
        parsedAt: nowIso,
        documentClass,
        frameworkMapping,
        validation,
        ...(expiry ? {} : { error: "No expiry date pattern detected" }),
      };
    } catch (err) {
      result[safe] = {
        category,
        expiryAt: null,
        parsedAt: nowIso,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const frameworkMappingRows = buildFrameworkMappingRowsFromComplianceExpiries(result);

  try {
    await db
      .update(vendorSelfAttestations)
      .set({
        compliance_document_expiries: result as unknown as Record<string, unknown>,
        framework_mapping_rows: frameworkMappingRows,
        updated_at: new Date(),
      })
      .where(eq(vendorSelfAttestations.id, attestationId));
  } catch (e) {
    console.error("parseAndStoreComplianceDocumentExpiries DB update:", e);
  }

  return result;
}
