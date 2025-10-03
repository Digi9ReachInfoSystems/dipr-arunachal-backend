import express from "express";

import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import axios from "axios";

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







app.use("/actionLogs", actionLogRoute);
app.use("/newsPaperJobAllocation", newsPaperJobAllocationRoute);
app.use("/dashboard", dashboardRoute);
app.use("/advertisement", advertisementRoute);





// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  if (process.env.NODE_ENV == 'production') {
    res.send("Server is running healthy  in production mode");
    return;
  } else if (process.env.NODE_ENV == 'development') {
    res.send("Server is running healthy  in development mode");
  } else {
    res.send("Server is running healthy ");
  } 
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
