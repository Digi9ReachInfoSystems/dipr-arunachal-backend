import crypto from "crypto";
const algorithm = "aes-256-cbc";
export default (key) => {
    return {
        encrypt: (text) => {
            try {
                const Key = Buffer.from(process.env.CRYPTION_KEY || key, "utf-8");
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv(algorithm, Key, iv);
                const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
                return {
                    iv: iv.toString("hex"),
                    content: encrypted.toString("hex"),
                };
            }
            catch (error) {
                console.error("Encryption error:", error);
                throw error;
            }
        },
        decrypt: (data) => {
            try {
                const Key = Buffer.from(process.env.CRYPTION_KEY || key, "utf-8");
                const iv = Buffer.from(data.iv, "hex");
                const encryptedText = Buffer.from(data.content, "hex");
                const decipher = crypto.createDecipheriv(algorithm, Key, iv);
                const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
                return decrypted.toString("utf8");
            }
            catch (error) {
                console.error("Decryption error:", error);
                throw error;
            }
        },
    };
};
//# sourceMappingURL=Encryption.js.map