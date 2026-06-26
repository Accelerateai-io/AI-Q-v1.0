const MAX_POINT_LEN = 200;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function capAtWordBoundary(text: string, max: number): string {
  const t = normalizeWhitespace(text);
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const sp = slice.lastIndexOf(" ");
  const cut = sp > max * 0.5 ? sp : max;
  return normalizeWhitespace(t.slice(0, cut)) + "…";
}

/**
 * Split long prose into short lines suitable as bullet points.
 */
export function splitIntoSummaryPoints(text: string): string[] {
  const t = normalizeWhitespace(text);
  if (!t || t === "—") return [];

  if (t.length <= MAX_POINT_LEN) return [t];

  const parts = t.split(/(?<=[.!?])\s+|;\s+|\n+|•\s+|(?<=\d)\)\s+/);
  const out: string[] = [];
  for (const part of parts) {
    const p = normalizeWhitespace(part);
    if (!p) continue;
    if (p.length <= MAX_POINT_LEN) {
      out.push(p);
    } else {
      let rest = p;
      while (rest.length > MAX_POINT_LEN) {
        const slice = rest.slice(0, MAX_POINT_LEN);
        const sp = slice.lastIndexOf(" ");
        const cut = sp > MAX_POINT_LEN * 0.45 ? sp : MAX_POINT_LEN;
        out.push(normalizeWhitespace(rest.slice(0, cut)) + "…");
        rest = rest.slice(cut).trim();
      }
      if (rest) out.push(rest);
    }
  }
  return out.length > 0 ? out : [capAtWordBoundary(t, MAX_POINT_LEN)];
}

export type RiskRowForSummary = {
  risk_id?: string | null;
  risk_title?: string | null;
  description?: string | null;
  executive_summary?: string | null;
  summary_points?: string[] | null;
};

/**
 * Build deduplicated bullet lines for the Risk Assessment UI from DB-matched risks.
 * When `summary_points` is set (LLM at report generation), use it; otherwise split fields client-side.
 */
export function riskRowsToSummaryPoints(rows: RiskRowForSummary[]): string[] {
  const points: string[] = [];
  const seen = new Set<string>();

  const push = (p: string) => {
    const t = normalizeWhitespace(p);
    if (t.length < 2) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    points.push(t);
  };

  for (const r of rows) {
    const botPoints = r.summary_points;
    if (Array.isArray(botPoints) && botPoints.length > 0) {
      for (const p of botPoints) {
        push(String(p ?? ""));
      }
      continue;
    }

    const title = (r.risk_title ?? "").trim();
    const exec = (r.executive_summary ?? "").trim();
    const desc = (r.description ?? "").trim();

    if (exec) {
      splitIntoSummaryPoints(exec).forEach(push);
      continue;
    }

    if (title && !desc) {
      push(capAtWordBoundary(title, MAX_POINT_LEN));
      continue;
    }

    if (!title && desc) {
      splitIntoSummaryPoints(desc).forEach(push);
      continue;
    }

    if (title && desc) {
      const tl = title.toLowerCase();
      const dl = desc.toLowerCase();
      if (dl.startsWith(tl) || dl === tl) {
        splitIntoSummaryPoints(desc).forEach(push);
      } else {
        push(capAtWordBoundary(title, 120));
        splitIntoSummaryPoints(desc).forEach(push);
      }
      continue;
    }

    if (r.risk_id) push(String(r.risk_id));
  }

  return points;
}

/** Turn arbitrary report strings (e.g. Security Posture risks) into bullet lines. */
export function stringsToSummaryPoints(lines: string[]): string[] {
  const points: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const s = normalizeWhitespace(String(raw ?? ""));
    if (!s || s === "—") continue;
    for (const p of splitIntoSummaryPoints(s)) {
      const k = p.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      points.push(p);
    }
  }
  return points;
}
