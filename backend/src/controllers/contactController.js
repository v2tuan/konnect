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

const submitRequest = async (req, res, next) => {
  try {
    const requesterUserId = req.userId
    const { toUserId } = req.body || {}
    const result = await contactService.submitRequest({ requesterUserId, receiveUserId: toUserId })
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

const updateStatusRequest = async (req, res, next) => {
  try {
    const actingUserId = req.userId
    const { requestId, action } = req.body || {}
    const result = await contactService.updateStatusRequest({ requestId, action, actingUserId })
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getAllFriends = async (req, res, next) => {
  try {
    const userId = req.userId
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const q = String(req.query.q || "").trim()
    const result = await contactService.getAllFriends({ userId, page, limit, q })
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
export const contactController = {
  getFriendRequests,
  submitRequest,
  updateStatusRequest,
  getAllFriends
}