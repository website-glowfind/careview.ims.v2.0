import express from "express";
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "../controllers/SubscriptionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",       authMiddleware, getSubscriptions);
router.post("/",      authMiddleware, createSubscription);
router.put("/:id",    authMiddleware, updateSubscription);
router.delete("/:id", authMiddleware, deleteSubscription);

export default router;