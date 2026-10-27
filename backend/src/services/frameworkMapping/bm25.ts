/**
 * Minimal BM25 ranking in pure TypeScript (no new dependency).
 * Used to rank framework controls by real relevance to a document / a set of risks + evidence,
 * instead of raw token-overlap counts or catalogue order.
 */

const ENGLISH_STOP = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "was", "has", "have", "had", "not",
  "may", "can", "will", "shall", "must", "should", "would", "could", "use", "used", "using", "via",
  "into", "per", "all", "any", "each", "other", "such", "which", "when", "where", "who", "whom",
  "its", "their", "them", "they", "you", "your", "our", "out", "over", "under", "between", "within",
  "upon", "about", "against", "than", "then", "also", "been", "being", "these", "those", "there",
  "including", "include", "included", "appropriate", "ensure", "provide", "implement", "maintain",
]);

/** Domain stop-words — ubiquitous in every control, so they carry no discriminating signal. */
const DOMAIN_STOP = new Set([
  "information", "security", "system", "systems", "data", "control", "controls", "policy", "policies",
  "management", "organization", "organizations", "organisation", "organisational", "organizational",
]);

export function bm25Tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of String(text ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    if (ENGLISH_STOP.has(raw) || DOMAIN_STOP.has(raw)) continue;
    out.push(raw);
  }
  return out;
}

export interface Bm25Doc {
  id: string;
  text: string;
}

export interface Bm25Index {
  docIds: string[];
  tf: Array<Map<string, number>>;
  len: number[];
  avgdl: number;
  df: Map<string, number>;
  N: number;
}

export function buildBm25Index(docs: Bm25Doc[]): Bm25Index {
  const tf: Array<Map<string, number>> = [];
  const len: number[] = [];
  const df = new Map<string, number>();
  const docIds: string[] = [];
  let totalLen = 0;
  for (const d of docs) {
    const terms = bm25Tokenize(d.text);
    const m = new Map<string, number>();
    for (const t of terms) m.set(t, (m.get(t) ?? 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    tf.push(m);
    len.push(terms.length);
    docIds.push(d.id);
    totalLen += terms.length;
  }
  const N = docs.length;
  return { docIds, tf, len, avgdl: N > 0 ? totalLen / N : 0, df, N };
}

export interface Bm25Result {
  id: string;
  index: number;
  score: number;
  matchedTerms: string[];
}

/** BM25 score of each indexed document against the query text. Sorted by score desc. */
export function bm25Query(
  index: Bm25Index,
  queryText: string,
  opts: { k1?: number; b?: number } = {},
): Bm25Result[] {
  const k1 = opts.k1 ?? 1.5;
  const b = opts.b ?? 0.75;
  const qTerms = [...new Set(bm25Tokenize(queryText))];
  const idf = new Map<string, number>();
  for (const t of qTerms) {
    const df = index.df.get(t) ?? 0;
    // BM25+ idf — always positive, avoids negative weights for very common terms.
    idf.set(t, Math.log(1 + (index.N - df + 0.5) / (df + 0.5)));
  }
  const results: Bm25Result[] = [];
  for (let i = 0; i < index.N; i++) {
    const m = index.tf[i]!;
    const dl = index.len[i]!;
    let score = 0;
    const matchedTerms: string[] = [];
    for (const t of qTerms) {
      const f = m.get(t);
      if (!f) continue;
      const w = idf.get(t) ?? 0;
      score += w * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * dl) / (index.avgdl || 1))));
      matchedTerms.push(t);
    }
    if (score > 0) results.push({ id: index.docIds[i]!, index: i, score, matchedTerms });
  }
  results.sort((a, b2) => b2.score - a.score || a.id.localeCompare(b2.id));
  return results;
}

/** Normalise scores so the top result is 1 (0 when nothing matched). Input should be sorted desc. */
export function normalizeScores(results: Bm25Result[]): Bm25Result[] {
  const max = results[0]?.score ?? 0;
  if (max <= 0) return results.map((r) => ({ ...r, score: 0 }));
  return results.map((r) => ({ ...r, score: Math.round((r.score / max) * 1000) / 1000 }));
}
