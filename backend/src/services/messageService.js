// services/messageService.js
import mongoose from 'mongoose'
import Conversation from '~/models/conversations'
import Message from '~/models/messages'
import ConversationMember from '~/models/conversation_members'
import {MAX_LIMIT_MESSAGE} from '~/utils/constant'
import {notificationService} from '~/services/notificationService'

function toPublicMessage(m) {
  return {
    _id: m._id,
    conversationId: m.conversationId,
    seq: m.seq,
    type: m.type,
    body: m.body,
    senderId: m.senderId,
    createdAt: m.createdAt
  }
}

async function assertCanAccessConversation(userId, convo) {
  if (!convo) throw Object.assign(new Error('Conversation not found'), {status: 404})
  if (convo.type === 'cloud') {
    if (String(convo.cloud?.ownerId) !== String(userId)) {
      const err = new Error('Forbidden')
      err.status = 403
      throw err
    }
  }
}

async function sendMessage({userId, conversationId, type, text, io}) {
  const convo = await Conversation.findById(conversationId).lean()
  await assertCanAccessConversation(userId, convo)

  // tăng messageSeq atomically
  const updated = await Conversation.findOneAndUpdate(
    {_id: conversationId},
    {$inc: {messageSeq: 1}},
    {new: true, lean: true}
  )
  if (!updated) throw Object.assign(new Error(`Conversation not found when incrementing: ${conversationId}`), {status: 404})
  const seq = updated.messageSeq

  const now = new Date()
  const msg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    seq,
    senderId: new mongoose.Types.ObjectId(userId),
    type,
    body: {text: type === 'text' ? text : ''},
    createdAt: now
  })

  await Conversation.updateOne(
    {_id: conversationId},
    {
      $set: {
        lastMessage: {
          seq,
          messageId: msg._id,
          type,
          textPreview: type === 'text' ? (text || '').slice(0, 160) : '',
          senderId: userId,
          createdAt: now
        },
        updatedAt: now
      }
    }
  )

  const payload = {conversationId, message: toPublicMessage(msg)}

  // 1) Emit tin nhắn mới vào room hội thoại
  io?.to(`conversation:${conversationId}`).emit('message:new', payload)

  // 2) Emit badge:update cho các thành viên khác
  if (io) {
    const members = await ConversationMember.find({
      conversation: conversationId,
      userId: {$ne: userId}
    }).select('userId lastReadMessageSeq').lean()

    members.forEach(m => {
      const unread = Math.max(0, seq - (m.lastReadMessageSeq || 0))
      io.to(`user:${m.userId}`).emit('badge:update', {conversationId, unread})
    })
  }

  // 3) Tạo notification "message" (service sẽ tự skip nếu người nhận đang xem)
  try {
    const notifs = await notificationService.notifyMessage({
      conversationId,
      message: msg.toJSON ? msg.toJSON() : msg,
      senderId: userId
    })

    // emit notification:new cho người nhận
    if (io && Array.isArray(notifs)) {
      notifs.forEach(n => {
        if (!n) return
        io.to(`user:${n.receiverId}`).emit('notification:new', n)
      })
    }
  } catch (e) {
    console.error('[messageService][notifyMessage] failed:', e.message)
  }

  return {ok: true, ...payload}
}

async function listMessages({userId, conversationId, limit = 30, beforeSeq}) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new Error("Invalid conversationId")
  }

  const convo = await Conversation.findById(conversationId).lean()
  if (!convo) throw new Error('Conversation not found')
  await assertCanAccessConversation(userId, convo)

  const q = {conversationId: new mongoose.Types.ObjectId(conversationId)}
  if (beforeSeq != null) {
    const n = Number(beforeSeq)
    if (Number.isFinite(n)) q.seq = {$lt: n}
  }

  const _limit = Math.min(Number(limit) || 30, MAX_LIMIT_MESSAGE)

  const docs = await Message.find(q).sort({seq: -1}).limit(_limit).lean()
  const items = docs.reverse()

  return items.map(m => ({
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
