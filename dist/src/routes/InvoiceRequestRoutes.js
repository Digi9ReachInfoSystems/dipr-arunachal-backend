import express from "express";
import { createInvoice, deputyApproveInvoiceRequestPutUp, deputyInvoiceSendBack, editInvoice, getInvoiceRequestCount } from "../controllers/InvoiceRequestController.js";
const router = express.Router();
router.get("/stats/invoiceRequest/count/year/:year", getInvoiceRequestCount);
router.post("/create/invoiceRequest/byVendor", createInvoice);
router.put("/edit/invoiceRequest/byVendor", editInvoice);
router.patch("/sendAgain/invoiceRequest/byDeputy", deputyInvoiceSendBack);
router.patch("/approve/putup/invoiceRequest/byDeputy", deputyApproveInvoiceRequestPutUp);
export default router;
//# sourceMappingURL=InvoiceRequestRoutes.js.map