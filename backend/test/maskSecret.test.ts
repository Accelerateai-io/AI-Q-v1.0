import { test } from "node:test";
import assert from "node:assert/strict";
import { maskSecret } from "../src/utils/maskSecret.js";

test("maskSecret reveals only the last 4 characters", () => {
  assert.equal(maskSecret("sk-abcd1234"), "****1234");
  assert.equal(maskSecret("ab"), "****");
  assert.equal(maskSecret(""), "");
  assert.equal(maskSecret(null), "");
  assert.equal(maskSecret(undefined), "");
});

test("maskSecret never returns the full secret", () => {
  const secret = "super-secret-api-key-value";
  const masked = maskSecret(secret);
  assert.equal(masked.includes(secret), false);
  assert.equal(masked.endsWith("alue"), true);
});
