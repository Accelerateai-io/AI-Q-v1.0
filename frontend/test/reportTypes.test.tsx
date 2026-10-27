/**
 * PROMPT 6 — Vendor Comparison Matrix is hidden from Reports > Generate until it
 * supports multiple vendors, but existing stored reports still render.
 * Run with the backend tsx loader (see package.json test:reports or the PR body).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FileText } from "lucide-react";
import {
  REPORT_TYPES,
  getReportTypesForPortal,
  getReportTypeIcon,
} from "../src/Components/pages/Reports/reportTypes";

test("Vendor Comparison Matrix is not offered in Reports > Generate", () => {
  const buyerLabels = getReportTypesForPortal("buyer").map((t) => t.label);
  assert.ok(!buyerLabels.includes("Vendor Comparison Matrix"), "not in buyer generate list");
  assert.ok(
    !REPORT_TYPES.some((t) => t.label === "Vendor Comparison Matrix"),
    "not in the offered report types at all",
  );
});

test("existing Vendor Comparison Matrix reports keep their icon mapping", () => {
  // Hidden from Generate, but any already-stored report of this type still renders
  // with its own icon rather than the generic fallback.
  assert.notEqual(getReportTypeIcon("Vendor Comparison Matrix"), FileText);
});
