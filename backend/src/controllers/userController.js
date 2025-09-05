import { StatusCodes } from "http-status-codes"
import { userService } from "~/services/userService"

const searchUser = async (req, res, next) => {
    try {
        let { keyword } = req.query
        const users = await userService.searchByUsername(keyword)
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

const searchUserById = async (req, res, next) => {
    try{
        let {userId} = req.query
        const user = await userService.findById(userId, req.userId)
        if(user){
            res.json(user)
        }
        else{
            res.status(StatusCodes.NOT_FOUND).json({
                message: "No user found"
            })
        }
    }
    catch(error){
        next(error)
    }
}

export const userController = {
    searchUser,
    searchUserById
}