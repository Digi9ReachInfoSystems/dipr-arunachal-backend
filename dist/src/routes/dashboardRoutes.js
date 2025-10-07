import express from "express";
import { getDashboardStats, getDetailsByIp } from "../controllers/dashboardController.js";
const router = express.Router();
router.get("/stats", getDashboardStats);
router.get("/details/:ip", getDetailsByIp);
export default router;
//# sourceMappingURL=dashboardRoutes.js.map