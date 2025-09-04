import User from "~/models/userModel"

export const searchByUsername = async (username) => {
    try {
        let result = await User.find({
            username: { $regex: username, $options: "i" }
        }).select("status _id avatarUrl fullName username")
        return result
    }
    catch (error) {
        throw error
    }
}