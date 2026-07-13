import express from "express";
import { getEmployees, bulkImport, updateEmployee, deleteEmployee } from "../controllers/EmployeeController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/",           authMiddleware, getEmployees);
router.post("/bulk",      authMiddleware, bulkImport);
router.put("/:id",        authMiddleware, updateEmployee);
router.delete("/:id",     authMiddleware, deleteEmployee);

export default router;
