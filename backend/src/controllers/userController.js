import { searchByUsername } from "~/services/userService"

const searchUser = async (req, res, next) => {
    try {
        let { keyword } = req.query
        const users = await searchByUsername(keyword)
        if (users.length !== 0) {
            res.json(users)
        }
        else {
            res.status(404).json({
                message: "No users found"
            })
        }
    }
    catch (error) {
        next(error)
    }
}

export const userController = {
    searchUser
}