import User from "../models/userModel"

const update = async (userId, data) => {
  try {
    const existUser = await User.findById(userId)
    if (!existUser) throw new Error("Account not found!")
    //doi pass (doi thang Tuan no hash password bang bcrypt)
    //doi thong tin binh thuong
    const updateUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: data },
      { new: true }
    )
    return updateUser
  } catch (error) {
    throw new Error(error)
  }
}

export const authService = {
  update
}