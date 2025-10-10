import express from "express";
import { createInvoice, editInvoice, getInvoiceRequestCount } from "../controllers/InvoiceRequestController.js";
const router = express.Router();
router.get("/stats/invoiceRequest/count/year/:year", getInvoiceRequestCount);
router.post("/create/invoiceRequest/byVendor", createInvoice);
router.put("/edit/invoiceRequest/byVendor", editInvoice);
export default router;
//# sourceMappingURL=InvoiceRequestRoutes.js.map