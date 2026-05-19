import express from 'express';
import departmentController from '../controllers/DepartmentController.js';

const router = express.Router();

// Example route for departments
router.get('/', departmentController.getAllDepartments);
router.post('/', departmentController.createDepartment);

module.exports = router;