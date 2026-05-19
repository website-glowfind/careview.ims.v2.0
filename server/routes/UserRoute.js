import express from 'express';
import { getAllUsers, loginUser, registerUser, getLoggedInUser } from '../controllers/UserController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.get('/', getAllUsers);
router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', authMiddleware, getLoggedInUser);

export default router;