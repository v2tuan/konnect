import { CloudinaryProvider } from "~/providers/CloudinaryProvider"
import User from "../models/userModel"
import { pickUser } from "~/utils/formatter"

const update = async (userId, data, userAvatarFile) => {
  try {
    const existUser = await User.findById(userId)
    if (!existUser) throw new Error("Account not found!")

    const updatedUser = {}
    //doi pass
    if (data.current_password && data.new_password) {
      if (!bcrypt.compareSync(data.current_password, existUser.password))
        throw new Error('Your password or email is incorrect')
      updatedUser = await User.updateOne(existUser._id, {
        password: bcrypt.hashSync(data.new_password, 10)
      })
    }

    //cap nhat avatar
    else if (userAvatarFile) {
      const uploadResult = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, 'users')

      updatedUser = await User.updateOne(existUser._id, {
        avatarUrl: uploadResult.secure_url
      })
    }

    //doi thong tin binh thuong
    else {
      updatedUser = await User.updateOne(
        { _id: userId },
        { $set: data },
        { new: true }
    )}

    return pickUser(updatedUser)
  } catch (error) {
    throw new Error(error)
  }
}

export const authService = {
  update
}