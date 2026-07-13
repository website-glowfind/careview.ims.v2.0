import express from 'express';
import { getAllUsers, loginUser, registerUser, getLoggedInUser, updateUser, deleteUser } from '../controllers/UserController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',          authMiddleware, getAllUsers);
router.post('/login',    loginUser);
router.post('/register', registerUser);
router.get('/me',        authMiddleware, getLoggedInUser);
router.put('/:id',       authMiddleware, updateUser);
router.delete('/:id',    authMiddleware, deleteUser);

export default router;