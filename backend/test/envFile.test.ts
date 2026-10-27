import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeEnvValue, upsertEnvFile } from "../src/utils/envFile.js";

test("isSafeEnvValue rejects newline, carriage return and equals", () => {
  assert.equal(isSafeEnvValue("normal-value_123"), true);
  assert.equal(isSafeEnvValue("has\nnewline"), false);
  assert.equal(isSafeEnvValue("has\rcr"), false);
  assert.equal(isSafeEnvValue("has=equals"), false);
});

test("upsertEnvFile throws on injection attempts (does not write)", () => {
  // Path is irrelevant: validation happens before any file access.
  assert.throws(
    () => upsertEnvFile("/tmp/does-not-matter.env", { KEY: "line1\nINJECTED=evil" }),
    /must not contain newline/,
  );
});
