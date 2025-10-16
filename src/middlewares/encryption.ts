import type {
    Request,
    Response,
    NextFunction
} from "express";

interface EncryptedBody {
    iv: string;
    content: string;
}

export default (encrypt: (text: string) => EncryptedBody, decrypt: (data: EncryptedBody) => string) => {
    return {
        decryptRequestBody: (req: Request, res: Response, next: NextFunction): Response | void => {
            const excludedRoutes = ["/api/webhooks/zoom-webhook"];
            // console.log("🟡 Decrypting request body for:", req.path);
            // console.log("🟡 Request body:", req.body);  
            if (excludedRoutes.some((route) => req.path.startsWith(route))) {
                // console.log("🟡 Skipping decryption for:", req.path);
                return next();
            }

            if (req.headers.api_key === process.env.FLUTTER_API_KEY) {
                return next();
            }

            if (req.body) {
                if (req.body?.encryptedBody) {
                    try {
                        const decrypted = decrypt(req.body.encryptedBody);
                        req.body = JSON.parse(decrypted);
                    } catch (error) {
                        console.error("❌ Decryption failed:", error);
                        return res.status(400).send("Decryption failed");
                    }
                } else {
                    return res.status(400).send("Decryption failed");
                }
            }

            next();
        },

        encryptResponseBody: (req: Request, res: Response, next: NextFunction): Response | void => {
            const oldJson = res.json.bind(res);

            res.json = (body: any): Response => {
                const excludedRoutes = ["/api/webhooks/zoom-webhook"];
                // console.log("🟡 Encrypting response body for:", req.path);
                // console.log("🟡 Response body:", body);

                if (excludedRoutes.some((route) => req.path.startsWith(route))) {
                    return oldJson(body);
                }

                if (req.headers.api_key === process.env.FLUTTER_API_KEY) {
                    return oldJson(body);
                }

                try {
                    const encryptedBody = encrypt(JSON.stringify(body));

                    return oldJson({ encryptedBody, dataEncrypted: "true" });
                } catch (error) {
                    console.error("❌ Encryption failed:", error);
                    return oldJson({
                        success: false,
                        message: "Encryption failed",
                        error: (error as Error).message,
                    });
                }
            };

            next();
        },
    };
};
