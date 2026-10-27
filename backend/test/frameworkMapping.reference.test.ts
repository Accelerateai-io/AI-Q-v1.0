/**
 * Offline reference tests for framework-mapping v2 (PROMPT 2).
 * Run: npx tsx backend/test/frameworkMapping.reference.test.ts
 * Uses the #46 document fixtures and the on-disk catalogues (no DB, no network).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyDocument, mapToFrameworkControls } from "../src/services/complianceDocumentParser.js";
import { loadFrameworkDatasets } from "../src/services/frameworkDatasetsLoader.js";
import { canonicalFrameworkId, canonicalCovers } from "../src/services/frameworkMapping/frameworkCatalogMap.js";
import {
  buildControlMitigationCards,
  NO_MITIGATION_MESSAGE,
} from "../../frontend/src/utils/frameworkControlRiskMitigation.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(dir, "fixtures", "mapping");
const readFix = (f: string) => fs.readFileSync(path.join(FIX, f), "utf8");

// --- classifier -------------------------------------------------------------

test("HIPAA BAA classifies as HIPAA (not NIST) and resolves the HIPAA Security Rule catalogue", () => {
  const text = readFix("doc-hipaa-baa.txt");
  const cls = classifyDocument("hipaa-baa.pdf", text);
  assert.equal(cls, "HIPAA");
  const mapped = mapToFrameworkControls(text, cls);
  assert.equal(mapped.status, "mapped");
  assert.equal(mapped.framework, "HIPAA Security Rule");
});

test("GDPR DPA mentioning 'phishing' classifies as GDPR (not HIPAA), never unclassified", () => {
  const text = readFix("doc-gdpr-dpa.txt");
  assert.match(text, /phishing/i);
  const cls = classifyDocument("gdpr-dpa.pdf", text);
  assert.equal(cls, "GDPR");
  assert.notEqual(cls, "HIPAA");
  assert.notEqual(cls, "unclassified");
});

test("text mentioning 'Fedora' does NOT classify as DORA", () => {
  const cls = classifyDocument("notes.pdf", "This service runs on Fedora Linux with standard hardening and patching.");
  assert.notEqual(cls, "DORA");
});

test("PCI AOC that never says 'PCI' classifies as PCI-DSS", () => {
  const text = readFix("doc-pci-dss-aoc.txt");
  assert.ok(!/\bPCI\b/.test(text), "fixture must not contain the token PCI");
  const cls = classifyDocument("aoc.pdf", text);
  assert.equal(cls, "PCI-DSS");
});

test("SOC 3 report classifies as SOC3 and maps to the SOC 2 catalogue via the basis rule", () => {
  const text = readFix("doc-soc3-report.txt");
  const cls = classifyDocument("soc3.pdf", text);
  assert.equal(cls, "SOC3");
  const mapped = mapToFrameworkControls(text, cls);
  assert.equal(mapped.framework, "SOC2");
  assert.match(String(mapped.basis), /SOC 3 is a public summary of a SOC 2 examination/);
});

test("ISO 42001 certificate is recognised (ISO42001) and mapped to no_catalog_yet, not invalid", () => {
  const text = readFix("doc-iso-42001-cert.txt");
  const cls = classifyDocument("iso42001.pdf", text);
  assert.equal(cls, "ISO42001");
  const mapped = mapToFrameworkControls(text, cls);
  assert.equal(mapped.status, "no_catalog_yet");
  assert.match(mapped.framework, /Control-level mapping not available yet/);
});

// --- catalogues -------------------------------------------------------------

test("loaded ISO 27001 catalogue has no duplicate controlIds", () => {
  const ds = loadFrameworkDatasets().find((d) => d.framework?.name === "ISO 27001:2022");
  assert.ok(ds, "ISO 27001:2022 catalogue present");
  const ids = ds!.controls.map((c) => c.controlId);
  assert.equal(new Set(ids).size, ids.length, "duplicate controlIds remain after dedup");
});

test("HIPAA catalogue matches 45 CFR 164 Appendix A: 164.308-312 = 18 standards + 36 specs (14 R, 22 A)", () => {
  const ds = loadFrameworkDatasets().find((d) => d.framework?.name === "HIPAA Security Rule");
  assert.ok(ds, "HIPAA Security Rule catalogue present");
  const inRange = ds!.controls.filter((c) => /^164\.(308|310|312)/.test(String(c.controlId)));
  const std = inRange.filter((c) => (c as unknown as { kind?: string }).kind === "standard");
  const specs = inRange.filter((c) => (c as unknown as { kind?: string }).kind === "spec");
  const req = (r: string) => specs.filter((c) => (c as unknown as { requirement?: string }).requirement === r);
  assert.equal(std.length, 18, "standards");
  assert.equal(specs.length, 36, "implementation specs");
  assert.equal(req("Required").length, 14, "Required specs");
  assert.equal(req("Addressable").length, 22, "Addressable specs");
});

// --- canonical gap check ----------------------------------------------------

test("SOC 3 != SOC 2 by canonical id; SOC 2 covers SOC 3 only via the basis equivalence", () => {
  assert.notEqual(canonicalFrameworkId("SOC 3"), canonicalFrameworkId("SOC 2"));
  assert.equal(canonicalCovers("SOC3", "SOC2"), true);
  assert.equal(canonicalCovers("SOC2", "SOC3"), false);
});

test("NIST CSF != NIST AI RMF != NIST SP 800-53 by canonical id", () => {
  const csf = canonicalFrameworkId("NIST CSF v2.0");
  const airmf = canonicalFrameworkId("NIST AI RMF");
  const n80053 = canonicalFrameworkId("NIST SP 800-53 rev5");
  assert.notEqual(csf, airmf);
  assert.notEqual(csf, n80053);
  assert.notEqual(airmf, n80053);
  assert.equal(canonicalCovers(String(csf), String(airmf)), false);
});

// --- honest frontend display ------------------------------------------------

test("frontend util never outputs reliabilityPercent or MITIGATED; status is 'Suggested — not verified'", () => {
  const control = { controlId: "164.312(a)(1)", title: "Access Control", description: "authorized access to electronic protected health information" };
  const risks = [{ risk_id: "RISK-1", risk_title: "Unauthorized access to records", description: "access control failure exposes protected records", severity: 20 }];
  const mits = { "RISK-1": [{ mitigation_action_id: "M1", mitigation_action_name: "Role-based access control", mitigation_definition: "Enforce least-privilege authorized access controls", mitigation_category: "Access" }] };
  const cards = buildControlMitigationCards(control as never, risks, mits, 8);
  const json = JSON.stringify(cards);
  assert.ok(!json.includes("reliabilityPercent"), "must not emit reliabilityPercent");
  assert.ok(!/MITIGATED|PARTIAL/.test(json), "must not emit MITIGATED/PARTIAL");
  assert.ok(cards.length > 0, "expected at least one suggestion");
  assert.equal(cards[0]!.status, "Suggested — not verified");
  assert.ok(Array.isArray(cards[0]!.matchedTerms) && cards[0]!.matchedTerms.length > 0, "matchedTerms present");
  assert.equal(cards[0]!.risksAddressed[0]!.severity, "High", "severity from risk severity (20 -> High), not position");
});

test("zero-overlap control yields an empty mitigation list (caller shows NO_MITIGATION_MESSAGE)", () => {
  const control = { controlId: "ZZ-1", title: "Zzz Quux", description: "wholly unrelated xyzzy plugh frobnicate" };
  const risks = [{ risk_id: "RISK-1", risk_title: "Banking fraud losses", description: "card fraud chargebacks declines" }];
  const mits = { "RISK-1": [{ mitigation_action_id: "M1", mitigation_action_name: "Fraud monitoring", mitigation_definition: "monitor payment transactions" }] };
  const cards = buildControlMitigationCards(control as never, risks, mits, 8);
  assert.equal(cards.length, 0);
  assert.equal(typeof NO_MITIGATION_MESSAGE, "string");
});

// --- PROMPT 3: control relevance ranking (BM25) -----------------------------

function mappedControls(fixture: string) {
  const text = readFix(fixture);
  return mapToFrameworkControls(text, classifyDocument(fixture, text)).controls;
}
function catalogueFirstIds(name: string, n: number): string[] {
  const ds = loadFrameworkDatasets().find((d) => d.framework?.name === name)!;
  return ds.controls.slice(0, n).map((c) => String(c.controlId));
}

test("relevanceScore is normalised 0-1 (top = 1) with matchedTerms", () => {
  const ctrls = mappedControls("doc-hipaa-baa.txt");
  assert.ok(ctrls.length > 0);
  assert.equal(ctrls[0]!.relevanceScore, 1);
  for (const c of ctrls) {
    assert.ok(c.relevanceScore > 0 && c.relevanceScore <= 1, `score in (0,1]: ${c.relevanceScore}`);
    assert.ok(Array.isArray(c.matchedTerms) && c.matchedTerms!.length > 0, "matchedTerms present");
  }
});

test("HIPAA BAA top-5 includes 164.308 and 164.314 controls (164.312 within the mapped set)", () => {
  const ctrls = mappedControls("doc-hipaa-baa.txt");
  const top5 = ctrls.slice(0, 5).map((c) => c.controlId);
  assert.ok(top5.some((id) => id.startsWith("164.308")), `top5=${top5}`);
  assert.ok(top5.some((id) => id.startsWith("164.314")), `top5=${top5}`);
  assert.ok(ctrls.some((c) => c.controlId.startsWith("164.312")), "164.312 present in mapped set");
});

test("top-5 controls are NOT the catalogue's first ids", () => {
  const top5 = mappedControls("doc-hipaa-baa.txt").slice(0, 5).map((c) => c.controlId);
  const first5 = catalogueFirstIds("HIPAA Security Rule", 5);
  assert.notDeepEqual(top5, first5);
  assert.notEqual(top5[0], first5[0]);
});

test("ISO 27001 cert surfaces Annex A (A.5/A.8) controls in its top-5", () => {
  const top5 = mappedControls("doc-iso-27001-cert.txt").slice(0, 5).map((c) => c.controlId);
  assert.ok(top5.some((id) => id.startsWith("A.5") || id.startsWith("A.8")), `top5=${top5}`);
});

test("PCI AOC surfaces Requirement 12 (programme/scope) controls in its top-5", () => {
  const top5 = mappedControls("doc-pci-dss-aoc.txt").slice(0, 5).map((c) => c.controlId);
  assert.ok(top5.some((id) => id.startsWith("12.")), `top5=${top5}`);
});

test("GDPR DPA surfaces processor/security articles (28/32) in its top-5", () => {
  const top5 = mappedControls("doc-gdpr-dpa.txt").slice(0, 5).map((c) => c.controlId);
  assert.ok(top5.some((id) => id.startsWith("28") || id.startsWith("32")), `top5=${top5}`);
});

test("control ranking is deterministic (same input -> same output)", () => {
  const a = mappedControls("doc-hipaa-baa.txt").map((c) => `${c.controlId}:${c.relevanceScore}`);
  const b = mappedControls("doc-hipaa-baa.txt").map((c) => `${c.controlId}:${c.relevanceScore}`);
  assert.deepEqual(a, b);
});
