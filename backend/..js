const updateProfile = async (userId, data = {}, userAvatarFile) => {
  try {
    const existUser = await User.findById(userId).select("+password"); (1)
    if (!existUser) (2)  throw new Error("Account not found!"); (3)

    const patch = {};  (4)

    // 1) Đổi mật khẩu
    if (data.current_password && data.new_password) (5) {
      const ok = bcrypt.compareSync(data.current_password, existUser.password);    (6)
      if (!ok) (7)
      throw new Error("Your password or email is incorrect");  (8)
      patch.password = bcrypt.hashSync(data.new_password, 10);   (9)
    }
    // 2) Đổi avatar
  else if (userAvatarFile) (10) {
      const upload = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, "users");  (11)
      patch.avatarUrl = upload.secure_url;
    }
    // 3) Thông tin chung
  else {
      patch = Object.fromEntries(
        Object.entries(data).filter(([key]) => (12)  ALLOWED_FIELDS.includes(key))
    );
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      {$set: {...patch, updatedAt: new Date()}},
      {new: true, runValidators: true}
    )
    .select("-password -__v -_destroy")
    .lean();                                             (13)

    if (!updated) (14) throw new Error("Update failed"); (15)
    return updated; (16)
  } catch (error) (17) {
    throw new Error(error.message || "Update failed");    (18)
  }
};