import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSessionTokenPayload,
  sessionUserId,
  isInternalContext,
  canManageUserInOrg,
  canDownloadAttestation,
} from "../src/utils/accessControl.js";

test("isSessionTokenPayload accepts a login session token", () => {
  assert.equal(isSessionTokenPayload({ id: 5, email: "a@b.com", userRole: "admin" }), true);
  assert.equal(isSessionTokenPayload({ id: 5, type: "session" }), true);
  assert.equal(sessionUserId({ id: 5 }), 5);
});

test("isSessionTokenPayload rejects an invite token (email only, no id)", () => {
  assert.equal(isSessionTokenPayload({ email: "victim@b.com" }), false);
});

test("isSessionTokenPayload rejects a password-reset token (purpose)", () => {
  assert.equal(isSessionTokenPayload({ email: "x@b.com", purpose: "password_reset", id: 5 }), false);
});

test("isSessionTokenPayload rejects an onboarding token (userId, not id)", () => {
  assert.equal(
    isSessionTokenPayload({ email: "x@b.com", userId: 5, organizationId: 2, organizationType: "vendor" }),
    false,
  );
  assert.equal(isSessionTokenPayload({ userId: 5 }), false);
});

test("isSessionTokenPayload rejects non-objects", () => {
  assert.equal(isSessionTokenPayload(null), false);
  assert.equal(isSessionTokenPayload("token"), false);
  assert.equal(isSessionTokenPayload([1, 2]), false);
});

test("isInternalContext requires org 1 AND a system role", () => {
  assert.equal(isInternalContext({ organizationId: 1, platformRole: "system admin" }), true);
  assert.equal(isInternalContext({ organizationId: 1, platformRole: "system_manager" }), true);
  assert.equal(isInternalContext({ organizationId: 2, platformRole: "system admin" }), false);
  assert.equal(isInternalContext({ organizationId: 1, platformRole: "vendor" }), false);
});

test("canManageUserInOrg lets internal users do anything", () => {
  assert.equal(
    canManageUserInOrg({ isInternal: true, callerOrgId: 1, targetOrgId: 7, targetRole: "system admin" }).allowed,
    true,
  );
});

test("canManageUserInOrg lets a customer admin manage their own org", () => {
  assert.equal(
    canManageUserInOrg({ isInternal: false, callerOrgId: 7, targetOrgId: 7, targetRole: "manager" }).allowed,
    true,
  );
});

test("canManageUserInOrg blocks a customer admin from inviting into org 1", () => {
  const r = canManageUserInOrg({ isInternal: false, callerOrgId: 7, targetOrgId: 1, targetRole: "admin" });
  assert.equal(r.allowed, false);
});

test("canManageUserInOrg blocks cross-org and system-role assignment", () => {
  assert.equal(
    canManageUserInOrg({ isInternal: false, callerOrgId: 7, targetOrgId: 8, targetRole: "manager" }).allowed,
    false,
  );
  assert.equal(
    canManageUserInOrg({ isInternal: false, callerOrgId: 7, targetOrgId: 7, targetRole: "system admin" }).allowed,
    false,
  );
});

test("canDownloadAttestation allows owner org, internal, and buyer-when-visible", () => {
  // internal
  assert.equal(
    canDownloadAttestation({ isInternal: true, callerOrgId: 9, ownerOrgId: 2, callerPlatformRole: "", visibleToBuyer: false }),
    true,
  );
  // owner org
  assert.equal(
    canDownloadAttestation({ isInternal: false, callerOrgId: 2, ownerOrgId: 2, callerPlatformRole: "vendor", visibleToBuyer: false }),
    true,
  );
  // buyer when visible
  assert.equal(
    canDownloadAttestation({ isInternal: false, callerOrgId: 5, ownerOrgId: 2, callerPlatformRole: "buyer", visibleToBuyer: true }),
    true,
  );
});

test("canDownloadAttestation denies cross-org download when not visible / not a buyer", () => {
  assert.equal(
    canDownloadAttestation({ isInternal: false, callerOrgId: 5, ownerOrgId: 2, callerPlatformRole: "buyer", visibleToBuyer: false }),
    false,
  );
  assert.equal(
    canDownloadAttestation({ isInternal: false, callerOrgId: 5, ownerOrgId: 2, callerPlatformRole: "vendor", visibleToBuyer: true }),
    false,
  );
});
