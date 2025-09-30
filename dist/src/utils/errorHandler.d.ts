import type { Response } from "express";
export declare class AppError extends Error {
    statusCode: number;
    details: unknown;
    constructor(message: string, statusCode?: number, details?: unknown);
}
export declare const handleError: (res: Response, error: unknown) => Response;
//# sourceMappingURL=errorHandler.d.ts.map