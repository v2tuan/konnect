// services/messageService.js
import mongoose from "mongoose"
import Conversation from "~/models/conversations"
import Message from "~/models/messages"
import User from "~/models/user"
import Media from "~/models/medias"                // ✅ import model đã đăng ký (đúng file bạn vừa sửa)
import ConversationMember from "~/models/conversation_members"
import { notificationService } from "~/services/notificationService"
import { mediaService } from "./mediaService"
import { MAX_LIMIT_MESSAGE } from "~/utils/constant"

function toPublicMessage(m) {
  return {
    _id: m._id,
    conversationId: m.conversationId,
    seq: m.seq,
    type: m.type,
    body: m.body,
    media: m.media,
    senderId: m.senderId,
    createdAt: m.createdAt
  }
}

async function assertCanAccessConversation(userId, convo) {
  if (!convo) {
    const err = new Error("Conversation not found")
    err.status = 404
    throw err
  }
  if (convo.type === "cloud") {
    if (String(convo.cloud?.ownerId) !== String(userId)) {
      const err = new Error("Forbidden")
      err.status = 403
      throw err
    }
  }
}

/**
 * Gửi tin nhắn (text / image / file / audio)
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.conversationId
 * @param {"text"|"image"|"file"|"audio"} params.type
 * @param {string} [params.text]
 * @param {any} [params.file]  // có thể là req.file hoặc req.files
 * @param {import("socket.io").Server} params.io
 */
async function sendMessage({ userId, conversationId, type, text, file, io }) {
  // 1) Kiểm tra quyền
  const conversation = await Conversation.findById(conversationId).lean()
  await assertCanAccessConversation(userId, conversation)

  // 2) Tăng seq atomically
  const updatedConvo = await Conversation.findOneAndUpdate(
    { _id: conversationId },
    { $inc: { messageSeq: 1 } },
    { new: true, lean: true }
  )
  if (!updatedConvo) {
    const err = new Error(`Conversation not found when incrementing: ${conversationId}`)
    err.status = 404
    throw err
  }
  const seq = updatedConvo.messageSeq
  const now = new Date()

  // 3) Upload & lưu media (nếu có)
  let mediaDocs = []
  if (["image", "file", "audio", "video"].includes(type) && file) {
    // normalize về mảng
    const files = Array.isArray(file)
      ? file
      : (file?.length ? Array.from(file) : (file ? [file] : []))

    if (files.length) {
      const uploaded = await mediaService.uploadMultiple(files, conversationId)
      // Lưu vào Media collection
      mediaDocs = await Promise.all(
        uploaded.map((u) =>
          Media.create({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            uploaderId: new mongoose.Types.ObjectId(userId),
            type,
            url: u.url,
            metadata: u.metadata,
            uploadedAt: now
          })
        )
      )
    }
  }

  // 4) Tạo message
  let msg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    seq,
    senderId: new mongoose.Types.ObjectId(userId),
    media: mediaDocs.map((m) => m._id),
    type,
    body: {
      text: type === "text" ? (text || "") : `Đã gửi/nhận một tin nhắn ${type}`
    },
    createdAt: now
  })

  // populate media sau khi create
  msg = await msg.populate("media")

  // 5) Cập nhật lastMessage cho conversation
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessage: {
          seq,
          messageId: msg._id,
          type,
          textPreview: type === "text" ? (text || "").slice(0, 160) : "",
          senderId: userId,
          createdAt: now
        },
        updatedAt: now
      }
    }
  )

  const payload = { conversationId, message: toPublicMessage(msg) }

  // 6) Emit "message:new" cho room
  if (io) {
    io.to(`conversation:${conversationId}`).emit("message:new", payload)
  }

  // 7) Emit badge:update cho các thành viên khác
  if (io) {
    const members = await ConversationMember.find({
      conversation: conversationId,
      userId: { $ne: userId }
    })
    .select("userId lastReadMessageSeq")
    .lean()

    members.forEach((m) => {
      const unread = Math.max(0, seq - (m.lastReadMessageSeq || 0))
      io.to(`user:${m.userId}`).emit("badge:update", { conversationId, unread })
    })
  }

  // 8) Notification (kèm tên / avatar người gửi) + emit notification:new
  try {
    const sender = await User.findById(userId)
    .select("fullName username avatarUrl")
    .lean()
    const senderName = sender?.fullName || sender?.username || "Người dùng"
    const senderAvatar = sender?.avatarUrl || ""

    const notifs = await notificationService.notifyMessage({
      conversationId,
      message: msg.toJSON ? msg.toJSON() : msg,
      senderId: userId,
      senderName,
      senderAvatar
    })

    if (io && Array.isArray(notifs)) {
      notifs.forEach((n) => {
        if (!n) return
        io.to(`user:${n.receiverId}`).emit("notification:new", n)
      })
    }
  } catch (e) {
    console.error("[messageService][notifyMessage] failed:", e.message)
  }

  return { ok: true, ...payload }
}

async function listMessages({ userId, conversationId, limit = 30, beforeSeq }) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new Error("Invalid conversationId")
  }

  const convo = await Conversation.findById(conversationId).lean()
  if (!convo) throw new Error("Conversation not found")
  await assertCanAccessConversation(userId, convo)

  const q = { conversationId: new mongoose.Types.ObjectId(conversationId) }
  if (beforeSeq != null) {
    const n = Number(beforeSeq)
    if (Number.isFinite(n)) q.seq = { $lt: n }
  }

  const _limit = Math.min(Number(limit) || 30, MAX_LIMIT_MESSAGE)

  const docs = await Message.find(q)
  .populate("media")
  .sort({ seq: -1 })
  .limit(_limit)
  .lean()

  const items = docs.reverse()

  return items.map((m) => ({
    _id: m._id,
    conversationId: m.conversationId,
    seq: m.seq,
    senderId: m.senderId,
    type: m.type,
    body: m.body,
    media: m.media,
    recalled: m.recalled,
    createdAt: m.createdAt
  }))
}

export const messageService = {
  sendMessage,
  listMessages,
  assertCanAccessConversation
}
