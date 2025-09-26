import {notificationService as NotificationService} from "~/services/notificationService";
import ConversationMember from "~/models/conversation_members";
import Message from "~/models/messages";

const {StatusCodes} = require("http-status-codes")
const {conversationService} = require("~/services/conversationService")

const createConversation = async (req, res, next) => {
  try {
    const newConversation = await conversationService.createConversation(req.body, req.file, req.userId)
    res.status(StatusCodes.CREATED).json({
      data: newConversation
    })
  } catch (error) {
    next(error)
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

    const result = await conversationService.fetchConversationDetail(userId, conversationId)
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


export const conversationController = {
  createConversation,
  getConversation,
  fetchConversationDetail,
  readToLatest,
  getUnreadSummary
}