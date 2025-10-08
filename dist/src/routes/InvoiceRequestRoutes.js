import express from "express";
import { getInvoiceRequestCount } from "../controllers/InvoiceRequestController.js";
const router = express.Router();
router.get("/stats/invoiceRequest/count/year/:year", getInvoiceRequestCount);
export default router;
//# sourceMappingURL=InvoiceRequestRoutes.js.map