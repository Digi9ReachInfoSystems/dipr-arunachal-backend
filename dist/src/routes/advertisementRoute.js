import express from "express";
import { automaticAllocationSendToDeputy, automaticAllocationSendToNewspaper, createAdvertisement, editAdvertisement, generateAdvertisementReport, getAdvertisementById, getAdvertisementCountByYear, manualAllocationSendToDeputy, manualAllocationSendToNewspaper, } from "../controllers/advertisementController.js";
const router = express.Router();
router.post("/createReleaseOrder", createAdvertisement);
router.get("/getAdvertisements/byId/:id", getAdvertisementById);
router.put("/updateDraftAdvertisement/:id", editAdvertisement);
router.post("/automaticAllocation/sendToNewspaper", automaticAllocationSendToNewspaper);
router.post("/manualAllocation/sendToNewspaper", manualAllocationSendToNewspaper);
router.post("/automaticAllocation/sendToDeputy", automaticAllocationSendToDeputy);
router.post("/manualAllocation/sendToDeputy", manualAllocationSendToDeputy);
router.post("/advertisement/pdf-report", generateAdvertisementReport);
router.get("/stats/advertisement/count/year/:year", getAdvertisementCountByYear);
export default router;
//# sourceMappingURL=advertisementRoute.js.map