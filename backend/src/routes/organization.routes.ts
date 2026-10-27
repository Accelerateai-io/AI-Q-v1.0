import express from "express";
import insertOrganization from "../controllers/organizationsControllers/insertOrg.js";
import fetchOrganizations from "../controllers/organizationsControllers/fetchOrgs.js";
import authenticateToken from "../middlewares/routesProtection.js";
import { requireInternalUser } from "../middlewares/requireInternalUser.js";
import updateOrganization from "../controllers/organizationsControllers/updateOrg.controllers.js";
import archiveOrganization from "../controllers/organizationsControllers/archiveOrg.controller.js";
import fetchOrgOnboarding from "../controllers/organizationsControllers/fetchOrgOnboarding.controller.js";
import getDashboardStats from "../controllers/organizationsControllers/dashboardStats.controller.js";
import listOrgAttestations from "../controllers/organizationsControllers/listOrgAttestations.controller.js";
import getOrgAttestationPreview from "../controllers/organizationsControllers/getOrgAttestationPreview.controller.js";

const orgrouter = express.Router();

orgrouter
.get("/dashboardStats", authenticateToken, getDashboardStats)
// Scoped in-controller to the caller's own org for non-internal users.
.get("/allOrganizations", authenticateToken, fetchOrganizations)
.get("/orgOnboarding/:id", authenticateToken, fetchOrgOnboarding)
// Internal-only: list/preview any org's attestations, create/update/archive orgs.
.get("/orgAttestations/:id", authenticateToken, requireInternalUser, listOrgAttestations)
.get("/orgAttestationPreview/:orgId/:attestationId", authenticateToken, requireInternalUser, getOrgAttestationPreview)
.post("/newOrganization", authenticateToken, requireInternalUser, insertOrganization)
.put(
  "/updateOrganizations/:id",
  authenticateToken,
  requireInternalUser,
  updateOrganization,
)
.patch(
  "/archiveOrganization/:id",
  authenticateToken,
  requireInternalUser,
  archiveOrganization,
);


// orgrouter.get("/orgOnboarding/:id",authenticateToken,onboardingData)

export default orgrouter;
