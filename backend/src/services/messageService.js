// services/messageService.js
import mongoose, { set } from 'mongoose'
import Conversation from '~/models/conversations'
import Message from '~/models/messages'
import { MAX_LIMIT_MESSAGE } from '~/utils/constant'
import { notificationService } from '~/services/notificationService'
import ConversationMember from "~/models/conversation_members";
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import Media from '~/models/medias'
import { mediaService } from './mediaService'

function toPublicMessage(m) {
  return {
    _id: m._id,
    conversationId: m.conversationId,
    seq: m.seq,
    type: m.type,
    body: m.body,
    media: m.media,
    reactions: m.reactions || [],
    senderId: m.senderId,
    createdAt: m.createdAt
  }
}

async function assertCanAccessConversation(userId, convo) {
  if (!convo) throw Object.assign(new Error('Conversation not found'), { status: 404 })

  if (convo.type === 'cloud') {
    if (String(convo.cloud?.ownerId) !== String(userId)) {
      const err = new Error('Forbidden')
      err.status = 403
      throw err
    }
  }
}

/**
 * Xử lý gửi tin nhắn trong hội thoại
 * @param {Object} params
 * @param {string} params.userId - ID của người gửi
 * @param {string} params.conversationId - ID hội thoại
 * @param {"text"|"image"|"file"|"audio"} params.type - Loại tin nhắn
 * @param {string} [params.text] - Nội dung text (nếu type = "text")
 * @param {Object} params.io - Socket.io instance để emit realtime
 */
async function sendMessage({ userId, conversationId, type, text, file, io }) {
  // 1. Lấy hội thoại để kiểm tra quyền truy cập
  const conversation = await Conversation.findById(conversationId).lean()
  await assertCanAccessConversation(userId, conversation)

  // 2. Tăng messageSeq (số thứ tự tin nhắn) một cách atomic để tránh race condition
  const conversationAfterInc = await Conversation.findOneAndUpdate(
    { _id: conversationId },
    { $inc: { messageSeq: 1 } },
    { new: true, lean: true }
  )

  if (!conversationAfterInc) {
    const error = new Error(`Conversation not found when incrementing: ${conversationId}`)
    error.status = 404
    throw error
  }

  const messageSeq = conversationAfterInc.messageSeq
  const now = new Date()

  let newMediaDoc = null
  // 3. Tạo bản ghi message mới
  let newMediaDocs = []
  if (['image', 'file', 'audio'].includes(type) && file) {
    const files = file || []
    const uploadResults = await mediaService.uploadMultiple(files, conversationId)
    // console.log('Upload results:', uploadResults)

    const promises = uploadResults.map((result, index) => {
      const media = {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        uploaderId: new mongoose.Types.ObjectId(userId),
        type,
        url: result.url, // URL truy cập file
        metadata: result.metadata, // thông tin thêm về file
        uploadedAt: now
      }

      // Trả về promise lưu vào DB
      return Media.create(media)
    })

    // Đợi tất cả media được lưu
    newMediaDocs = await Promise.all(promises)

    // console.log('Uploaded media:', newMediaDocs)
  }

  let newMessage = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    seq: messageSeq,
    senderId: new mongoose.Types.ObjectId(userId),
    media: Array.isArray(newMediaDocs) ? newMediaDocs.map(m => m._id) : [], // danh sách media
    type,
    body: {
      text: type === 'text' ? text : `Đã gửi/nhận một tin nhắn ${type}` // chỉ lưu text nếu type = text
    },
    createdAt: now
  })

  // populate sau khi create
  newMessage = await newMessage.populate('media');

  // 4. Cập nhật thông tin lastMessage của hội thoại
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessage: {
          seq: messageSeq,
          messageId: newMessage._id,
          type,
          textPreview: type === 'text' ? (text || '').slice(0, 160) : '',
          senderId: userId,
          createdAt: now
        },
        updatedAt: now
      }
    }
  )

  // Payload chung để emit
  const payload = {
    conversationId,
    message: toPublicMessage(newMessage)
  }

  // 5. Emit tin nhắn mới vào room hội thoại
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message:new', payload)
  }

  // 6. Emit badge cập nhật số tin chưa đọc cho các thành viên khác
  if (io) {
    const otherMembers = await ConversationMember.find({
      conversation: conversationId,
      userId: { $ne: userId }
    })
      .select('userId lastReadMessageSeq')
      .lean()

    otherMembers.forEach(member => {
      const unreadCount = Math.max(0, messageSeq - (member.lastReadMessageSeq || 0))
      io.to(`user:${member.userId}`).emit('badge:update', {
        conversationId,
        unread: unreadCount
      })
    })
  }

  // 7. Tạo notification và emit tới user nhận
  try {
    const notifications = await notificationService.notifyMessage({
      conversationId,
      message: newMessage.toJSON ? newMessage.toJSON() : newMessage,
      senderId: userId
    })

    if (io && Array.isArray(notifications)) {
      notifications.forEach(notification => {
        if (!notification) return
        io.to(`user:${notification.receiverId}`).emit('notification:new', notification)
      })
    }
  } catch (err) {
    console.error('[messageService][notifyMessage] failed:', err.message)
  }

  return { ok: true, ...payload }
}

async function setReaction({ userId, messageId, emoji, io }) {
  if (!mongoose.isValidObjectId(messageId)) {
    throw new Error("Invalid messageId")
  }
  if (typeof emoji !== 'string' || !emoji) {
    throw new Error("Invalid emoji")
  }
  const message = await (await Message.findById(messageId)).populate('conversationId')
  if (!message) {
    throw new Error("Message not found")
  }
  const convo = await Conversation.findById(message.conversationId).lean()
  if (!convo) {
    throw new Error('Conversation not found')
  }
  await assertCanAccessConversation(userId, convo)
  // Cập nhật reaction
  message.reactions.push({ userId, emoji })
  await message.save()

  // Payload chung để emit
  const payload = {
    conversationId: message.conversationId._id,
    message: toPublicMessage(message)
  }

  // Emit tin nhắn mới vào room hội thoại
  if (io) {
    io.to(`conversation:${message.conversationId._id}`).emit('message:new', payload)
  }
  return { ok: true, messageId, reactions: message.reactions }
}

async function listMessages({ userId, conversationId, limit = 30, beforeSeq }) {
  try {
    if (!mongoose.isValidObjectId(conversationId)) {
      throw new Error("Invalid conversationId")
    }

    const convo = await Conversation.findById(conversationId).lean()
    if (!convo) {
      throw new Error('Conversation not found')
    }
    await assertCanAccessConversation(userId, convo)

    const q = { conversationId: new mongoose.Types.ObjectId(conversationId) }
    if (beforeSeq != null) {
      const n = Number(beforeSeq)
      if (Number.isFinite(n)) q.seq = { $lt: n }
    }

    const _limit = Math.min(Number(limit) || 30, MAX_LIMIT_MESSAGE)

    // đảo ngược tin nhắn, mới nhất xếp trước
    const docs = await Message
      .find(q)
      .populate('media')
      .sort({ seq: -1 })
      .limit(_limit)
      .lean()

    const items = docs.reverse()

    return items.map(m => ({
      _id: m._id,
      conversationId: m.conversationId,
      seq: m.seq,
      senderId: m.senderId,
      type: m.type,
      body: m.body,
      media: m.media,
      reactions: m.reactions || [],
      recalled: m.recalled,
      createdAt: m.createdAt
    }))
  } catch (error) {
    throw new Error(error)
  }
}

export const messageService = {
  sendMessage,
  listMessages,
  assertCanAccessConversation,
  setReaction
}
