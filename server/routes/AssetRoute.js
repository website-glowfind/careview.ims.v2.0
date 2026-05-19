import express from "express";
import { getAssets, createAsset, addAsset } from "../controllers/AssetController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAssets);
router.post("/create", authMiddleware, addAsset);

export default router;