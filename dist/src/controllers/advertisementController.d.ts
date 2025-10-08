import type { Request, Response } from "express";
export declare const createAdvertisement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAdvertisementById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const editAdvertisement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const automaticAllocationSendToNewspaper: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const manualAllocationSendToNewspaper: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const automaticAllocationSendToDeputy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const manualAllocationSendToDeputy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Generate Advertisement PDF report for a given date range
 */
export declare const generateAdvertisementReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=advertisementController.d.ts.map