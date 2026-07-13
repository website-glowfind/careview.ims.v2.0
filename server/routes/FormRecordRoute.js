import express from "express";
import { getFormRecords, createFormRecord, deleteFormRecord } from "../controllers/FormRecordController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",       authMiddleware, getFormRecords);
router.post("/",      authMiddleware, createFormRecord);
router.delete("/:id", authMiddleware, deleteFormRecord);

export default router;
