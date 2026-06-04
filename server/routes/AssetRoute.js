import express from "express";
import { getAssets, getAssetById, createAsset, addAsset, updateAsset, deleteAsset, restoreAsset, getDeletedAssets } from "../controllers/AssetController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",                authMiddleware, getAssets);
router.get("/deleted",         authMiddleware, getDeletedAssets);
router.get("/:id",             authMiddleware, getAssetById);
router.put("/:id",             authMiddleware, updateAsset);
router.patch("/:id/delete",    authMiddleware, deleteAsset);
router.patch("/:id/restore",   authMiddleware, restoreAsset);
router.post("/create",         authMiddleware, addAsset);

export default router;