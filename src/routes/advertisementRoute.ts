import express from "express";
import {
    automaticAllocationSendToNewspaper,
    createAdvertisement,
    editAdvertisement,
    getAdvertisementById,
    saveDraftAdvertisement,
}
    from "../controllers/advertisementController.js";

const router = express.Router();
router.post("/createReleaseOrder", createAdvertisement);
router.get("/getAdvertisements/byId/:id",getAdvertisementById);
router.post("/saveDraftAdvertisement", saveDraftAdvertisement);
router.put("/updateDraftAdvertisement/:id", editAdvertisement);
router.post("/automaticAllocation/sendToNewspaper/:id", automaticAllocationSendToNewspaper);
export default router;