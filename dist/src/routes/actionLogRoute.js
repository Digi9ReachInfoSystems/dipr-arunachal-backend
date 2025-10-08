import express from "express";
import { createActionLog, getAllActionLogs, getActionLogById, deleteActionLog, getSuccessFailureActionlogCounts, getSuccessFailureActionlogCountsByPlatformAndYear, getSuccessFailureActionlogCountsByAllocationTypeAndYear, getSuccessFailureActionlogCountsByYear } from "../controllers/actionLogController.js";
const router = express.Router();
router.post("/", createActionLog);
router.get("/all", getAllActionLogs);
router.get("/byId/:id", getActionLogById);
router.delete("/byId/:id", deleteActionLog);
router.get("/stats/success-failure/count", getSuccessFailureActionlogCounts);
router.get("/stats/success-failure/count/year/:year", getSuccessFailureActionlogCountsByYear);
router.get("/stats/success-failure/count/byPlatform/year/:year", getSuccessFailureActionlogCountsByPlatformAndYear);
router.get("/stats/success-failure/count/byAllocationType/year/:year", getSuccessFailureActionlogCountsByAllocationTypeAndYear);
export default router;
//# sourceMappingURL=actionLogRoute.js.map