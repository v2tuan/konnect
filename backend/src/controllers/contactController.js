import { StatusCodes } from "http-status-codes"
import { contactService } from "~/services/contactService"

const getFriendRequests = async (req, res, next) => {
  try {
    const receiveUserId = req.userId
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await contactService.getFriendRequests({ receiveUserId, page, limit})
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const contactController = {
  getFriendRequests
}