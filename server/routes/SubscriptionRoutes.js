import express from "express";
import { getSubscriptions } from "../controllers/SubscriptionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getSubscriptions);

export default router;