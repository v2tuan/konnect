import Conversation from "~/models/conversations";
import ConversationMember from "~/models/conversation_members";
import User from "~/models/user";
import FriendShip from "~/models/friendships";
import mongoose from "mongoose";
import { messageService } from "./messageService";
import { toOid } from "~/utils/formatter";

const createConversation = async (conversationData, userId) => {
    const { type, memberIds } = conversationData

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
            { userId: userId, role: 'owner' }
        ]
    }
    else if (type === 'direct') {
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
                { 'direct.userA': userId, 'direct.userB': recipientId },
                { 'direct.userA': recipientId, 'direct.userB': userId }
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
            { userId: userId, role: 'member' },
            { userId: recipientId, role: 'member' }
        ]
    }
    else if (type === 'group') {
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

export const getConversation = async (page = 1, limit = 20, userId) => {
  const p = Math.max(1, Math.floor(Number(page) || 1))
  const l = Math.max(1, Math.min(100, Math.floor(Number(limit) || 20)))
  const skipVal = (p - 1) * l

  const uid = toOid(userId)
  const pipeline = [
    { $match: { userId: uid } },

    // Join sang conversation
    {
      $lookup: {
        from: 'conversations',
        localField: 'conversation',
        foreignField: '_id',
        as: 'conversation'
      }
    },
    { $unwind: '$conversation' },

    // Lấy user của lastMessage.senderId
    {
      $lookup: {
        from: 'users',
        localField: 'conversation.lastMessage.senderId',
        foreignField: '_id',
        as: 'lastSender'
      }
    },
    { $unwind: { path: '$lastSender', preserveNullAndEmptyArrays: true } },

    // Lấy TẤT CẢ other members (không unwind) = những người khác mình
    {
      $lookup: {
        from: 'conversationmembers',
        let: { convId: '$conversation._id', me: '$userId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$conversation', '$$convId'] },
                  { $ne: ['$userId', '$$me'] }
                ]
              }
            }
          },
          { $project: { _id: 0, userId: 1 } }
        ],
        as: 'otherMembers' // [{ userId }]
      }
    },

    // Join ONE-SHOT sang users cho toàn bộ otherMembers
    {
      $lookup: {
        from: 'users',
        let: { ids: '$otherMembers.userId' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$ids'] } } },
          {
            $project: {
              fullName: 1,
              username: 1,
              avatarUrl: 1,
              status: 1
            }
          }
        ],
        as: 'otherUsers' // [{ _id, fullName, ... }]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',        // chính là uid đã $match ở đầu
        foreignField: '_id',
        pipeline: [
          { $project: { fullName: 1, username: 1, avatarUrl: 1 } }
        ],
        as: 'meUser'
      }
    },
    { $unwind: { path: '$meUser', preserveNullAndEmptyArrays: false } },

    // Coalesce key sort
    {
      $addFields: {
        sortKey: { $ifNull: ['$conversation.lastMessage.createdAt', '$conversation.updatedAt'] }
      }
    },

    { $sort: { sortKey: -1 } },
    { $skip: skipVal },
    { $limit: l },

    // Build payload
    {
      $project: {
        _id: 0,
        id: '$conversation._id',
        type: '$conversation.type',
        lastMessage: {
          _id: '$conversation.lastMessage._id',
          textPreview: '$conversation.lastMessage.textPreview',
          createdAt: '$conversation.lastMessage.createdAt',
          senderId: '$conversation.lastMessage.senderId',
          sender: {
            id: '$lastSender._id',
            fullName: '$lastSender.fullName',
            username: '$lastSender.username',
            avatarUrl: '$lastSender.avatarUrl'
          }
        },
        messageSeq: '$conversation.messageSeq',
        updatedAt: '$conversation.updatedAt',

        // Hiển thị theo type
        displayName: {
          $switch: {
            branches: [
              { case: { $eq: ['$conversation.type', 'direct'] }, then: { $ifNull: [{ $ifNull: [{ $arrayElemAt: ['$otherUsers.fullName', 0] }, null] }, 'Unknown'] } },
              { case: { $eq: ['$conversation.type', 'group'] },  then: { $ifNull: ['$conversation.group.name', 'Group'] } },
              { case: { $eq: ['$conversation.type', 'cloud'] },  then: 'Your Cloud' }
            ],
            default: 'Unknown'
          }
        },
        conversationAvatarUrl: {
          $switch: {
            branches: [
              { case: { $eq: ['$conversation.type', 'direct'] }, then: { $ifNull: [{ $arrayElemAt: ['$otherUsers.avatarUrl', 0] }, '' ] } },
              { case: { $eq: ['$conversation.type', 'group'] },  then: { $ifNull: ['$conversation.group.avatarUrl', '' ] } },
              { case: { $eq: ['$conversation.type', 'cloud'] },  then: 'https://cdn-icons-png.flaticon.com/512/8038/8038388.png' }
            ],
            default: ''
          }
        },

        // Với direct: build otherUser = phần tử đầu tiên (không còn duplicate)
        direct: {
          otherUser: {
            $cond: [
              { $eq: ['$conversation.type', 'direct'] },
              {
                id:        { $arrayElemAt: [ { $map: { input: '$otherUsers', as: 'u', in: '$$u._id' } }, 0 ] },
                fullName:  { $arrayElemAt: [ '$otherUsers.fullName', 0 ] },
                userName:  { $arrayElemAt: [ '$otherUsers.username', 0 ] },
                avatarUrl: { $arrayElemAt: [ '$otherUsers.avatarUrl', 0 ] },
                status:    { $arrayElemAt: [ '$otherUsers.status', 0 ] }
              },
              {} // không phải direct thì trả rỗng
            ]
          }
        },

        group: {
          name: '$conversation.group.name',
          avatarUrl: '$conversation.group.avatarUrl',
          members: {
            $cond: [
              { $eq: ['$conversation.type', 'group'] },
              {
                $map: {
                  input: { $concatArrays: [ [ '$meUser' ], '$otherUsers' ] }, // [meUser, ...otherUsers]
                  as: 'm',
                  in: {
                    id:        '$$m._id',
                    fullName:  '$$m.fullName',
                    username:  '$$m.username',
                    avatarUrl: '$$m.avatarUrl'
                  }
                }
              },
              [] // không phải group thì rỗng
            ]
          }
        }
      }
    }
  ]

  const rows = await ConversationMember.aggregate(pipeline).allowDiskUse(true)
  return rows
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

  // Lấy messages (service trả oldest->newest)
  const messages = await messageService.listMessages({ userId, conversationId, limit, beforeSeq })
  const nextBeforeSeq = messages.length > 0 ? messages[0].seq : null

  // ======= GROUP MEMBERS (mới) =======
  let groupMembers = []
  let memberIds = []
  if (convo.type === 'group') {
    // Lấy toàn bộ members của cuộc trò chuyện
    const cms = await ConversationMember.find(
      { conversation: convo._id },
      { userId: 1 } // nếu có role, thêm { role: 1 }
    ).lean()

    memberIds = (cms || [])
      .map(cm => cm?.userId)
      .filter(Boolean)
      .map(id => String(id))
  }

  // ======= HỢP NHẤT ID cần load user (senders + members) =======
  const senderIds = [
    ...new Set(
      messages
        .map(m => m?.senderId)
        .filter(Boolean)
        .map(id => String(id))
    )
  ]

  const combinedIds = [...new Set([ ...senderIds, ...memberIds ])]

  // Query 1 lần toàn bộ users liên quan
  let usersById = new Map()
  if (combinedIds.length) {
    const users = await User.find(
      { _id: { $in: combinedIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { fullName: 1, username: 1, avatarUrl: 1, status: 1 }
    ).lean()
    usersById = new Map(users.map(u => [String(u._id), u]))
  }

  // Build group.members nếu là group
  if (convo.type === 'group') {
    groupMembers = memberIds.map(uid => {
      const u = usersById.get(String(uid))
      return u ? {
        id: u._id,
        fullName: u.fullName || null,
        username: u.username || null,
        avatarUrl: u.avatarUrl || null,
        status: u.status || null
        // nếu ConversationMember có role: thêm role tương ứng ở đây
      } : {
        id: uid,
        fullName: null,
        username: null,
        avatarUrl: null,
        status: null
      }
    })
  }

  // Enrich messages.sender (áp dụng cho group; muốn áp dụng cho tất cả thì bỏ điều kiện)
  const messagesWithSender =
    convo.type === 'group'
      ? messages.map(m => {
          const key = m?.senderId ? String(m.senderId) : null
          const u = key ? usersById.get(key) : null
          return {
            ...m,
            sender: u
              ? {
                  id: u._id,
                  fullName: u.fullName || null,
                  username: u.username || null,
                  avatarUrl: u.avatarUrl || null,
                  status: u.status || null
                }
              : null
          }
        })
      : messages

  return {
    conversation: {
      _id: convo._id,
      type: convo.type,
      direct: enrichedDirect,
      group: convo.type === 'group'
        ? {
            ...(convo.group || {}),
            members: groupMembers
          }
        : (convo.group || null),
      cloud: convo.cloud || null,
      displayName,
      conversationAvatarUrl,
      lastMessage: convo.lastMessage || null,
      createdAt: convo.createdAt,
      updatedAt: convo.updatedAt
    },
    messages: messagesWithSender,
    pageInfo: { limit, beforeSeq, nextBeforeSeq }
  }
}

export const conversationService = {
    createConversation,
    getConversation,
    fetchConversationDetail
}