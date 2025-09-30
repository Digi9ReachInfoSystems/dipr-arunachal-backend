import express from "express";
import {
  createActionLog,
  getAllActionLogs,
  getActionLogById,
  deleteActionLog
} from "../controllers/actionLogController.js";

const router = express.Router();

router.post("/", createActionLog);
router.get("/all", getAllActionLogs);
router.get("/byId/:id", getActionLogById);
router.delete("/byId/:id", deleteActionLog);

export default router;
