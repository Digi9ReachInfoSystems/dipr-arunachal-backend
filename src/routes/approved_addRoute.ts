import express from "express";
import { createNoteSheet, getApproveAddCount } from "../controllers/approved_addController.js";


const router = express.Router();

router.get("/stats/approvedAdd/count/year/:year",getApproveAddCount);
router.post("/create/notesheet",createNoteSheet);
export default router;