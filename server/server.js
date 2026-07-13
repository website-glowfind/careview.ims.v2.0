import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/UserRoute.js";
import subscriptionRoute from "./routes/SubscriptionRoutes.js";
import assetRoute from "./routes/AssetRoute.js";
import activityLogRoute from "./routes/ActivityLogRoute.js";
import employeeRoute from "./routes/EmployeeRoute.js";
import formRecordRoute from "./routes/FormRecordRoute.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = process.env.NODE_ENV === "production"
  ? false
  : ["http://localhost:5173"];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// app.use('/api/v1/departments', departmentRoute);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/subscriptions', subscriptionRoute);
app.use('/api/v1/assets', assetRoute);
app.use('/api/v1/activity-log', activityLogRoute);
app.use('/api/v1/employees',   employeeRoute);
app.use('/api/v1/form-records', formRecordRoute);

// Serve React build
import { existsSync } from "fs";
const clientDist = path.join(__dirname, "../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    const server = app.listen(PORT, () =>
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
    );

    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        console.log("💤 Process terminated");
      });
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });