import express from "express";
import authenticateToken from "../middlewares/routesProtection.js";
import {
  getLlmModelHandler,
  setLlmModelHandler,
  testLlmModelHandler,
} from "../controllers/admin/llmModel.controller.js";
import {
  getAiRiskApiKeyHandler,
  setAiRiskApiKeyHandler,
} from "../controllers/admin/aiRiskApiKey.controller.js";
import {
  getLlmUsageByIdHandler,
  getLlmUsageEventsHandler,
  getLlmUsageHandler,
} from "../controllers/admin/observability.controller.js";
import {
  getOrgTokenConfigHandler,
  getOrgUsageHandler,
  putOrgTokenConfigHandler,
} from "../controllers/admin/orgControls.controller.js";
import {
  getAdminNotificationsHandler,
  markAdminNotificationReadHandler,
  markAllAdminNotificationsReadHandler,
} from "../controllers/admin/adminNotifications.controller.js";

const adminRouter = express.Router();

adminRouter.get(
  "/services/llm-model",
  authenticateToken,
  getLlmModelHandler,
);

adminRouter.put(
  "/services/llm-model",
  authenticateToken,
  setLlmModelHandler,
);

adminRouter.post(
  "/services/llm-model/test",
  authenticateToken,
  testLlmModelHandler,
);

adminRouter.get(
  "/services/ai-risk-api-key",
  authenticateToken,
  getAiRiskApiKeyHandler,
);

adminRouter.put(
  "/services/ai-risk-api-key",
  authenticateToken,
  setAiRiskApiKeyHandler,
);

adminRouter.get(
  "/services/llm-usage",
  authenticateToken,
  getLlmUsageHandler,
);

adminRouter.get(
  "/services/llm-usage/:id/events",
  authenticateToken,
  getLlmUsageEventsHandler,
);

adminRouter.get(
  "/services/llm-usage/:id",
  authenticateToken,
  getLlmUsageByIdHandler,
);

adminRouter.get(
  "/services/org-usage/:organizationId",
  authenticateToken,
  getOrgUsageHandler,
);

adminRouter.get(
  "/services/org-token-config/:organizationId",
  authenticateToken,
  getOrgTokenConfigHandler,
);

adminRouter.put(
  "/services/org-token-config/:organizationId",
  authenticateToken,
  putOrgTokenConfigHandler,
);

adminRouter.get(
  "/services/notifications",
  authenticateToken,
  getAdminNotificationsHandler,
);

adminRouter.post(
  "/services/notifications/read-all",
  authenticateToken,
  markAllAdminNotificationsReadHandler,
);

adminRouter.patch(
  "/services/notifications/:id/read",
  authenticateToken,
  markAdminNotificationReadHandler,
);

export default adminRouter;
