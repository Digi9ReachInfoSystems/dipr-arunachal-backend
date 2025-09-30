import dotenv from "dotenv";
dotenv.config();
function requireEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
}
const config = {
    port: Number(process.env.PORT) || 5000,
    firebaseConfig: {
        apiKey: requireEnv("API_KEY"),
        authDomain: requireEnv("AUTH_DOMAIN"),
        projectId: requireEnv("PROJECT_ID"),
        storageBucket: requireEnv("STORAGE_BUCKET"),
        messagingSenderId: requireEnv("MESSAGING_SENDER_ID"),
        appId: requireEnv("APP_ID"),
    },
};
export default config;
//# sourceMappingURL=config.js.map