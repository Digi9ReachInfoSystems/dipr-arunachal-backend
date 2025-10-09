import type e from "express";
import type { Request, Response } from "express";
export declare const updateApproveCvAndTimeAllotment: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const getNewspaperJobAllocationsCount: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const getNewspaperJobAllocationsCountByUser: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>>>;
export declare const approveNewspaperJobAllocationByVendor: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const rejectNewspaperJobAllocationByVendor: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=newsPaperJobAllocationController.d.ts.map