import User from "../models/userModel.js";
import sendMail from "../lib/sendMailUtil";
import bcrypt from "bcryptjs";
import HttpError from '../error/HttpError';
import { CloudinaryProvider } from "~/providers/CloudinaryProvider";

const ALLOWED_FIELDS = ["fullName", "bio", "dateOfBirth", "phone", "avatarUrl"];

// OTP settings
const OTP_TTL_MS = 10 * 60 * 1000;     // 10 phút
const RESEND_COOLDOWN_MS = 60 * 1000;  // 60 giây
const OTP_MAX_ATTEMPTS = 5;

// ---------------- Utils ----------------
const generateOtp = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) otp += Math.floor(Math.random() * 10);
    return otp;
};

const update = async (userId, data = {}, userAvatarFile) => {
    try {
        const existUser = await User.findById(userId).select("+password");
        if (!existUser) throw new Error("Account not found!");

        const patch = {};

        // 1) Đổi mật khẩu
        if (data.current_password && data.new_password) {
            const ok = bcrypt.compareSync(data.current_password, existUser.password);
            if (!ok) throw new Error("Your password or email is incorrect");
            patch.password = bcrypt.hashSync(data.new_password, 10);
        }
        // 2) Đổi avatar
        else if (userAvatarFile) {
            const upload = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, "users");
            patch.avatarUrl = upload.secure_url;
        }
        // 3) Thông tin chung
        else {
            for (const k of ALLOWED_FIELDS) {
                if (k in data) patch[k] = data[k];
            }
        }

        const updated = await User.findByIdAndUpdate(
            userId,
            { $set: { ...patch, updatedAt: new Date() } },
            { new: true, runValidators: true }
        )
            .select("-password -__v -_destroy")
            .lean();

        if (!updated) throw new Error("Update failed");
        return updated;
    } catch (error) {
        throw new Error(error.message || "Update failed");
    }
};

// ---------------- 1) Gửi OTP (Forgot) ----------------
const requestPasswordReset = async (email) => {
    if (!email) throw new HttpError(400, 'Email is required');
    console.log('email', email);
    const user = await User.findOne({ email });
    if (!user) return; // tránh user enumeration

    const now = Date.now();
    if (user.resetLastSentAt && now - user.resetLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - user.resetLastSentAt.getTime())) / 1000);
        throw new HttpError(429, `Please wait ${waitSec}s before requesting another OTP`);
    }

    const otp = generateOtp(6);             // KHÔNG hash theo yêu cầu
    user.resetOtp = otp;                    // lưu plain
    user.resetOtpExpiresAt = new Date(now + OTP_TTL_MS); // đúng 10 phút
    user.resetOtpAttempts = 0;
    user.resetLastSentAt = new Date(now);
    await user.save();
    console.log('otp', otp);

    const text = `Your password reset OTP is ${otp}. It expires in 10 minutes.`;
    const html = `
    <p>Your password reset OTP is <strong>${otp}</strong>.</p>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p>If you didn’t request this, you can ignore this email.</p>
  `;
    await sendMail(email, 'Password Reset OTP', text, html);
};

const verifyOtp = async (email, otp) => {
    if (!email || !otp) throw new HttpError(400, 'Email and OTP are required');

    const user = await User.findOne({ email });
    if (!user || !user.resetOtp || !user.resetOtpExpiresAt) {
        throw new HttpError(400, 'Invalid or expired OTP');
    }

    // chặn brute force
    if ((user.resetOtpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
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
        user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
        await user.save();
        throw new HttpError(400, 'Invalid OTP');
    }

    // OTP đúng -> có thể reset attempts về 0 (tuỳ chọn)
    user.resetOtpAttempts = 0;
    await user.save();

    // KHÔNG xoá OTP để bước 3 còn dùng
    return { ok: true };
};

const resetPassword = async (email, otp, newPassword) => {
    if (!email || !otp || !newPassword) {
        throw new HttpError(400, 'Email, OTP and newPassword are required');
    }
    if (newPassword.length < 6) {
        throw new HttpError(400, 'Password must be at least 6 characters');
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetOtp || !user.resetOtpExpiresAt) {
        throw new HttpError(400, 'Invalid or expired OTP');
    }

    if ((user.resetOtpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
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
        user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
        await user.save();
        throw new HttpError(400, 'Invalid OTP');
    }

    // OTP hợp lệ → đổi mật khẩu
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(newPassword, salt);

    // clear OTP state sau khi đổi
    user.resetOtp = null;
    user.resetOtpExpiresAt = null;
    user.resetOtpAttempts = 0;
    await user.save();
};

export const authService = {
    update,
    requestPasswordReset,
    verifyOtp,
    resetPassword
};
