import { test } from "node:test";
import assert from "node:assert/strict";
import { requireEnv, missingServerEnv, assertServerEnv } from "../src/config/requireEnv.js";

test("missingServerEnv flags a missing JWT_SECRET_KEY", () => {
  const env = {
    DATABASE_HOST: "db",
    DATABASE_USER: "u",
    DATABASE_PASSWORD: "p",
    DATABASE_NAME: "n",
  } as NodeJS.ProcessEnv;
  assert.deepEqual(missingServerEnv(env), ["JWT_SECRET_KEY"]);
});

test("assertServerEnv throws (boot fails) when JWT_SECRET_KEY is missing", () => {
  const env = {
    DATABASE_HOST: "db",
    DATABASE_USER: "u",
    DATABASE_PASSWORD: "p",
    DATABASE_NAME: "n",
  } as NodeJS.ProcessEnv;
  assert.throws(() => assertServerEnv(env), /JWT_SECRET_KEY/);
});

test("assertServerEnv passes when all required vars are present", () => {
  const env = {
    JWT_SECRET_KEY: "s",
    DATABASE_HOST: "db",
    DATABASE_USER: "u",
    DATABASE_PASSWORD: "p",
    DATABASE_NAME: "n",
  } as NodeJS.ProcessEnv;
  assert.doesNotThrow(() => assertServerEnv(env));
});

test("requireEnv throws on blank values (no silent fallback)", () => {
  const prev = process.env.__TEST_ONLY_VAR__;
  delete process.env.__TEST_ONLY_VAR__;
  assert.throws(() => requireEnv("__TEST_ONLY_VAR__"), /Missing required environment variable/);
  if (prev !== undefined) process.env.__TEST_ONLY_VAR__ = prev;
});
