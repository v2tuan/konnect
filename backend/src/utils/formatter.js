import mongoose from "mongoose";

export const pickUser = (user) => {
  if (!user) return {}
  return pickUser(user, ['_id', 'phone', 'email', 'avatarUrl', 'fullName', 'dateOfBirth', 'bio', 'createdAt', 'updatedAt'])
}

export const toOid = (v) =>
  v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v));