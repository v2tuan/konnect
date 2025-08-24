import User from "../models/userModel.js"
import sendMail from "../lib/sendMailUtil";
import bcrypt from "bcryptjs";
import HttpError from '../error/HttpError';
import { CloudinaryProvider } from "~/providers/CloudinaryProvider"

const ALLOWED_FIELDS = ["fullName", "bio", "dateOfBirth", "phone", "avatarUrl"]

const update = async (userId, data = {}, userAvatarFile) => {
  try {
    const existUser = await User.findById(userId).select("+password")
    if (!existUser) throw new Error("Account not found!")

    const patch = {}

    // 1) Đổi mật khẩu
    if (data.current_password && data.new_password) {
      const ok = bcrypt.compareSync(data.current_password, existUser.password)
      if (!ok) throw new Error("Your password or email is incorrect")
      patch.password = bcrypt.hashSync(data.new_password, 10)
    }
    // 2) Đổi avatar
    else if (userAvatarFile) {
      const upload = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, "users")
      patch.avatarUrl = upload.secure_url // đúng tên field trong schema
    }
    // 3) Cập nhật thông tin chung
    else {
      for (const k of ALLOWED_FIELDS) {
        if (k in data) patch[k] = data[k]
      }
    }

    // Cập nhật và LẤY document sau update
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true, runValidators: true }
    )
      .select("-password -__v -_destroy")
      .lean() // trả về POJO, FE gán thẳng vào Redux

    if (!updated) throw new Error("Update failed")
    return updated
  } catch (error) {
    throw new Error(error.message || "Update failed")
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