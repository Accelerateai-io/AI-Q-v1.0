import { test } from "node:test";
import assert from "node:assert/strict";
import { pythonServiceHeaders } from "../src/services/pythonServiceHeaders.js";

test("pythonServiceHeaders omits the key when PY_SERVICE_KEY is unset", () => {
  const prev = process.env.PY_SERVICE_KEY;
  delete process.env.PY_SERVICE_KEY;
  const headers = pythonServiceHeaders({ "Content-Type": "application/json" });
  assert.equal(headers["X-Service-Key"], undefined);
  assert.equal(headers["Content-Type"], "application/json");
  if (prev !== undefined) process.env.PY_SERVICE_KEY = prev;
});

test("pythonServiceHeaders adds X-Service-Key when configured", () => {
  const prev = process.env.PY_SERVICE_KEY;
  process.env.PY_SERVICE_KEY = "shared-secret";
  const headers = pythonServiceHeaders({ Accept: "application/json" });
  assert.equal(headers["X-Service-Key"], "shared-secret");
  assert.equal(headers["Accept"], "application/json");
  if (prev === undefined) delete process.env.PY_SERVICE_KEY;
  else process.env.PY_SERVICE_KEY = prev;
});
