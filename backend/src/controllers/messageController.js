import { flatten } from "flat"
import { StatusCodes } from "http-status-codes"
import { set } from "mongoose"
import { messageService } from "~/services/messageService"

/**
 * API nhận message
 */
// const sendMessage = async (req, res, next) => {
//   try {
//     const userId = req.userId
//     const { conversationId, payload} = req.body
//     const { type, body } = payload

//     if (!conversationId) {
//       return res.status(StatusCodes.BAD_REQUEST).json({ message: 'conversationId is required'})
//     }

//     if (!['text','image','file','notification'].includes(type))
//       return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid type message'})
//     const result = await messageService.sendMessage({
//       userId,
//       conversationId,
//       type,
//       text: body,
//       io: req.io
//     })
//     res.status(StatusCodes.CREATED).json(result)
//   } catch (error) {
//     next(error)
//   }
// }

const sendMessage = async (req, res, next) => {
  try {
    const userId = req.userId
    const { conversationId, type, body } = req.body

    if (!conversationId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "conversationId is required" })
    }

    if (type === "text") {
      if (!body || !body.text) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Text body is required for text messages" })
      }
    } else if (["image", "file", "audio"].includes(type)) {
      if (!req.files) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "File is required for image, file, or audio messages" })
      }
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid message type" })
    }

    const result = await messageService.sendMessage({
      userId,
      conversationId,
      type,
      text: body?.text,
      repliedMessage: body?.repliedMessage,
      file: req.files,   // ⚡ Thêm file vào service
      io: req.io
    })

    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

const setReaction = async (req, res, next) => {
  try {
    const userId = req.userId
    const { messageId, emoji } = req.body
    if (!emoji) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "emoji is required" })
    }
    const result = await messageService.setReaction({ userId, messageId, emoji, io: req.io })
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const removeReaction = async (req, res, next) => {
  try {
    const userId = req.userId
    const { messageId } = req.body
    const result = await messageService.removeReaction({ userId, messageId, io: req.io })
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const listMessages = async(req, res, next) => {
  try {
    const userId = req.userId
    const {conversationId} = req.params
    const limit = Number(req.query.limit ?? 30)
    const beforeSeq = req.query.beforeSeq ? Number(req.query.beforeSeq) : undefined

        if (!conversationId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'conversationId is required' });
    }

    const result = await messageService.listMessages({
      userId,
      conversationId,
      limit,
      beforeSeq
    });
    console.log('List messages result:', result);
    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    next(error)
  }
}

const deleteMessages = async (req, res, next) => {
  try {
    const userId = req.userId
    const { conversationId } = req.params
    const { messageId, action } = req.body

    if (!conversationId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'conversationId is required' 
      })
    }

    if (!messageId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'messageId is required' 
      })
    }

    // Nếu action là recall
    if (action === "recall") {
      const result = await messageService.recallMessage({
        userId,
        messageId,
        io: req.io
      })
      return res.status(StatusCodes.OK).json(result)
    }

    // Nếu action là delete (chỉ ẩn với người thực hiện)
    if (action === "delete") {
      const result = await messageService.deleteMessage({
        userId,
        messageId,
        io: req.io
      })
      return res.status(StatusCodes.OK).json(result)
    }

    return res.status(StatusCodes.BAD_REQUEST).json({ 
      message: "Invalid action. Use 'recall' or 'delete'" 
    })
  } catch (error) {
    next(error)
  }
}

export const messageController = {
  sendMessage,
  listMessages,
  setReaction,
  removeReaction,
  deleteMessages
}