import express from "express";
import { getEmployees, bulkImport, deleteEmployee } from "../controllers/EmployeeController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",           authMiddleware, getEmployees);
router.post("/bulk",      authMiddleware, bulkImport);
router.delete("/:id",     authMiddleware, deleteEmployee);

export default router;
