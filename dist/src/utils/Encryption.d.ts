export interface EncryptedData {
    iv: string;
    content: string;
}
declare const _default: (key: string) => {
    encrypt: (text: string) => EncryptedData;
    decrypt: (data: EncryptedData) => string;
};
export default _default;
//# sourceMappingURL=Encryption.d.ts.map