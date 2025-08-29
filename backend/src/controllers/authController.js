import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { generateToken } from '../lib/jwtToken.js';
import sendMail from '../lib/sendMailUtil.js';
import User from '../models/userModel.js';
import { authService } from '../services/authService.js';

// POST /auth/register
let signup = async (req, res) => {
    try {
        let newUser = await authService.createUser(req.body); ////////////////////////////////////////////
        if (newUser) {
            return res.status(201).json({ message: 'User registered successfully' });
        }
        return res.status(500).json({ message: 'Error registering user' });
    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json(error.message || { message: 'Internal server error' });
    }
}

// POST /auth/login
let login = async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user || user._destroy) {
      return res.status(404).json({ message: "User not found" })
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid password" })
    }

    generateToken(user._id, res)

    const userSafe = await User.findById(user._id)
      .select("-password -__v -_destroy")
      .lean()

    return res.status(200).json(userSafe)

  } catch (err) {
    console.error("Error during login:", err)
    return res.status(500).json({ message: "Internal server error" })
  }
}

let logout = (req, res) => {
    try {
        res.clearCookie('token');
        return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const update = async (req, res, next ) => {
    try {
        const userId = req.userId
        console.log('userId: ', userId)
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' })
        }
        const userAvatarFile = req.file
        const updatedUser = await authService.update(userId, req.body, userAvatarFile)
        res.status(StatusCodes.OK).json(updatedUser)
    } catch (error) {
        next(error)
    }
}

// POST /auth/forgot
const requestPasswordReset = async (req, res) => {
    try {
        await authService.requestPasswordReset(req.body.email);
        // Luôn trả 200 (tránh user enumeration)
        return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Internal server error' });
    }
};
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body ?? {};
        await authService.verifyOtp(email, otp);
        return res.status(200).json({ message: 'OTP verified' });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Internal server error' });
    }
};
// POST /auth/reset-password
const resetPassword = async (req, res) => {
    try {
        console.log('[RESET] body=', req.body);
        const { email, otp, newPassword } = req.body ?? {};
        await authService.resetPassword(email, otp, newPassword);
        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Internal server error' });
    }
};

// GET /auth/check
const check = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        return res.status(200).json({authenticated: true});
    }
    catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Internal server error' });
    }
}

export const authController = {
    login,
    signup,
    logout,
    update,
    resetPassword,
    requestPasswordReset,
    check,
    verifyOtp
}