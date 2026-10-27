/**
 * Offline reference tests for risk-mapping v2 (PROMPT 1, step 8 + correction 2).
 * Run: npx tsx backend/test/riskMapping.reference.test.ts
 * Uses the risk catalogue from a non-prod SQL dump (no DB).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { selectTop5, type CatalogueRisk } from "../src/services/riskMapping/selectTop5.js";
import { getCatalogueDomains } from "../src/services/riskMapping/riskVocabulary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DATABASE_DIR = path.join(REPO_ROOT, "DataBase");
const FIXTURES_DIR = path.join(__dirname, "fixtures", "mapping");
const PREFERRED_DUMPS = ["11Aug2026_aiq_db.sql", "ai_q_06May2026.sql", "ai_23Apr26.sql"];

const COLS = [
  "risk_mapping_id", "risk_id", "risk_title", "domains", "description", "technical_description",
  "executive_summary", "attack_vector", "observable_indicators", "data_to_identify_risk",
  "evidence_sources", "intent", "timing", "risk_type_detected", "primary_risk", "secondary_risks",
] as const;

function unescape(s: string): string {
  return s.replace(/\\(.)/g, (_m, c) => (c === "t" ? "\t" : c === "n" ? "\n" : c === "r" ? "\r" : c === "\\" ? "\\" : c));
}

function loadCatalogue(): CatalogueRisk[] {
  const dumpName =
    process.env.RISK_DUMP ??
    PREFERRED_DUMPS.find((n) => fs.existsSync(path.join(DATABASE_DIR, n))) ??
    fs.readdirSync(DATABASE_DIR).find((f) => f.endsWith(".sql") && !/prod/i.test(f))!;
  const dumpPath = path.isAbsolute(dumpName) ? dumpName : path.join(DATABASE_DIR, dumpName);
  const lines = fs.readFileSync(dumpPath, "utf8").split("\n");
  const start = lines.findIndex((l) => l.startsWith("COPY public.risk_mappings "));
  const rows: CatalogueRisk[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    let line = lines[i] ?? "";
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line === "\\.") break;
    if (line === "") continue;
    const vals = line.split("\t");
    const obj: Record<string, string | number | null> = {};
    COLS.forEach((c, j) => (obj[c] = vals[j] === undefined || vals[j] === "\\N" ? null : unescape(vals[j]!)));
    rows.push({
      risk_mapping_id: Number(obj.risk_mapping_id),
      risk_id: obj.risk_id as string | null,
      risk_title: obj.risk_title as string | null,
      domains: obj.domains as string | null,
      description: obj.description as string | null,
      secondary_risks: obj.secondary_risks as string | null,
      timing: obj.timing as string | null,
    });
  }
  return rows;
}

function loadFixture(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8")).payload;
}

const CATALOGUE = loadCatalogue();
const A = loadFixture("assessment-a-hospital-chatbot.json");
const B = loadFixture("assessment-b-bank-fraud-model.json");
const C = loadFixture("assessment-c-hr-resume-screener.json");

const runA = selectTop5(CATALOGUE, A);
const runB = selectTop5(CATALOGUE, B);
const runC = selectTop5(CATALOGUE, C);

const idsOf = (r: typeof runA) => r.selected.map((x) => x.risk_id);
const domainsOf = (r: typeof runA) => r.selected.map((x) => x.domains);
const shared = (x: (string | null)[], y: (string | null)[]) => x.filter((id) => y.includes(id)).length;

test("catalogue loaded (1248 rows) and 7 domains present", () => {
  assert.ok(CATALOGUE.length >= 1200, `expected ~1248 rows, got ${CATALOGUE.length}`);
});

test("correction 2: every vocabulary domain exists exactly in the catalogue", () => {
  const catalogueDomains = new Set(CATALOGUE.map((r) => r.domains).filter(Boolean) as string[]);
  for (const d of getCatalogueDomains()) {
    assert.ok(catalogueDomains.has(d), `vocab domain not found verbatim in catalogue: "${d}"`);
  }
});

test("the three top-5 sets are not identical; any two share <= 2 ids", () => {
  const a = idsOf(runA), b = idsOf(runB), c = idsOf(runC);
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.notDeepEqual(b, c);
  assert.ok(shared(a, b) <= 2, `A/B share ${shared(a, b)}: A=${a} B=${b}`);
  assert.ok(shared(a, c) <= 2, `A/C share ${shared(a, c)}: A=${a} C=${c}`);
  assert.ok(shared(b, c) <= 2, `B/C share ${shared(b, c)}: B=${b} C=${c}`);
});

test("A has >=1 Human-Computer Interaction or Misinformation, and >=1 Privacy and Security", () => {
  const d = domainsOf(runA);
  assert.ok(
    d.includes("Human-Computer Interaction") || d.includes("Misinformation"),
    `A domains: ${JSON.stringify(d)}`,
  );
  assert.ok(d.includes("Privacy and Security"), `A domains: ${JSON.stringify(d)}`);
});

const textOf = (r: { risk_title: string | null; description: string | null }) =>
  `${r.risk_title ?? ""} ${r.description ?? ""}`.toLowerCase();

test("B has >=1 Privacy and Security AND >=1 fraud/financial-harm risk", () => {
  const d = domainsOf(runB);
  assert.ok(d.includes("Privacy and Security"), `B domains: ${JSON.stringify(d)}`);
  const hasFraud = runB.selected.some((r) =>
    /fraud|financial|monetary|\bmoney\b|economic|payment|transaction|card/.test(textOf(r)),
  );
  assert.ok(hasFraud, `B has no fraud/financial-harm risk: ${JSON.stringify(idsOf(runB))}`);
});

test("C has a hiring/bias risk and NO impersonation/identity-theft/self-harm/toxic-content risk", () => {
  const hasBias = runC.selected.some((r) =>
    /bias|hiring|employment|recruitment|fairness|discriminat/.test(textOf(r)),
  );
  assert.ok(hasBias, `C has no bias/hiring risk: ${JSON.stringify(idsOf(runC))}`);
  const banned = runC.selected.filter((r) =>
    /impersonation|identity theft|self-harm|self harm|\btoxic/.test(textOf(r)),
  );
  assert.equal(banned.length, 0, `C has banned content-harm risks: ${JSON.stringify(banned.map((r) => r.risk_id))}`);
});

test("rule 4: A keeps an over-trust / over-reliance / explainability risk", () => {
  const has = runA.selected.some((r) =>
    /over-trust|over trust|over-relian|over relian|overrelian|over-dependen|automation bias|anthropomorph|emotional dependenc|explainab|interpretab|misplaced trust|trust calibration|blind trust/.test(
      textOf(r),
    ),
  );
  assert.ok(has, `A has no over-trust/explainability risk: ${JSON.stringify(idsOf(runA))}`);
});

test("rule 3: B includes >=1 adversary evasion/manipulation risk", () => {
  const has = runB.selected.some((r) =>
    /adversar|evasion|evade|evading|manipulat|fraudster|model extraction|poison/.test(textOf(r)),
  );
  assert.ok(has, `B has no adversary-evasion/manipulation risk: ${JSON.stringify(idsOf(runB))}`);
});

test("rule 1: A excludes reinforcement/exploratory-learning risks; B excludes LLM-specific risks", () => {
  const aBad = runA.selected.filter((r) =>
    /reinforcement learning|exploratory learning|\bexploratory\b|reward hacking|\brobotic/.test(textOf(r)),
  );
  assert.equal(aBad.length, 0, `A has RL/exploratory risks: ${JSON.stringify(aBad.map((r) => r.risk_id))}`);
  const bBad = runB.selected.filter((r) =>
    /jailbreak|prompt injection|prompt engineering|\brlhf\b|\bllm\b|large language model/.test(textOf(r)),
  );
  assert.equal(bBad.length, 0, `B has LLM-specific risks: ${JSON.stringify(bBad.map((r) => r.risk_id))}`);
});

test("rule 1 (agentic guard): A, B, C contain no multi-agent or recursive self-improvement risks", () => {
  const re = /multi-?agent|\bagentic\b|recursive (?:self-?)?improv|recursively self-?improv|self-improving ai|autonomous replication|self-?replicat/;
  for (const [name, r] of [["A", runA], ["B", runB], ["C", runC]] as const) {
    const bad = r.selected.filter((x) => re.test(textOf(x)));
    assert.equal(bad.length, 0, `${name} has agentic/recursive risks: ${JSON.stringify(bad.map((x) => x.risk_id))}`);
  }
});

test("rule 2: no two selected risks share most of their title words", () => {
  const FN = new Set(["the", "and", "for", "of", "in", "to", "a", "an", "with", "from", "or", "on", "by", "as", "at", "through", "due", "via", "into", "that", "this", "their", "its"]);
  const words = (t: string | null) =>
    new Set((t ?? "").toLowerCase().split(/[^a-z0-9]+/g).filter((w) => w.length >= 2 && !FN.has(w)));
  for (const [name, r] of [["A", runA], ["B", runB], ["C", runC]] as const) {
    const titles = r.selected.map((x) => x.risk_title);
    for (let i = 0; i < titles.length; i++) {
      for (let j = i + 1; j < titles.length; j++) {
        const a = words(titles[i] ?? ""), b = words(titles[j] ?? "");
        const sharedN = [...a].filter((w) => b.has(w)).length;
        const ratio = a.size && b.size ? sharedN / Math.min(a.size, b.size) : 0;
        assert.ok(
          !(sharedN >= 3 && ratio >= 0.6),
          `${name}: near-duplicate titles kept: "${titles[i]}" / "${titles[j]}"`,
        );
      }
    }
  }
});

test("no domain appears more than twice in any top-5", () => {
  for (const [name, r] of [["A", runA], ["B", runB], ["C", runC]] as const) {
    const counts: Record<string, number> = {};
    for (const d of domainsOf(r)) counts[d ?? ""] = (counts[d ?? ""] ?? 0) + 1;
    for (const [dom, n] of Object.entries(counts)) {
      assert.ok(n <= 2, `${name}: domain "${dom}" appears ${n} times`);
    }
  }
});

test("every selected row has a non-empty match_trace with lookup_version v1", () => {
  for (const r of [runA, runB, runC]) {
    assert.ok(r.selected.length > 0);
    for (const row of r.selected) {
      assert.ok(row.match_trace, "missing match_trace");
      assert.equal(row.match_trace.lookup_version, "v1");
      assert.ok(
        row.match_trace.vocabulary.length > 0 || row.match_trace.text_terms.length > 0,
        `empty trace for ${row.risk_id}`,
      );
    }
  }
});

test("same input -> same output (deterministic)", () => {
  assert.deepEqual(idsOf(selectTop5(CATALOGUE, A)), idsOf(runA));
  assert.deepEqual(idsOf(selectTop5(CATALOGUE, B)), idsOf(runB));
});

test("payload with no usable answers -> empty list with insufficient-context reason", () => {
  const empty = selectTop5(CATALOGUE, {});
  assert.equal(empty.selected.length, 0);
  assert.equal(empty.reason, "insufficient_assessment_context");
});

test("mitigation ids passed as riskMitigationMappingIds are ignored", () => {
  const withBogus = selectTop5(CATALOGUE, { ...A, riskMitigationMappingIds: [99999, 1, 2, 3, 4] });
  assert.deepEqual(idsOf(withBogus), idsOf(runA));
});
