import mongoose from 'mongoose'
import Conversation from '~/models/conversations'
import Message from '~/models/messages'

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
  if (!convo) throw Object.assign(new Error('Conversation not found'), { status: 404 })

  if (convo.type === 'cloud') {
    if (String(convo.cloud?.ownerId) !== String(userId)) {
      const err = new Error('Forbidden')
      err.status = 403
      throw err
    }
  }
}

async function sendMessage({ userId, conversationId, type, text, io }) {
  const convo = await Conversation.findById(conversationId).lean()
  await assertCanAccessConversation(userId, convo)

  // Tăng messageSeq atomically để tránh race condition
  const updated = await Conversation.findOneAndUpdate(
    { _id: conversationId },           // KHÔNG cần wrap ObjectId thủ công
    { $inc: { messageSeq: 1 } },
    { new: true, lean: true }
  )

  if (!updated) {
    const err = new Error(`Conversation not found when incrementing: ${conversationId}`)
    err.status = 404
    throw err
  }
  const seq = updated.messageSeq;

  const now = new Date()
  const msg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    seq,
    senderId: new mongoose.Types.ObjectId(userId),
    type,
    body: { text: type === 'text' ? text : '' },
    createdAt: now
  })

  await Conversation.updateOne(
    { _id: conversationId },
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

  const payload = { conversationId, message: toPublicMessage(msg) }

  if (io) {
    io.to(`conversation:${conversationId}`).emit('message:new', payload)
  }

  return { ok: true, ...payload }
}

async function listMessages({ userId, conversationId, limit = 30, beforeSeq }) {
  const convo = await Conversation.findById(conversationId).lean()
  await assertCanAccessConversation(userId, convo)

  const q = { conversationId: new mongoose.Types.ObjectId(conversationId) }
  if (beforeSeq != null) q.seq = { $lt: Number(beforeSeq) }

  const items = await Message.find(q).sort({ seq: -1 }).limit(Number(limit))
  return { items: items.reverse().map(toPublicMessage) }
}

export const messageService = {
  sendMessage,
  listMessages
}
