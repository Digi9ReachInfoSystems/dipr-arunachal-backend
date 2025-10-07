import express from "express";
import { automaticAllocationSendToNewspaper, createAdvertisement, editAdvertisement, getAdvertisementById, manualAllocationSendToNewspaper, } from "../controllers/advertisementController.js";
const router = express.Router();
router.post("/createReleaseOrder", createAdvertisement);
router.get("/getAdvertisements/byId/:id", getAdvertisementById);
router.put("/updateDraftAdvertisement/:id", editAdvertisement);
router.post("/automaticAllocation/sendToNewspaper", automaticAllocationSendToNewspaper);
router.post("/manualAllocation/sendToNewspaper", manualAllocationSendToNewspaper);
export default router;
//# sourceMappingURL=advertisementRoute.js.map