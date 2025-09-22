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

        // Với group: giữ nguyên metadata; nếu muốn có members, có thể trả thêm mảng otherUsers
        group: {
          name: '$conversation.group.name',
          avatarUrl: '$conversation.group.avatarUrl'
          // Nếu cần:
          // members: {
          //   $cond: [
          //     { $eq: ['$conversation.type', 'group'] },
          //     {
          //       $map: {
          //         input: '$otherUsers',
          //         as: 'm',
          //         in: { id: '$$m._id', fullName: '$$m.fullName', userName: '$$m.username', avatarUrl: '$$m.avatarUrl', status: '$$m.status' }
          //       }
          //     },
          //     []
          //   ]
          // }
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
  const messages = await messageService.listMessages({ userId, conversationId, limit, beforeSeq })
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
    pageInfo: { limit, beforeSeq, nextBeforeSeq }
  }
}


export const conversationService = {
    createConversation,
    getConversation,
    fetchConversationDetail
}