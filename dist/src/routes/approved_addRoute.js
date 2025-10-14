import express from "express";
import { createNoteSheet, getApproveAddCount, uploadSanctionletter } from "../controllers/approved_addController.js";
const router = express.Router();
router.get("/stats/approvedAdd/count/year/:year", getApproveAddCount);
router.post("/create/notesheet", createNoteSheet);
router.patch("/upload/sanctionLetter", uploadSanctionletter);
export default router;
//# sourceMappingURL=approved_addRoute.js.map