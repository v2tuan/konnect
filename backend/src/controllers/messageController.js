import { flatten } from "flat"
import { StatusCodes } from "http-status-codes"
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
      if (!req.file) {
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
      file: req.file,   // ⚡ Thêm file vào service
      io: req.io
    })

    res.status(StatusCodes.CREATED).json(result)
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
    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    next(error)
  }
}
export const messageController = {
  sendMessage,
  listMessages
}