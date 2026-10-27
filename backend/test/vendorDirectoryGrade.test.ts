/**
 * PROMPT 5 item 7 — the vendor directory must show the STORED grade banding
 * (A≥90, B≥80, C≥70, D≥60, F<60), not collapse every score below 80 to "C".
 * VendorDirectory.trustGradeFromScore maps the canonical trust tier to a letter
 * via ["F","D","C","B","A"][tier]; this test pins that banding.
 * Run: npx tsx --test backend/test/vendorDirectoryGrade.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { vendorTrustGradeTierFromTrustScore } from "../../frontend/src/utils/completeReportGrade.js";

/** The exact letter map VendorDirectory.trustGradeFromScore applies to the tier. */
const LETTER = ["F", "D", "C", "B", "A"] as const;
const gradeLetter = (score: number) => LETTER[vendorTrustGradeTierFromTrustScore(score)];

test("directory grade matches the stored grade across bands (VTS 12 → F)", () => {
  assert.equal(gradeLetter(12), "F"); // regression: previously showed "C"
  assert.equal(gradeLetter(65), "D");
  assert.equal(gradeLetter(75), "C");
  assert.equal(gradeLetter(85), "B");
  assert.equal(gradeLetter(95), "A");
  // Band edges.
  assert.equal(gradeLetter(60), "D");
  assert.equal(gradeLetter(59), "F");
  assert.equal(gradeLetter(80), "B");
});
