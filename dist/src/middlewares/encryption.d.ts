import type { Request, Response, NextFunction } from "express";
interface EncryptedBody {
    iv: string;
    content: string;
}
declare const _default: (encrypt: (text: string) => EncryptedBody, decrypt: (data: EncryptedBody) => string) => {
    decryptRequestBody: (req: Request, res: Response, next: NextFunction) => Response | void;
    encryptResponseBody: (req: Request, res: Response, next: NextFunction) => Response | void;
};
export default _default;
//# sourceMappingURL=encryption.d.ts.map