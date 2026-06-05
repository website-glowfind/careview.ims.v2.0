import express from "express";
import { getLogs, createLog, clearLogs } from "../controllers/ActivityLogController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",       authMiddleware, getLogs);
router.post("/",      authMiddleware, createLog);
router.delete("/",    authMiddleware, clearLogs);

export default router;
