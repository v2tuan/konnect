import express from 'express';
import {signup, login, logout} from '../controllers/authController.js';

let router = express.Router();

router.post('/login', login);

router.post('/register', signup);

router.post('/logout', logout);

export const authRoutes = router