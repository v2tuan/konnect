import bcrypt from "bcryptjs"
import { CloudinaryProvider } from "~/providers/CloudinaryProvider"
import User from "../models/userModel.js"

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

export const authService = { update }
