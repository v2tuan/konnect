// services/messageService.js
import mongoose from 'mongoose'
import Conversation from '~/models/conversations'
import Message from '~/models/messages'
import ConversationMember from '~/models/conversation_members'
import Media from '~/models/medias'
import User from '~/models/user'
import { MAX_LIMIT_MESSAGE } from '~/utils/constant'
import { notificationService } from '~/services/notificationService'
import { mediaService } from './mediaService'

import { populate } from 'dotenv'
function toPublicMessage(m, currentUserId = null) {
  const isDeletedForCurrentUser = currentUserId && m.deletedFor?.some(
    del => String(del.userId) === String(currentUserId)
  )
  if (isDeletedForCurrentUser) return null

  if (m.recalled) {
    return {
      _id: m._id,
      conversationId: m.conversationId,
      seq: m.seq,
      type: 'text',
      body: { text: 'Message was recalled' },
      media: [],
      reactions: [],
      senderId: m.senderId,
      recalled: true,
      createdAt: m.createdAt
    }
  }
  return {
    _id: m._id,
    conversationId: m.conversationId,
    seq: m.seq,
    type: m.type,
    body: m.body,
    media: m.media,
    reactions: m.reactions || [],
    senderId: m.senderId,
    recalled: false,
    repliedMessage: m.repliedMessage,
    createdAt: m.createdAt
  }
}

async function assertCanAccessConversation(userId, convo) {
  if (!convo) {
    const err = new Error('Conversation not found')
    err.status = 404
    throw err
  }
  if (convo.type === 'cloud') {
    if (String(convo.cloud?.ownerId) !== String(userId)) {
      const err = new Error('Forbidden')
      err.status = 403
      throw err
    }
  }
}

function pickMediaForClient(m) {
  return {
    _id: m._id,
    conversationId: m.conversationId,
    type: m.type,        // 'image' | 'video' | 'audio' | 'file'
    url: m.url,
    sentAt: m.sentAt || m.uploadedAt,
    uploadedAt: m.uploadedAt,
    metadata: m.metadata || {}
  }
}

/**
 * Gửi tin nhắn (text / image / file / audio)
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.conversationId
 * @param {"text"|"image"|"file"|"audio"} params.type
 * @param {string} [params.text]
 * @param {string} [params.repliedMessage]  // messageId của tin nhắn được trả lời (nếu có)
 * @param {any} [params.file]  // có thể là req.file hoặc req.files
 * @param {import("socket.io").Server} params.io
 */
async function sendMessage({ userId, conversationId, type, text, repliedMessage, file, io }) {
  const conversation = await Conversation.findById(conversationId).lean()
  await assertCanAccessConversation(userId, conversation)

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

  // 3) Upload & lưu media (nếu có) + emit media:new
  let mediaDocs = []
  if (['image', 'file', 'audio', 'video'].includes(type) && file) {
    const files = Array.isArray(file) ? file : (file?.length ? Array.from(file) : [file])
    if (files.length) {
      const uploaded = await mediaService.uploadMultiple(files, conversationId, { userId, now })
      mediaDocs = await Promise.all(
        uploaded.map(u =>
          Media.create({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            uploaderId: new mongoose.Types.ObjectId(userId),
            senderId: new mongoose.Types.ObjectId(userId),
            type,
            url: u.url,
            sentAt: now,
            metadata: { ...(u.metadata || {}), senderId: userId, sentAt: now },
            uploadedAt: now
          })
        )
      )
      if (io && mediaDocs.length) {
        io.to(`conversation:${conversationId}`).emit('media:new', {
          conversationId,
          items: mediaDocs.map(pickMediaForClient)
        })
      }
    }
  }

  // 4) Tạo message
  let msg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    seq,
    senderId: new mongoose.Types.ObjectId(userId),
    media: mediaDocs.map(m => m._id),
    type,
    repliedMessage: repliedMessage ? new mongoose.Types.ObjectId(repliedMessage) : null,
    body: { text: type === 'text' ? (text || '') : `Đã gửi/nhận một tin nhắn ${type}` },
    createdAt: now
  })
  msg = await msg.populate('media')

  // populate media sau khi create
  await msg.populate([
    { path: 'media' },
    {
      path: 'repliedMessage',
      select: '_id conversationId seq type body',
      populate: {
        path: 'media'
      },
      populate: {
        path: 'senderId',
        select: 'fullName username'
      }
    }
  ]);

  // 5) Cập nhật lastMessage cho conversation
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

  // 6) Bảo đảm membership & badge người gửi
  await ConversationMember.updateOne(
    { conversation: conversationId, userId },
    {
      $max: { lastReadMessageSeq: seq },
      ...(conversation.type === 'cloud' ? { $setOnInsert: { role: 'owner', joinedAt: now } } : {})
    },
    { upsert: conversation.type === 'cloud' }
  )
  await ConversationMember.updateOne(
    { conversation: conversationId, userId },
    { $max: { lastReadMessageSeq: seq } }
  )
  if (io) io.to(`user:${userId}`).emit('badge:update', { conversationId, unread: 0 })

  // Emit badge = 0 cho CHÍNH người gửi (để các tab tự xóa badge ngay)
  if (io) {
    io.to(`user:${userId}`).emit("badge:update", { conversationId, unread: 0 });
  }
  const payload = { conversationId, message: toPublicMessage(msg) }

  // 6) Emit "message:new" cho room
  if (io) {
    io.to(`conversation:${conversationId}`).emit("message:new", payload)
  }

  try {
    const deletedMembers = await ConversationMember.find({
      conversation: conversationId,
      deletedAt: { $ne: null }
    }).select('userId').lean()
    if (deletedMembers.length) {
      await ConversationMember.updateMany(
        { conversation: conversationId, deletedAt: { $ne: null } },
        { $set: { deletedAt: null, deletedAtSeq: null } }
      )
      if (io) {
        deletedMembers.forEach(m => {
          io.to(`user:${m.userId}`).emit('message:new', payload)
        })
      }
    }
  } catch (e) {
    console.error('[messageService][reviveOnNewMessage] failed:', e.message)
  }

  // 8) badge cho các thành viên khác
  if (io) {
    const members = await ConversationMember.find({
      conversation: conversationId,
      userId: { $ne: userId }
    })
      .select("userId lastReadMessageSeq")
      .lean()

    members.forEach(m => {
      const unread = Math.max(0, seq - (m.lastReadMessageSeq || 0))
      io.to(`user:${m.userId}`).emit('badge:update', { conversationId, unread })
    })
  }

  // 9) Notification
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
      notifs.forEach(n => {
        if (!n) return
        io.to(`user:${n.receiverId}`).emit('notification:new', n)
      })
    }
  } catch (e) {
    console.error('[messageService][notifyMessage] failed:', e.message)
  }

  return { ok: true, ...payload }
}

async function setReaction({ userId, messageId, emoji, io }) {
  if (!mongoose.isValidObjectId(messageId)) throw new Error('Invalid messageId')
  if (typeof emoji !== 'string' || !emoji) throw new Error('Invalid emoji')

  const message = await Message.findById(messageId)
    .populate('conversationId')
    .populate('media')
  if (!message) throw new Error('Message not found')

  const convoId = message.conversationId?._id || message.conversationId
  const convo = await Conversation.findById(convoId).lean()
  if (!convo) throw new Error('Conversation not found')
  await assertCanAccessConversation(userId, convo)

  message.reactions.push({ userId, emoji })
  await message.save()

  const payload = { conversationId: convoId, message: toPublicMessage(message) }
  if (io) io.to(`conversation:${convoId}`).emit('message:new', payload)
  return { ok: true, messageId, reactions: message.reactions }
}

async function listMessages({ userId, conversationId, limit = 30, beforeSeq }) {
  if (!mongoose.isValidObjectId(conversationId)) {
    let cloud = await Conversation.findOne({ type: 'cloud', 'cloud.ownerId': userId })
    if (!cloud) cloud = await Conversation.create({ type: 'cloud', cloud: { ownerId: userId } })
    await ConversationMember.updateOne(
      { conversation: cloud._id, userId },
      { $setOnInsert: { role: 'owner', joinedAt: new Date(), lastReadMessageSeq: 0 } },
      { upsert: true }
    )
    conversationId = String(cloud._id)
  }

  const convo = await Conversation.findById(conversationId).lean()
  if (!convo) throw new Error('Conversation not found')
  await assertCanAccessConversation(userId, convo)

  let member = await ConversationMember.findOne({ conversation: conversationId, userId }).lean()
  if (!member) {
    if (convo.type === 'cloud' && String(convo.cloud?.ownerId) === String(userId)) {
      await ConversationMember.create({
        conversation: conversationId,
        userId,
        role: 'owner',
        joinedAt: new Date(),
        lastReadMessageSeq: 0
      })
    } else {
      throw new Error('You are not a member of this conversation')
    }
  }

  const q = { conversationId: new mongoose.Types.ObjectId(conversationId) }

  // Tạm thời comment phần này để test
  // if (member.deletedAtSeq !== null) {
  //   q.seq = { $gt: member.deletedAtSeq }
  // }

  if (beforeSeq != null) {
    const n = Number(beforeSeq)
    if (Number.isFinite(n)) q.seq = { $lt: n }
  }

  const _limit = Math.min(Number(limit) || 30, MAX_LIMIT_MESSAGE)

  const docs = await Message.find(q).populate("media")
  .populate({path: 'repliedMessage', select: '_id conversationId seq type body',
    populate: { path: 'senderId', select: 'fullName username' }}
  ).sort({ seq: -1 }).limit(_limit).lean()

  const items = docs.reverse()

  const filteredItems = items.map(m => toPublicMessage(m, userId)).filter(m => m !== null)
  return filteredItems
}

async function recallMessage({ userId, messageId, io }) {
  if (!mongoose.isValidObjectId(messageId)) {
    const err = new Error('Invalid messageId')
    err.status = 400
    throw err
  }

  const message = await Message.findById(messageId).populate('media')
  if (!message) {
    const err = new Error('Message not found')
    err.status = 404
    throw err
  }

  const convo = await Conversation.findById(message.conversationId).lean()
  await assertCanAccessConversation(userId, convo)

  if (String(message.senderId) !== String(userId)) {
    const err = new Error('You can only recall your own messages')
    err.status = 403
    throw err
  }

  if (message.recalled) {
    const err = new Error('Message already recalled')
    err.status = 409
    throw err
  }

  message.recalled = true
  await message.save()
  await message.populate('media')

  const payload = { conversationId: message.conversationId, message: toPublicMessage(message) }
  if (io) io.to(`conversation:${message.conversationId}`).emit('message:recalled', payload)

  const conversation = await Conversation.findById(message.conversationId)
  if (conversation.lastMessage && String(conversation.lastMessage.messageId) === String(messageId)) {
    await Conversation.updateOne(
      { _id: message.conversationId },
      {
        $set: {
          'lastMessage.textPreview': 'Message was recalled',
          'lastMessage.type': 'text',
          updatedAt: new Date()
        }
      }
    )
  }

  return {
    ok: true,
    messageId,
    message: toPublicMessage(message)
  }
}

async function deleteMessage({ userId, messageId, io }) {
  if (!mongoose.isValidObjectId(messageId)) {
    const err = new Error('Invalid messageId')
    err.status = 400
    throw err
  }

  const message = await Message.findById(messageId)
  if (!message) {
    const err = new Error('Message not found')
    err.status = 404
    throw err
  }

  const convo = await Conversation.findById(message.conversationId).lean()
  await assertCanAccessConversation(userId, convo)

  const alreadyDeleted = message.deletedFor.some(del => String(del.userId) === String(userId))
  if (alreadyDeleted) {
    const err = new Error('Message already deleted for this user')
    err.status = 409
    throw err
  }

  message.deletedFor.push({
    userId: new mongoose.Types.ObjectId(userId),
    deletedAt: new Date()
  })
  await message.save()

  // Emit về phòng user (tất cả tab của user sẽ nhận)
  if (io) {
    io.to(`user:${userId}`).emit('message:deleted', {
      conversationId: message.conversationId,
      messageId
    })
  }

  return {
    ok: true,
    messageId,
    action: 'deleted'
  }
}

async function removeReaction({ userId, messageId, io }) {
  if (!mongoose.isValidObjectId(messageId)) throw new Error("Invalid messageId");

  // Tìm message và populate
  const message = await Message.findById(messageId)
    .populate("conversationId")
    .populate("media");

  if (!message) throw new Error("Message not found");

  // Lấy conversationId
  const convoId = message.conversationId?._id || message.conversationId;
  const convo = await Conversation.findById(convoId).lean();
  if (!convo) throw new Error("Conversation not found");

  // Kiểm tra quyền truy cập
  await assertCanAccessConversation(userId, convo);

  // Xóa reaction tương ứng
  const beforeCount = message.reactions.length;
  message.reactions = message.reactions.filter(
    r => !(r.userId.toString() === userId.toString())
  );

  // Nếu không có thay đổi (người dùng chưa từng reaction emoji đó)
  if (message.reactions.length === beforeCount) {
    throw new Error("Reaction not found");
  }

  // Lưu lại
  await message.save();

  // Gửi event real-time qua socket (nếu có)
  const payload = {
    conversationId: convoId,
    message: toPublicMessage(message)
  };

  if (io) io.to(`conversation:${convoId}`).emit('message:new', payload)

  return { ok: true, messageId, reactions: message.reactions };
}

export const messageService = {
  sendMessage,
  listMessages,
  assertCanAccessConversation,
  setReaction,
  recallMessage,
  deleteMessage,
  removeReaction
}
