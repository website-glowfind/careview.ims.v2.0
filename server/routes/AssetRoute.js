import express from "express";
import { getAssets, getAssetById, createAsset, addAsset, updateAsset } from "../controllers/AssetController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAssets);
router.get("/:id", authMiddleware, getAssetById);
router.put("/:id", authMiddleware, updateAsset);
router.post("/create", authMiddleware, addAsset);

export default router;