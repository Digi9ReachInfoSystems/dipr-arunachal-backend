import express from "express";
import {
    approveNewspaperJobAllocationByVendor,
    getNewspaperJobAllocationsCount,
    getNewspaperJobAllocationsCountByUser,
    rejectNewspaperJobAllocationByVendor,
    updateApproveCvAndTimeAllotment,
} from "../controllers/newsPaperJobAllocationController.js";


const router = express.Router();


router.post("/updateApproveCvAndTimeAllotment", updateApproveCvAndTimeAllotment);
router.get("/stats/newspaperJobAllocation/count/year/:year", getNewspaperJobAllocationsCount);
router.get("/stats/newspaperJobAllocation/count_by_user/year/:year", getNewspaperJobAllocationsCountByUser);
router.post("/approved/ROByVendor",approveNewspaperJobAllocationByVendor);
router.post("/rejected/ROByVendor",rejectNewspaperJobAllocationByVendor);

export default router;