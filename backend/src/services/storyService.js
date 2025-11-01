import FriendShip from "~/models/friendships";
import User from "~/models/user";
import { toOid } from "~/utils/formatter";

const { Story } = require("~/models/story");
const { cloudinaryProvider } = require("~/providers/CloudinaryProvider_v2");

const createStory = async (storyData) => {
    // Logic to create a new story
    // validate storyData
    const { userId, bgColor, music, musicStyle, file } = storyData;
    if (!userId) {
        throw new Error("Invalid story data");
    }
    if (file) {
        const uploaded = await cloudinaryProvider.uploadSingle(file, { folder: "stories" });
        storyData.media = { url: uploaded.secure_url, type: uploaded.resource_type };
    }

    return await Story.create({
        user: userId,
        bgColor: bgColor || "#000000",
        media: storyData.media || null,
        music: music || null,
        musicStyle: musicStyle || "none",
    });
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
        const uid = toOid(userId)

        // Lấy danh sách bạn bè đã accepted
        const friendships = await FriendShip.find({
            status: 'accepted',
            $or: [{ profileRequest: uid }, { profileReceive: uid }]
        }).lean()

        // Trích friendIds (không chứa chính user)
        const friendIds = friendships
            .map(f => (String(f.profileRequest) === String(uid) ? f.profileReceive : f.profileRequest))
            .filter(id => String(id) !== String(uid))

        if (!friendIds.length) {
            return { data: [], page, limit, hasNext: false }
        }

        // Query và group stories theo user
        const storiesByFriends = await Story.aggregate([
            { $match: { user: { $in: friendIds.map(toOid) } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$user',
                    stories: {
                        $push: {
                            id: '$_id',
                            media: '$media',
                            music: '$music',
                            musicStyle: '$musicStyle',
                            bgColor: '$bgColor',
                            createdAt: '$createdAt'
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: User.collection.name,
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                    pipeline: [
                        { $project: { _id: 1, fullName: 1, username: 1, avatarUrl: 1, status: 1, _destroy: 1 } },
                        { $match: { _destroy: { $ne: true } } }
                    ]
                }
            },
            { $unwind: '$user' },
            { $sort: { 'stories.0.createdAt': -1 } }, // Sort theo story mới nhất của từng user
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    user: {
                        id: { $toString: '$user._id' },
                        fullName: '$user.fullName',
                        username: '$user.username',
                        avatarUrl: '$user.avatarUrl'
                    },
                    stories: 1
                }
            }
        ]).allowDiskUse(true)

        const data = storiesByFriends.map(item => ({
            user: item.user,
            stories: item.stories.map(s => ({
                id: String(s.id),
                bgColor: s.bgColor,
                media: s.media || null,
                music: s.music || null,
                musicStyle: s.musicStyle,
                createdAt: s.createdAt
            }))
        }))

        return {
            data,
            page,
            limit,
            hasNext: data.length === limit
        }
    } catch (error) {
        console.error('getStoriesByFriends error:', error)
        throw error
    }
}


export const storyService = {
    createStory,
    getStoryByUserIds,
    getStoriesByFriends
}