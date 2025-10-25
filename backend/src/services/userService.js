import { get } from "mongoose"
import FriendShip from "~/models/friendships"
import User from "~/models/user"

const searchByUsername = async (username) => {
    try {
        if(null === username || "" === username.trim()){
            return []
        }
        let result = await User.find({
            username: { $regex: username, $options: "i" }
        }).select("status _id avatarUrl fullName username")
        return result
    }
    catch (error) {
        throw error
    }
}

const getDisplayUsers = async (userIds) => {
    try {
        let users = await User.find({
            _id: { $in: userIds }
        }).select('status avatarUrl fullName username dateOfBirth bio id')
        // console.log('getDisplayUsers', users)
        // console.log('userIds', userIds)
        return users
    }
    catch (e) {
        throw e
    }
}

const markUserStatus = async (userId, update) => {
  try {
    await User.findByIdAndUpdate(userId, { $set: { 'status.isOnline': update.isOnline, 'status.lastActiveAt': update.lastActiveAt } })
  } catch (e) {
    console.error('[presence] DB update failed', e.message)
  }
}

const findById = async (userId, currentUserId) => {
    try {
        // Lấy user theo id
        let user = await User.findById(userId).select('status avatarUrl fullName username dateOfBirth bio id')
        if(!user){
            return null
        }

        const friendship = await FriendShip.findOne({
            $or: [
                {profileRequest: userId, profileReceive: currentUserId},
                {profileRequest: currentUserId, profileReceive: userId}
            ]
        })

        // Convert sang JSON object rồi thêm trường mới
        const userObj = user.toJSON()
        userObj.friendship = friendship

        if(!!!friendship){
            userObj.status = null
        }

        return userObj
    }
    catch (e){
        next(e)
    }
}

export const userService = {
    searchByUsername,
    getDisplayUsers,
    findById,
    markUserStatus
}