import express from 'express';
import { authController } from '../controllers/authController.js';
import { authValidation } from '../validations/authValidation.js'
import authMiddleware from '../middlewares/authMiddleware.js';
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware.js';

let router = express.Router();

router.post('/login', authController.login);

router.post('/register', authController.signup);

router.post('/logout', authController.logout);

router.put('/update', authMiddleware, multerUploadMiddleware.upload.single('avatar'), authValidation.update, authController.update)

router.post('/logout', authMiddleware, authController.logout);

router.post('/forgot', authController.requestPasswordReset);

router.post('/reset-password', authController.resetPassword);

router.post('/verify-otp', authController.verifyOtp);

export const authRoutes = router