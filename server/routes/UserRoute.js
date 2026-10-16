import express from 'express';
import { getAllUsers, loginUser, registerUser, getLoggedInUser, updateUser, resetUserPassword, changeOwnPassword, deleteUser } from '../controllers/UserController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',          authMiddleware, getAllUsers);
router.post('/login',    loginUser);
router.post('/register', registerUser);
router.get('/me',        authMiddleware, getLoggedInUser);
router.post('/change-password', authMiddleware, changeOwnPassword);
router.put('/:id',       authMiddleware, updateUser);
router.post('/:id/reset-password', authMiddleware, resetUserPassword);
router.delete('/:id',    authMiddleware, deleteUser);

export default router;