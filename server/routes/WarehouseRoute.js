import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getMeta, getItems, createItem, updateItem, importWorkbook, bulkImport } from "../controllers/WarehouseController.js";

const router = express.Router();

router.get("/meta", authMiddleware, getMeta);
router.get("/items", authMiddleware, getItems);
router.post("/items", authMiddleware, createItem);
router.post("/items/bulk", authMiddleware, bulkImport);
router.put("/items/:id", authMiddleware, updateItem);
router.post("/import-workbook", authMiddleware, importWorkbook);

export default router;
