import FriendShip from "~/models/friendships";
import User from "~/models/user";
import { toOid } from "~/utils/formatter";

const { Story } = require("~/models/story");
const { cloudinaryProvider } = require("~/providers/CloudinaryProvider_v2");

const createStory = async (storyData) => {
  try {
    // ✅ 1. Kiểm tra dữ liệu đầu vào
    const { userId, background, layers, music, musicStyle, file } = storyData;

    if (!userId || !background) {
      throw new Error("Thiếu thông tin bắt buộc (userId hoặc background).");
    }

    // ✅ 2. Nếu có file ảnh nền, upload lên Cloudinary
    let uploadedMedia = null;
    if (file) {
      const uploaded = await cloudinaryProvider.uploadSingle(file, {
        folder: "stories",
        resource_type: "auto",
      });
      uploadedMedia = {
        url: uploaded.secure_url,
        type: uploaded.resource_type, // image / video
      };
    }

    // ✅ 3. Tạo đối tượng lưu vào MongoDB
    const story = {
      user: userId,
      background: {
        image: uploadedMedia?.url || background.image,
        color: background.color || "#000000",
        scale: background.scale || 1,
        rotation: background.rotation || 0,
        flipped: background.flipped || false,
        position: background.position || { x: 0, y: 0 },
        scaledSize: background.scaledSize || { w: 405, h: 720 },
      },
      layers: Array.isArray(layers) ? layers : [],
      music: music || null,
      musicStyle: musicStyle || "none",
      createdAt: new Date(),
    };

    // ✅ 4. Lưu story vào MongoDB
    const newStory = await Story.create(story);

    return newStory;
  } catch (err) {
    console.error("❌ Lỗi khi tạo story:", err.message);
    throw new Error("Không thể tạo story mới.");
  }
}

const getStoryByUserIds = async (userIds) => {
    // Logic to get stories by user IDs
    return await Story.find({ userId: { $in: userIds } });
}

// Lấy tất cả story mà bạn của người dùng hiện tại có
const getStories = async (userId) => {

}

const getStoriesByFriends = async ({ userId, page = 1, limit = 10 }) => {
  try {
    const uid = toOid(userId);

    // 1️⃣ Lấy danh sách bạn bè đã accepted
    const friendships = await FriendShip.find({
      status: "accepted",
      $or: [{ profileRequest: uid }, { profileReceive: uid }],
    }).lean();

    const friendIds = friendships
      .map(f =>
        String(f.profileRequest) === String(uid)
          ? f.profileReceive
          : f.profileRequest
      )
      .filter(id => String(id) !== String(uid));

    if (!friendIds.length) {
      return { data: [], page, limit, hasNext: false };
    }

    // 2️⃣ Query stories của bạn bè, chỉ lấy trong 24h gần nhất
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const storiesByFriends = await Story.aggregate([
      {
        $match: {
          user: { $in: friendIds.map(toOid) },
          createdAt: { $gte: since },
        },
      },
      { $sort: { createdAt: -1 } },

      // Gom stories theo user
      {
        $group: {
          _id: "$user",
          stories: {
            $push: {
              id: { $toString: "$_id" },
              background: "$background",
              layers: "$layers",
              music: "$music",
              musicStyle: "$musicStyle",
              createdAt: "$createdAt",
            },
          },
        },
      },

      // Join với bảng User để lấy thông tin người đăng
      {
        $lookup: {
          from: User.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                username: 1,
                avatarUrl: 1,
                status: 1,
                _destroy: 1,
              },
            },
            { $match: { _destroy: { $ne: true } } },
          ],
        },
      },

      // Chỉ lấy user còn tồn tại
      { $unwind: "$user" },

      // Sắp xếp theo story mới nhất
      { $sort: { "stories.0.createdAt": -1 } },

      // Phân trang
      { $skip: (page - 1) * limit },
      { $limit: limit },

      // Chuẩn hoá kết quả
      {
        $project: {
          _id: 0,
          user: {
            id: { $toString: "$user._id" },
            fullName: "$user.fullName",
            username: "$user.username",
            avatarUrl: "$user.avatarUrl",
            status: "$user.status",
          },
          stories: "$stories",
        },
      },
    ]).allowDiskUse(true);

    // 3️⃣ Chuẩn hóa kết quả đầu ra
    const data = storiesByFriends.map(item => ({
      user: item.user,
      stories: item.stories || [],
    }));

    return {
      data,
      page,
      limit,
      hasNext: data.length === limit,
    };
  } catch (error) {
    console.error("getStoriesByFriends error:", error);
    throw error;
  }
};


export const storyService = {
    createStory,
    getStoryByUserIds,
    getStoriesByFriends
}