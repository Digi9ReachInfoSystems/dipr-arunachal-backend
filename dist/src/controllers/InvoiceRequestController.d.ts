import type { Request, Response } from "express";
export declare const getInvoiceRequestCount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const editInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deputyInvoiceSendBack: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deputyApproveInvoiceRequestPutUp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deputyApproveInvoiceRequestSendForward: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const assistantApproveInvoiceRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const assistantSubmitInvoiceRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const invoiceAcknowledgeDeputy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=InvoiceRequestController.d.ts.map