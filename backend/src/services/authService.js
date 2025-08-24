import User from "../models/userModel.js"
import sendMail from "../lib/sendMailUtil";
import bcrypt from "bcryptjs";
import HttpError from '../error/HttpError';

const update = async (userId, data) => {
  try {
    const existUser = await User.findById(userId)
    if (existUser) throw new error("Account not found!")
    //doi pass (doi thang Tuan no hash password bang bcrypt)
    //doi thong tin binh thuong
    const updateUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { data } }
    )
    return updateUser
  } catch (error) {
    throw new Error(error)
  }
}
const requestPasswordReset = async (email) => {
    if (!email) throw new HttpError(400, 'Email is required');

    const user = await User.findOne({ email });
    if (!user) return; // tránh user enumeration (route vẫn trả message chung)

    const now = Date.now();
    if (user.resetLastSentAt && now - user.resetLastSentAt.getTime() < 60_000) {
        const waitSec = Math.ceil((60_000 - (now - user.resetLastSentAt.getTime())) / 1000);
        throw new HttpError(429, `Please wait ${waitSec}s before requesting another OTP`);
    }

    const otp = generateOtp(6); // gợi ý: nên lưu hash của OTP
    user.resetOtp = otp;
    user.resetOtpExpiresAt = new Date(now + 50 * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.resetLastSentAt = new Date(now);
    await user.save();

    const text = `Your password reset OTP is ${otp}. It expires in 10 minutes.`;
    const html = `
    <p>Your password reset OTP is <strong>${otp}</strong>.</p>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p>If you didn’t request this, you can ignore this email.</p>
  `;
    await sendMail(email, 'Password Reset OTP', text, html);
};

const resetPassword = async (email, otp, newPassword) => {
    if (!email || !otp || !newPassword) {
        throw new HttpError(400, 'Email, OTP and newPassword are required');
    }

    const user = await User.findOne({ email });
    // vẫn trả message chung ở controller để tránh lộ thông tin
    if (!user || !user.resetOtp || !user.resetOtpExpiresAt) {
        throw new HttpError(400, 'Invalid or expired OTP');
    }

    // chặn brute force
    if ((user.resetOtpAttempts ?? 0) >= 5) {
        throw new HttpError(429, 'Too many attempts. Please request a new OTP');
    }

    const now = Date.now();
    if (now > user.resetOtpExpiresAt.getTime()) {
        user.resetOtp = null;
        user.resetOtpExpiresAt = null;
        user.resetOtpAttempts = 0;
        await user.save();
        throw new HttpError(400, 'OTP expired. Please request a new one');
    }

    if (otp !== user.resetOtp) {
        user.resetOtpAttempts += 1;
        await user.save();
        throw new HttpError(400, 'Invalid OTP');
    }

    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(newPassword, salt);
    user.resetOtp = null;
    user.resetOtpExpiresAt = null;
    user.resetOtpAttempts = 0;
    await user.save();
}
let generateOtp = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
}

export const authService = {
    update,
    requestPasswordReset,
    resetPassword

}