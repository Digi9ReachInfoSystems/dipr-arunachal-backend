import type { Request, Response } from "express";
export declare const createActionLog: (req: Request, res: Response) => Promise<void>;
export declare const getAllActionLogs: (req: Request, res: Response) => Promise<void>;
export declare const getActionLogById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteActionLog: (req: Request, res: Response) => Promise<void>;
export declare const getSuccessFailureActionlogCounts: (req: Request, res: Response) => Promise<void>;
export declare const getSuccessFailureActionlogCountsByYear: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSuccessFailureActionlogCountsByPlatformAndYear: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSuccessFailureActionlogCountsByAllocationTypeAndYear: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=actionLogController.d.ts.map