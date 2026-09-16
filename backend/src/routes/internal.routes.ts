/**
 * Internal-only routes.
 *
 * NEVER add these routes to a buyer or vendor router.
 * All routes here require:
 *   1. authenticateToken  — valid JWT
 *   2. requireInternalUser — org_id = 1 + system platform role
 *
 * These routes must never appear in any buyer/vendor-facing API documentation.
 */

import express from "express";
import authenticateToken from "../middlewares/routesProtection.js";
import { requireInternalUser } from "../middlewares/requireInternalUser.js";
import {
  getIrsScoreTrace,
  getVtsScoreTrace,
  getScsScoreTrace,
} from "../controllers/internal/getScoreTrace.controller.js";

const internalRouter = express.Router();

internalRouter.get(
  "/internal/score-trace/irs/:assessmentId",
  authenticateToken,
  requireInternalUser,
  getIrsScoreTrace,
);

internalRouter.get(
  "/internal/score-trace/vts/:reportId",
  authenticateToken,
  requireInternalUser,
  getVtsScoreTrace,
);

internalRouter.get(
  "/internal/score-trace/scs/:assessmentId",
  authenticateToken,
  requireInternalUser,
  getScsScoreTrace,
);

export default internalRouter;
