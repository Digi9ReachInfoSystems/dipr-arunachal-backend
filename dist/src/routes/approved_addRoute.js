import express from "express";
import { getApproveAddCount } from "../controllers/approved_addController.js";
const router = express.Router();
router.get("/stats/approvedAdd/count/year/:year", getApproveAddCount);
export default router;
//# sourceMappingURL=approved_addRoute.js.map