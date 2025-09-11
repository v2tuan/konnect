import { StatusCodes } from "http-status-codes"
import { messageService } from "~/services/messageService"

const sendMessage = async (req, res, next) => {
  try {
    const userId = req.userId
    const { conversationId, type='text', text=''} = req.body

    if (!conversationId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'conversationId is required'})
    }

    if (!['text','image','file','notification'].includes(type))
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid type message'})
    const result = await messageService.sendMessage({
      userId,
      conversationId,
      type,
      text,
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