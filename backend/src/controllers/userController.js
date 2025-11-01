import { StatusCodes } from "http-status-codes"
import Conversation from "~/models/conversations"
import FriendShip from "~/models/friendships"
import { conversationService } from "~/services/conversationService"
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

const getDisplayUsers = async (req, res, next) => {
    try {
        let userIds = req.body.userIds
        const users = await userService.getDisplayUsers(userIds)
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

const selectedUser = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const currentUserId = req.userId
    const user = await userService.findById(userId, req.userId)
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "No user found" })

    let conversation = await Conversation.findOne({
      $or: [
        { 'direct.userA': currentUserId, 'direct.userB': userId },
        { 'direct.userA': userId, 'direct.userB': currentUserId }
      ]
    })

    if (!conversation) {
      const conversationDataToCreate = { type: 'direct', memberIds: [currentUserId, userId] }
      // CHANGED: truyền req.io
      conversation = await conversationService.createConversation(conversationDataToCreate, null, currentUserId, req.io)
    }

    const conversationData = {
      id: conversation._id,
      type: conversation.type,
      lastMessage: conversation.lastMessage,
      messageSeq: conversation.messageSeq,
      updatedAt: conversation.updatedAt,
      direct: {
        otherUser: {
          id: user._id,
          fullName: user.fullName,
          userName: user.username,
          avatarUrl: user.avatarUrl,
          status: user.status,
          friendship: user.friendship ? true : false
        }
      },
      displayName: user.fullName,
      conversationAvatarUrl: user.avatarUrl
    }

    res.status(StatusCodes.OK).json({ data: conversationData })
  } catch (error) {
    next(error)
  }
}

const searchUserById = async (req, res, next) => {
    try {
        let { userId } = req.query
        const user = await userService.findById(userId, req.userId)
        if (user) {
            res.json(user)
        }
        else {
            res.status(StatusCodes.NOT_FOUND).json({
                message: "No user found"
            })
        }
    }
    catch (error) {
        next(error)
    }
}

export const userController = {
    searchUser,
    getDisplayUsers,
    searchUserById,
    selectedUser
}