import express from "express";
import { assistantApproveInvoiceRequest, assistantSubmitInvoiceRequest, createInvoice, deputyApproveInvoiceRequestPutUp, deputyApproveInvoiceRequestSendForward, deputyInvoiceSendBack, editInvoice, getInvoiceRequestCount } from "../controllers/InvoiceRequestController.js";
const router = express.Router();
router.get("/stats/invoiceRequest/count/year/:year", getInvoiceRequestCount);
router.post("/create/invoiceRequest/byVendor", createInvoice);
router.put("/edit/invoiceRequest/byVendor", editInvoice);
router.patch("/sendAgain/invoiceRequest/byDeputy", deputyInvoiceSendBack);
router.patch("/approve/putup/invoiceRequest/byDeputy", deputyApproveInvoiceRequestPutUp);
router.patch("/approve/sendForward/invoiceRequest/byDeputy", deputyApproveInvoiceRequestSendForward);
router.patch("/approve/invoiceRequest/byAssistant", assistantApproveInvoiceRequest);
router.put("/submit/invoiceRequest/byAssistant", assistantSubmitInvoiceRequest);
export default router;
//# sourceMappingURL=InvoiceRequestRoutes.js.map