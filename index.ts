import express from "express";

import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import axios from "axios";
import os from "os";
import createCryption from "./src/utils/Encryption.js";
import createCryptionMiddleware from "./src/middlewares/encryption.js";


// Load env variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "2048mb" }));
app.use(express.urlencoded({ limit: "2048mb", extended: true }));
app.use(express.json());

// Extend Express Request type to include clientIp
declare global {
  namespace Express {
    interface Request {
      clientIp?: string;
    }
  }
}
const { encrypt, decrypt } = createCryption(process.env.CRYPTION_KEY || "my32charsecretkey12345678901234");
const { decryptRequestBody, encryptResponseBody } = createCryptionMiddleware(encrypt, decrypt);

app.use(decryptRequestBody);
// app.use(encryptResponseBody);

// Middleware to extract client IP
app.use((req: Request, _res: Response, next: NextFunction) => {
  const clientIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] || // first IP in chain
    req.headers["x-real-ip"]?.toString() ||
    req.socket.remoteAddress ||
    "";

  req.clientIp = clientIp;
  next();
});

// Routes
import actionLogRoute from "./src/routes/actionLogRoute.js";
import newsPaperJobAllocationRoute from "./src/routes/newsPaperJobAllocationRoutes.js";
import dashboardRoute from "./src/routes/dashboardRoutes.js";
import advertisementRoute from "./src/routes/advertisementRoute.js";
import invoiceRequestRoute from "./src/routes/InvoiceRequestRoutes.js";
import approvedAddRoute from "./src/routes/approved_addRoute.js";





app.use("/actionLogs", actionLogRoute);
app.use("/newsPaperJobAllocation", newsPaperJobAllocationRoute);
app.use("/dashboard", dashboardRoute);
app.use("/advertisement", advertisementRoute);
app.use("/invoiceRequest", invoiceRequestRoute);
app.use("/approvedAdd", approvedAddRoute);






// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  const env = process.env.NODE_ENV || "local";

  // Build response payload
  const response = {
    status: "ok",
    message:
      env === "production"
        ? "Server is running healthy in production mode"
        : env === "development"
        ? "Server is running healthy in development mode"
        : "Server is running healthy",
    environment: env,
    uptime: process.uptime(), // seconds since start
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    region: process.env.VERCEL_REGION || process.env.REGION || "unknown",
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + " MB",
    vercel: {
      env: process.env.VERCEL_ENV || "local", // 'production' | 'preview' | 'development'
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF || null,
      deploymentUrl: process.env.VERCEL_URL || null,
      project: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
    },
  };

  res.status(200).json(response);
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
