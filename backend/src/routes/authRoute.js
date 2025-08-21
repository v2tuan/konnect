import express from 'express';
import { authController } from '../controllers/authController.js';
import { authValidation } from '../validations/authValidation.js'
let router = express.Router();

router.post('/login', authController.login);

router.post('/register', authController.signup);

router.post('/logout', authController.logout);

router.put('/update', authValidation.update, authController.update)

export const authRoutes = router