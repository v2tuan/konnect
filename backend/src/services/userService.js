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

const findById = async (userId, currentUserId) => {
    try {
        // Lấy user theo id
        let user = await User.findById(userId).select('status avatarUrl fullName username dateOfBirth bio id')
        if(!user){
            return null
        }

        const friendship = await FriendShip.findOne({
            $or: [
                {profileRequest: userId, profileAccept: currentUserId},
                {profileRequest: currentUserId, profileAcept: userId}
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
    findById
}