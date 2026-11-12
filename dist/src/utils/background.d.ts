import { type DocumentReference } from "firebase/firestore";
import type { Request, Response, NextFunction } from "express";
export declare const requestContext: (req: Request, res: Response, next: NextFunction) => void;
export declare const addActionLog: (data: object) => DocumentReference;
export declare const runInBackground: (task: () => Promise<unknown>) => void;
export declare const backgroundFetch: (url: string, init?: RequestInit) => void;
//# sourceMappingURL=background.d.ts.map