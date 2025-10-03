import mongoose from "mongoose";

export const MAX_LIMIT_MESSAGE = 100

export const SYSTEM_USER_ID = new mongoose.Types.ObjectId(
  "000000000000000000000000"
)

export const SYSTEM_SENDER = {
  _id: SYSTEM_USER_ID,
  fullName: "System",
  username: "System",
  avatarUrl: "https://cdn-icons-png.flaticon.com/512/471/471713.png"
}