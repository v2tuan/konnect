import Conversation from "~/models/conversations";
import ConversationMember from "~/models/conversation_members";
import User from "~/models/user";
import FriendShip from "~/models/friendships";
import mongoose from "mongoose";
import {messageService} from "./messageService";
import {toOid} from "~/utils/formatter";

const createConversation = async (conversationData, userId) => {
  const {type, memberIds} = conversationData

  const conversationDataToCreate = {
    type,
    messageSeq: 0
  }

  let membersToAdd = []

  if (type === 'cloud') {
    // Kiểm tra đã có cloud conversation chưa

    // Set up conversation data
    conversationData.cloud = {
      ownerId: userId
    }

    membersToAdd = [
      {userId: userId, role: 'owner'}
    ]
  } else if (type === 'direct') {
    // Kiểm tra recipient có tồn tại không
    if (memberIds.length > 2) {
      throw new Error('Tin nhắn trực tiếp chỉ có tối đa 2 thành viên')
    }

    const recipientId = memberIds.find(id => id !== userId)
    const recipient = await User.findById(recipientId)

    if (!recipient) {
      throw new Error('Recipient not found')
    }

    // Kiểm tra không thể tạo conversation với chính mình
    if (userId === recipientId) {
      throw new Error('Cannot create a conversation with yourself')
    }

    // Kiểm tra có bị block không

    // Kiểm tra conversation đã tồn tại chưa
    const existingConversation = await Conversation.findOne({
      type: 'direct',
      $or: [
        {'direct.userA': userId, 'direct.userB': recipientId},
        {'direct.userA': recipientId, 'direct.userB': userId}
      ]
    });

    if (existingConversation) {
      return
    }

    // Set up conversation data
    conversationData.direct = {
      userA: userId,
      userB: recipientId
    };

    // Set up conversation data
    membersToAdd = [
      {userId: userId, role: 'member'},
      {userId: recipientId, role: 'member'}
    ]
  } else if (type === 'group') {
    // Kiểm tra tất cả member có tồn tại không
    // Kiểm tra có user hiện tại trong danh sách không nếu không thì thêm vào
    const uniqueMemberIds = [...new Set([userId, ...memberIds])]

    if (uniqueMemberIds.length <= 2) {
      throw new Error('Không thể tạo nhóm chỉ với 2 thành viên')
    }

    // Set up conversation data
    conversationData.group = {
      name: 'New Group',
      avatarURL: '/'
    }

    membersToAdd = uniqueMemberIds.map(id => ({
      userId: id,
      role: id === userId ? 'admin' : 'member'
    }))
  }

  // ============================= TẠO CONVERSATION ================================
  const newConversation = await Conversation.create(conversationData)
  await newConversation.save()

  // Thêm member vào conversation
  const memberPromises = membersToAdd.map(member => {
    const conversationMember = new ConversationMember({
      conversation: newConversation._id,
      userId: member.userId,
      role: member.role
    })

    return conversationMember.save()
  })

  await Promise.all(memberPromises)

  return newConversation
}

// Get Conversation
const getConversation = async (page, limit, userId) => {
  const uid = toOid(userId)

  const memberRecords = await ConversationMember.find({userId: uid})
  .populate({
    path: 'conversation',
    populate: [
      {
        path: 'lastMessage.senderId',
        // NOTE: trong User model là 'username' chứ không phải 'userName'
        select: 'fullName username avatarUrl'
      }
    ]
  })
  .sort({'conversation.updatedAt': -1}) // hợp lý hơn createdAt
  .limit(limit)
  .skip((page - 1) * limit)
  .lean() // hiệu năng
  // console.log(memberRecords)

  const conversations = await Promise.all(
    memberRecords.map(async (member) => {
      const conversation = member.conversation
      let conversationData = {
        id: conversation._id,
        type: conversation.type,
        lastMessage: conversation.lastMessage,
        messageSeq: conversation.messageSeq,
        updatedAt: conversation.updatedAt
      }

      if (conversation.type === 'direct') {
        // Lấy member còn lại bằng $ne
        const otherMember = await ConversationMember
        .findOne({conversation: conversation._id, userId: {$ne: uid}})
        .select('userId')
        .lean()

        const otherUserId = otherMember?.userId
        const otherUser = otherUserId ? await User.findById(otherUserId).lean() : null

        const friendship = otherUserId
          ? await FriendShip.findOne({
            $or: [
              {profileRequest: otherUserId, profileReceive: uid},
              {profileRequest: uid, profileReceive: otherUserId}
            ]
          }).lean()
          : null

        if (otherUser) {
          conversationData.direct = {
            otherUser: {
              id: otherUser._id,
              fullName: otherUser.fullName,
              userName: otherUser.username,
              avatarUrl: otherUser.avatarUrl,
              status: otherUser.status,
              friendship: !!friendship
            }
          }
          conversationData.displayName = otherUser.fullName
          conversationData.conversationAvatarUrl = otherUser.avatarUrl
        } else {
          conversationData.direct = {otherUser: null}
          conversationData.displayName = 'Unknown'
          conversationData.conversationAvatarUrl = ''
        }
      } else if (conversation.type === 'group') {
        conversationData.group = {
          name: conversation.group?.name || '',
          avatarUrl: conversation.group?.avatarUrl || ''
        }
        conversationData.displayName = conversation.group?.name || 'Group'
        conversationData.conversationAvatarUrl = conversation.group?.avatarUrl || ''
      } else if (conversation.type === 'cloud') {
        conversationData.displayName = 'Your Cloud'
        conversationData.conversationAvatarUrl = 'https://cdn-icons-png.flaticon.com/512/8038/8038388.png'
      }

      return conversationData
    })
  )

  return conversations
}


export const fetchConversationDetail = async (userId, conversationId, limit = 30, beforeSeq) => {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error("Invalid conversationId")
    err.status = 400
    throw err
  }

  const convo = await Conversation.findById(conversationId).lean()
  if (!convo) {
    const err = new Error("Conversation not found")
    err.status = 404
    throw err
  }

  await messageService.assertCanAccessConversation(userId, convo)

  let displayName = null
  let conversationAvatarUrl = null
  let enrichedDirect = convo.direct || null

  if (convo.type === "direct") {
    const [userA, userB] = await Promise.all([
      User.findById(convo.direct?.userA).lean(),
      User.findById(convo.direct?.userB).lean()
    ])

    const meIsA = String(convo.direct?.userA) === String(userId)
    const other = meIsA ? userB : userA

    if (other) {
      displayName = other.fullName || other.username || "User"
      conversationAvatarUrl = other.avatarUrl || null
      enrichedDirect = {
        ...convo.direct,
        otherUser: {
          _id: other._id,
          fullName: other.fullName || null,
          username: other.username || null,
          avatarUrl: other.avatarUrl || null,
          status: other.status || null
        }
      }
    } else {
      // fallback
      displayName = "Conversation"
    }
  }

  if (convo.type === "group") {
    displayName = convo.group?.name || "Group"
    conversationAvatarUrl = convo.group?.avatarUrl || null
  }

  if (convo.type === "cloud") {
    displayName = "Cloud Chat"
  }

  // Lấy messages (đã đảo ngược sang oldest->newest trong service của bạn)
  const messages = await messageService.listMessages({userId, conversationId, limit, beforeSeq})
  const nextBeforeSeq = messages.length > 0 ? messages[0].seq : null

  return {
    conversation: {
      _id: convo._id,
      type: convo.type,
      direct: enrichedDirect,
      group: convo.group || null,
      cloud: convo.cloud || null,
      displayName,
      conversationAvatarUrl,
      lastMessage: convo.lastMessage || null,
      createdAt: convo.createdAt,
      updatedAt: convo.updatedAt
    },
    messages,
    pageInfo: {limit, beforeSeq, nextBeforeSeq}
  }
}
const getUnreadSummary = async (userId) => {
  // Lấy membership của user
  const members = await ConversationMember.find({userId})
  .select("conversation lastReadMessageSeq")
  .lean()

  if (!members.length) return {items: [], totalConversations: 0, totalMessages: 0}

  // Lấy messageSeq của các conversation liên quan
  const convoIds = members.map(m => m.conversation)
  const convos = await Conversation.find({_id: {$in: convoIds}})
  .select("_id messageSeq")
  .lean()

  const seqMap = Object.fromEntries(convos.map(c => [String(c._id), c.messageSeq || 0]))

  const items = members.map(m => {
    const cid = String(m.conversation)
    const unread = Math.max(0, (seqMap[cid] || 0) - (m.lastReadMessageSeq || 0))
    return {conversationId: cid, unread}
  })

  const totalConversations = items.reduce((acc, i) => acc + (i.unread > 0 ? 1 : 0), 0)
  const totalMessages = items.reduce((acc, i) => acc + i.unread, 0)

  return {items, totalConversations, totalMessages}
}

export const conversationService = {
  createConversation,
  getConversation,
  fetchConversationDetail,
  getUnreadSummary
}