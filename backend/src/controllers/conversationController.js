import {notificationService as NotificationService} from "~/services/notificationService"
import ConversationMember from "~/models/conversation_members"
import Message from "~/models/messages"

const {StatusCodes} = require("http-status-codes")
const {conversationService} = require("~/services/conversationService")

export const createConversation = async (req, res, next) => {
  try {
    const convo = await conversationService.createConversation(req.body, req.file, req.userId, req.io)
    res.json({ conversation: convo })
  } catch (e) {
    next(e)
  }
}

const getConversation = async (req, res, next) => {
  try {
    const {page, limit} = req.query
    const userId = req.userId

    const conversations = await conversationService.getConversation(page, limit, userId)
    return res.json(conversations)
  } catch (error) {
    next(error)
  }
}

const fetchConversationDetail = async (req, res, next) => {
  try {
    const userId = req.userId
    const conversationId = req.params.conversationId
    
    const { beforeSeq, limit = 30 } = req.query

    const result = await conversationService.fetchConversationDetail(
      userId, 
      conversationId, 
      parseInt(limit), 
      beforeSeq ? parseInt(beforeSeq) : undefined
    )
    
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
// PATCH /v1/api/conversations/:id/read-to-latest
const readToLatest = async (req, res, next) => {
  try {
    const conversationId = req.params.id
    const userId = req.userId // ✅ dùng đúng field middleware gán

    if (!userId) return res.status(401).json({message: "Unauthorized"})

    // Lấy last message theo seq (ưu tiên)
    const lastMsg = await Message.findOne({conversationId})
    .sort({seq: -1, createdAt: -1})
    .select("_id seq createdAt")
    .lean()

    if (!lastMsg) {
      return res.json({ok: true, bumped: false, reason: "no_messages"})
    }

    const cm = await ConversationMember.findOne({conversation: conversationId, userId})
    if (!cm) return res.status(404).json({message: "Not a member"})

    const newSeq = typeof lastMsg.seq === "number" ? lastMsg.seq : 0
    let bumped = false

    // tiến độ đọc (không lùi)
    if (newSeq > (cm.lastReadMessageSeq || 0)) {
      cm.lastReadMessageSeq = newSeq
      bumped = true
    }

    if (bumped) await cm.save()

    // Emit badge = 0 cho CHÍNH user này (các tab của user sẽ clear ngay)
    req.io?.to?.(`user:${userId}`)?.emit("badge:update", {
      conversationId,
      unread: 0
    })

    // (tuỳ chọn) thông báo read-receipt cho những người khác
    if (bumped) {
      await NotificationService.notifyMessageRead({
        conversationId,
        readerId: userId,
        readerName: req.user?.fullName || req.user?.username || "Ai đó",
        lastReadSeq: newSeq,
        lastReadMessageId: lastMsg._id
      })
    }

    return res.json({
      ok: true,
      bumped,
      lastReadMessageSeq: cm.lastReadMessageSeq
    })
  } catch (error) {
    next(error)
  }
}
const getUnreadSummary = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id
    if (!userId) return res.status(401).json({message: "Unauthorized"})

    const result = await conversationService.getUnreadSummary(userId)
    return res.json(result)
  } catch (e) {
    console.error("[conversationUnreadController][getUnreadSummary] error:", e.message)
    next(e)
  }
}

const listConversationMedia = async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({message: "Unauthorized"})

    const conversationId = req.params.id

    // CHANGED: Lấy thêm senderId, startDate, endDate từ query
    const {type, page, limit, senderId, startDate, endDate} = req.query

    const result = await conversationService.listConversationMedia({
      userId,
      conversationId,
      type,
      page,
      limit,
      // CHANGED: Truyền thêm tham số
      senderId,
      startDate,
      endDate
    })

    return res.status(StatusCodes.OK).json(result)
  } catch (e) {
    next(e)
  }
}

const handleConversationActions = async (req, res, next) => {
  try {
    const userId = req.userId
    const conversationId = req.params.conversationId
    const { action } = req.body // "delete" | "leave" | "add" | "remove" | "promote"

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Unauthorized'
      })
    }

    if (!action) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'action is required. Use "delete", "leave", "add", "remove" or "promote"'
      })
    }

    if (action === "delete") {
      const result = await conversationService.deleteConversation(userId, conversationId)
      return res.status(StatusCodes.OK).json(result)
    }

    if (action === "leave") {
      const { nextAdminId } = req.body
      const result = await conversationService.leaveGroup(userId, conversationId, req.io, nextAdminId)
      return res.status(StatusCodes.OK).json(result)
    }

    if (action === "add") {
      const { memberIds } = req.body
      if (!memberIds) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'memberIds is required' })
      }

      const result = await conversationService.addMembersToGroup({
        actorId: userId,
        conversationId,
        memberIds,
        io: req.io
      })

      return res.status(StatusCodes.OK).json(result)
    }

    if (action === "remove") {
      const { memberId } = req.body
      if (!memberId) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'memberId is required' })
      }

      const result = await conversationService.removeMemberFromGroup({
        actorId: userId,
        conversationId,
        targetUserId: memberId,
        io: req.io
      })

      return res.status(StatusCodes.OK).json(result)
    }

    if (action === "promote") {
      const { memberId } = req.body
      if (!memberId) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'memberId is required' })
      }

      const result = await conversationService.promoteMemberToAdmin({
        actorId: userId,
        conversationId,
        targetUserId: memberId,
        io: req.io
      })

      return res.status(StatusCodes.OK).json(result)
    }

    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Invalid action. Use "delete", "leave", "add", "remove" or "promote"'
    })
  } catch (error) {
    next(error)
  }
}


const updateNotifications = async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" })

    const conversationId = req.params.id
    const { muted, duration } = req.body || {}
    // muted: boolean duration: 2|4|8|12|24|"forever" (required khi muted=true)

    if (muted === true && !duration) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "duration is required when muted=true" })
    }

    const result = await conversationService.updateNotificationSettings({
      userId,
      conversationId,
      muted: !!muted,
      duration: muted ? duration : null
    })

    // Sync realtime cho các tab của chính user
    req.io?.to?.(`user:${userId}`)?.emit("conversation:mute-changed", result)

    return res.status(StatusCodes.OK).json({ ok: true, ...result })
  } catch (e) {
    next(e)
  }
}

export const conversationController = {
  createConversation,
  getConversation,
  fetchConversationDetail,
  readToLatest,
  getUnreadSummary,
  listConversationMedia,
  handleConversationActions,
  updateNotifications
}