import type { Request, Response } from "express";
export declare const createAdvertisement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAdvertisementById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const saveDraftAdvertisement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const editAdvertisement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const automaticAllocationSendToNewspaper: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=advertisementController.d.ts.map