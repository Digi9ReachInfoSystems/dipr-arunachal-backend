import express from "express";
import {
    updateApproveCvAndTimeAllotment,
} from "../controllers/newsPaperJobAllocationController.js";


const router = express.Router();


router.post("/updateApproveCvAndTimeAllotment", updateApproveCvAndTimeAllotment);



export default router;