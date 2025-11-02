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
    const { toUserId } = req.body || {}

    // 1. Gọi service (đã được sửa ở bước 1)
    const result = await contactService.submitRequest({ requesterUserId, receiveUserId: toUserId })

    const commonNotificationData = {
      requestId: result?.requestId,
      requesterId: requesterUserId,
      receiverId: toUserId,
      requesterName: req.user?.fullName || req.user?.username,
      requesterAvatar: req.user?.avatarUrl,
      io: req.io
    }

    if (result.action === 'created') {
      // 2a. Nếu MỚI: Tạo thông báo trong CSDL VÀ phát socket (như cũ)
      await notificationService.notifyFriendRequest(commonNotificationData)

    } else if (result.action === 'bumped') {
      // 2b. Nếu BUMP: Không tạo thông báo mới, chỉ phát socket
      //     để client của người nhận "làm mới" thông báo

      // Chúng ta cần gửi toàn bộ đối tượng thông báo (hoặc ít nhất là ID)
      // Cách 1: (Đơn giản) Chỉ gửi ID và thời gian cập nhật.
      req.io.to(toUserId).emit('notification:bumped', {
        type: 'friend_request',
        requestId: result.requestId, // ID của lời mời kết bạn
        updatedAt: new Date()
      })

      // Cách 2: (Tốt hơn) Tìm thông báo cũ và gửi nó đi
      /* const existingNotification = await Notification.findOneAndUpdate(
        { 'extra.requestId': result.requestId, type: 'friend_request', receiverId: toOid(toUserId) },
        { $set: { status: 'unread', createdAt: new Date() } }, // Đánh dấu là chưa đọc, cập nhật thời gian
        { new: true } // Trả về tài liệu đã cập nhật
      ).lean()

      if (existingNotification) {
         // Gửi toàn bộ đối tượng thông báo đã cập nhật
         req.io.to(toUserId).emit('notification:updated', existingNotification)
      }
      */
    }

    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}
// ...

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