import express from 'express';
import {signup, login, logout} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

let router = express.Router();

router.post('/login', login);

router.post('/register', signup);

router.post('/logout', authMiddleware, logout);

export const authRoutes = router