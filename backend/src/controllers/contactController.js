import {StatusCodes} from "http-status-codes"
import {contactService} from "~/services/contactService"
import {notificationService} from "~/services/notificationService";

const getFriendRequests = async (req, res, next) => {
  try {
    const receiveUserId = req.userId
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await contactService.getFriendRequests({receiveUserId, page, limit})
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const submitRequest = async (req, res, next) => {
  try {
    const requesterUserId = req.userId
    const {toUserId} = req.body || {}
    const result = await contactService.submitRequest({requesterUserId, receiveUserId: toUserId})

    // ✅ SỬA LẠI Ở ĐÂY:
    // Thêm `receiverId` và các thông tin khác của người gửi
    await notificationService.notifyFriendRequest({
      requestId: result?.requestId || result?.data?.requestId || result?._id,
      requesterId: requesterUserId,
      receiverId: toUserId, // ⬅️ THÊM DÒNG NÀY

      // (Khuyến nghị) Gửi thêm tên + avatar người gửi nếu có
      // req.user này được thêm từ middleware xác thực
      requesterName: req.user?.fullName || req.user?.username,
      requesterAvatar: req.user?.avatarUrl,

      io: req.io
    })

    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

const updateStatusRequest = async (req, res, next) => {
  try {
    const actingUserId = req.userId
    const {requestId, action} = req.body || {}
    const result = await contactService.updateStatusRequest({requestId, action, actingUserId})
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
    const result = await contactService.getAllFriends({userId, page, limit, q})
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const removeFriend = async (req, res, next) => {
  try {
    const userId = req.userId
    const friendUserId = req.params.friendUserId || req.body?.friendUserId
    const result = await contactService.removeFriend({ userId, friendUserId })
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
export const contactController = {
  getFriendRequests,
  submitRequest,
  updateStatusRequest,
  getAllFriends,
  removeFriend
}