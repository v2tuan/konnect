import express from 'express';
import { authController } from '../controllers/authController.js';
import { authValidation } from '../validations/authValidation.js'
import authMiddleware from '../middlewares/authMiddleware.js';

let router = express.Router();

router.post('/login', authController.login);

router.post('/register', authController.signup);

router.post('/logout', authController.logout);

router.put('/update', authMiddleware, authValidation.update, authController.update)

router.post('/logout', authMiddleware, authController.logout);

export const authRoutes = router