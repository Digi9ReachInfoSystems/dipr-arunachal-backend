import express from "express";
import {
    getNewspaperJobAllocationsCount,
    getNewspaperJobAllocationsCountByUser,
    updateApproveCvAndTimeAllotment,
} from "../controllers/newsPaperJobAllocationController.js";


const router = express.Router();


router.post("/updateApproveCvAndTimeAllotment", updateApproveCvAndTimeAllotment);
router.get("/stats/newspaperJobAllocation/count/year/:year", getNewspaperJobAllocationsCount);
router.get("/stats/newspaperJobAllocation/count_by_user/year/:year", getNewspaperJobAllocationsCountByUser);

export default router;