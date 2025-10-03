import express from "express";
import { createAdvertisement, getAdvertisementById, } from "../controllers/advertisementController.js";
const router = express.Router();
router.post("/createReleaseOrder", createAdvertisement);
router.get("/getAdvertisements/byId/:id", getAdvertisementById);
export default router;
//# sourceMappingURL=advertisementRoute.js.map