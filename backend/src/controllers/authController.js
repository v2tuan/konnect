import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import sendMail from '../lib/sendMailUtil.js';
import mongoose from 'mongoose';
import { generateToken } from '../lib/jwtToken.js';
import { authService } from '../services/authService.js';
import { StatusCode } from 'http-status-codes'

let signup = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { phone, email, password, fullName, dateOfBirth } = req.body;
        if (!email || !password || !fullName || !dateOfBirth) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        const newUser = new User({
            phone,
            email,
            password: hashedPassword,
            fullName,
            dateOfBirth
        });

        if (newUser) {
            session.startTransaction();
            await newUser.save({ session: session });
            const otp = generateOtp();
            const text = `Your OTP is ${otp}. Please use this to complete your registration.`;
            const htmlContent = `Your OTP is <strong>${otp}</strong>. Please use this to complete your registration.`;
            await sendMail(email, 'OTP for Registration', text, htmlContent);
            await session.commitTransaction();
            return res.status(201).json({ message: 'User registered successfully' });
        }
        await session.endSession();
        return res.status(500).json({ message: 'Error registering user' });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error during registration:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

let generateOtp = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
}

let login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        generateToken(user._id, res);

        return res.status(200).json({
            message: 'Login successful',
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error' });
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
        const userId = req.cookies.jwt._id
        const updatedUser = await authService.update(userId, req.body)
        res.status(StatusCode.OK).json(updatedUser)
    } catch (error) {
        next(error)
    }
}
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    // Luôn trả 200 để tránh user enumeration
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
    }

    // Chống spam gửi OTP: cách lần gửi gần nhất >= 60s
    const now = Date.now();
    if (user.resetLastSentAt && (now - user.resetLastSentAt.getTime()) < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - user.resetLastSentAt.getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSec}s before requesting another OTP` });
    }

    const otp = generateOtp(6);
    user.resetOtp = otp;
    user.resetOtpExpiresAt = new Date(now + 10 * 60 * 1000); // 10 phút
    user.resetOtpAttempts = 0; // reset lại số lần thử
    user.resetLastSentAt = new Date(now);
    await user.save();

    const text = `Your password reset OTP is ${otp}. It expires in 10 minutes.`;
    const htmlContent = `
      <p>Your password reset OTP is <strong>${otp}</strong>.</p>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you didn’t request this, you can ignore this email.</p>
    `;
    await sendMail(email, 'Password Reset OTP', text, htmlContent);

    return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
  } catch (err) {
    console.error('requestPasswordReset error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /auth/reset-password
 * Body: { email: string, otp: string, newPassword: string }
 * Kiểm tra OTP (đúng + chưa hết hạn + chưa vượt quá 5 lần sai), sau đó cập nhật mật khẩu.
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP and newPassword are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetOtp || !user.resetOtpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Quá 5 lần nhập sai thì khoá OTP
    if (user.resetOtpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many attempts. Please request a new OTP' });
    }

    // Hết hạn
    const now = Date.now();
    if (now > user.resetOtpExpiresAt.getTime()) {
      // clear OTP
      user.resetOtp = null;
      user.resetOtpExpiresAt = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'OTP expired. Please request a new one' });
    }

    // Sai OTP?
    if (otp !== user.resetOtp) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP đúng -> cập nhật mật khẩu
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);
    user.password = hashedPassword;

    // clear OTP fields
    user.resetOtp = null;
    user.resetOtpExpiresAt = null;
    user.resetOtpAttempts = 0;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const authController = {
    login,
    signup,
    generateOtp,
    logout,
    update,
    requestPasswordReset,
    resetPassword
}