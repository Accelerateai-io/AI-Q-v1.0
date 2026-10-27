import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSafeUser, SAFE_USER_FIELDS } from "../src/utils/safeUser.js";

test("SAFE_USER_FIELDS never includes user_password", () => {
  assert.equal(SAFE_USER_FIELDS.includes("user_password" as never), false);
});

test("pickSafeUser drops user_password and keeps safe fields", () => {
  const row = {
    id: 3,
    email: "a@b.com",
    organization_id: 7,
    role: "admin",
    user_password: "$2b$10$hashhashhashhashhashhash",
    user_name: "alice",
  };
  const safe = pickSafeUser(row);
  assert.equal("user_password" in safe, false);
  assert.equal(safe.id, 3);
  assert.equal(safe.email, "a@b.com");
  assert.equal(safe.user_name, "alice");
});

test("pickSafeUser handles null", () => {
  assert.deepEqual(pickSafeUser(null), {});
});
