import express from "express";
import { assistantApproveInvoiceRequest, assistantSubmitInvoiceRequest, createInvoice, deputyApproveInvoiceRequestPutUp, deputyApproveInvoiceRequestSendForward, deputyInvoiceSendBack, editInvoice, getInvoiceRequestCount, invoiceNoteSheetAcknowledgeDeputy, invoiceNoteSheetAcknowledgeDirector, invoiceNoteSheetAcknowledgeIsSc, invoiceNoteSheetAcknowledgeUnderSecratory, invoiceNoteSheetRejectDeputy, invoiceNoteSheetRejectDirector, invoiceNoteSheetRejectFao, invoiceNoteSheetRejectIsSc, invoiceNoteSheetRejectUnderSecratory } from "../controllers/InvoiceRequestController.js";



const router = express.Router();

router.get("/stats/invoiceRequest/count/year/:year",getInvoiceRequestCount);
router.post("/create/invoiceRequest/byVendor",createInvoice);
router.put("/edit/invoiceRequest/byVendor",editInvoice);
router.patch("/sendAgain/invoiceRequest/byDeputy",deputyInvoiceSendBack);
router.patch("/approve/putup/invoiceRequest/byDeputy",deputyApproveInvoiceRequestPutUp);
router.patch("/approve/sendForward/invoiceRequest/byDeputy",deputyApproveInvoiceRequestSendForward);
router.patch("/approve/invoiceRequest/byAssistant",assistantApproveInvoiceRequest);
router.put("/submit/invoiceRequest/byAssistant",assistantSubmitInvoiceRequest);
router.patch("/approve/noteSheet/byDeputy",invoiceNoteSheetAcknowledgeDeputy);
router.patch("/approve/noteSheet/byDirector",invoiceNoteSheetAcknowledgeDirector);
router.patch("/approve/noteSheet/byUnderSecratory",invoiceNoteSheetAcknowledgeUnderSecratory);
router.patch("/approve/noteSheet/byIsSc",invoiceNoteSheetAcknowledgeIsSc);
router.patch("/reject/noteSheet/byDeputy",invoiceNoteSheetRejectDeputy);
router.patch("/reject/noteSheet/byDirector",invoiceNoteSheetRejectDirector);
router.patch("/reject/noteSheet/byUnderSecratory",invoiceNoteSheetRejectUnderSecratory);
router.patch("/reject/noteSheet/byIsSc",invoiceNoteSheetRejectIsSc);
router.patch("/reject/noteSheet/byFao",invoiceNoteSheetRejectFao);
export default router;