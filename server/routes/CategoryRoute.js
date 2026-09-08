import express from "express";
import { getCategories, createCategory, deleteCategory } from "../controllers/CategoryController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",       authMiddleware, getCategories);
router.post("/",      authMiddleware, createCategory);
router.delete("/:id", authMiddleware, deleteCategory);

export default router;
