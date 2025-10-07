import express from "express";
import {
    automaticAllocationSendToNewspaper,
    createAdvertisement,
    editAdvertisement,
    getAdvertisementById,
}
    from "../controllers/advertisementController.js";

const router = express.Router();
router.post("/createReleaseOrder", createAdvertisement);
router.get("/getAdvertisements/byId/:id",getAdvertisementById);
router.put("/updateDraftAdvertisement/:id", editAdvertisement);
router.post("/automaticAllocation/sendToNewspaper", automaticAllocationSendToNewspaper);
export default router;