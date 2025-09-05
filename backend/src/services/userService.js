import User from "~/models/user"

export const searchByUsername = async (username) => {
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