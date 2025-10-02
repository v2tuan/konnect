import mongoose from "mongoose";
import ConversationMember from "~/models/conversation_members";
import Conversation from "~/models/conversations";
import User from "~/models/user";
import { toOid } from "~/utils/formatter";
import { messageService } from "./messageService";
import { contactService } from "./contactService";
import { mediaService } from "./mediaService";
import { cloudinaryProvider } from "~/providers/CloudinaryProvider_v2";
import Media from "~/models/medias";

async function markFriendshipOnConversation(meId, convObj) {
  try {
    // DIRECT
    const d = convObj?.direct
    const otherUser = d?.otherUser
    const otherUserId = otherUser?._id || otherUser?.id
    if (convObj?.type === 'direct' && otherUserId) {
      const rel = await contactService.getFriendRelation(meId, otherUserId)
      // luôn gắn object friendship; FE sẽ dựa vào status để render
      convObj.direct.otherUser.friendship = rel || { status: 'none' }
    }

    // GROUP
    const members = convObj?.group?.members
    if (convObj?.type === 'group' && Array.isArray(members) && members.length) {
      await Promise.all(
        members.map(async (m) => {
          const mid = m?._id || m?.id
          if (!mid || String(mid) === String(meId)) {
            m.friendship = { status: 'none' } // với chính mình thì đặt 'none' hoặc bỏ qua
            return
          }
          const rel = await contactService.getFriendRelation(meId, mid)
          m.friendship = rel || { status: 'none' }
        })
      )
    }
  } catch (e) {
    // fallback an toàn để không làm vỡ response
    if (convObj?.direct?.otherUser && !convObj.direct.otherUser.friendship) {
      convObj.direct.otherUser.friendship = { status: 'none' }
    }
    if (Array.isArray(convObj?.group?.members)) {
      convObj.group.members.forEach(m => {
        if (!m.friendship) m.friendship = { status: 'none' }
      })
    }
  }
  return convObj
}

const createConversation = async (conversationData, file, userId) => {
  let { type, memberIds, name } = conversationData
  console.log("Creating conversation:", conversationData, "by user:", userId)
  console.log(name)

  memberIds = Array.isArray(memberIds)
  ? memberIds
  : JSON.parse(memberIds || "[]");


  const conversationDataToCreate = {
    type,
    messageSeq: 0
  }

  let membersToAdd = []

  if (type === 'cloud') {
    // Kiểm tra đã có cloud conversation chưa

    // Set up conversation data
    conversationDataToCreate.cloud = {
      ownerId: userId
    }

    membersToAdd = [
      { userId: userId, role: 'owner' }
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
        { 'direct.userA': userId, 'direct.userB': recipientId },
        { 'direct.userA': recipientId, 'direct.userB': userId }
      ]
    });

    if (existingConversation) {
      return
    }

    // Set up conversation data
    conversationDataToCreate.direct = {
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

    let uploadResults = null
    if (file) {
      const uploadOptions = {
        folder: `konnect/${name || 'group_avatars'}`,
        resource_type: 'auto'
    }
      uploadResults = await cloudinaryProvider.uploadSingle(file, uploadOptions)
    }

    // Set up conversation data
    conversationDataToCreate.group = {
      name: name ?? 'New Group',
      avatarUrl: uploadResults?.secure_url ?? '/'
    }

    membersToAdd = uniqueMemberIds.map(id => ({
      userId: id,
      role: id === userId ? 'admin' : 'member'
    }))
  }

  // ============================= TẠO CONVERSATION ================================
  const newConversation = await Conversation.create(conversationDataToCreate)
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

const getConversation = async (page = 1, limit = 20, userId) => {
  const p = Math.max(1, Math.floor(Number(page) || 1))
  const l = Math.max(1, Math.min(100, Math.floor(Number(limit) || 20)))
  const skipVal = (p - 1) * l
  const uid = toOid(userId)

  const total = await ConversationMember.countDocuments({  
    userId: uid,
    deletedAt: null  
  })

  const pipeline = [
    { $match: { userId: uid, deletedAt: null } },

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

    // Lấy other members (không unwind) = những người khác mình
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
        as: 'otherMembers'
      }
    },

    // Join ONE-SHOT sang users cho toàn bộ otherMembers
    {
      $lookup: {
        from: 'users',
        let: { ids: '$otherMembers.userId' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$ids'] } } },
          { $project: { fullName: 1, username: 1, avatarUrl: 1, status: 1 } }
        ],
        as: 'otherUsers'
      }
    },

    // Me
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        pipeline: [
          { $project: { fullName: 1, username: 1, avatarUrl: 1 } }
        ],
        as: 'meUser'
      }
    },
    { $unwind: { path: '$meUser', preserveNullAndEmptyArrays: false } },

    // Sort key
    { $addFields: { sortKey: { $ifNull: ['$conversation.lastMessage.createdAt', '$conversation.updatedAt'] } } },
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

        displayName: {
          $switch: {
            branches: [
              { case: { $eq: ['$conversation.type', 'direct'] }, then: { $ifNull: [{ $ifNull: [{ $arrayElemAt: ['$otherUsers.fullName', 0] }, null] }, 'Unknown'] } },
              { case: { $eq: ['$conversation.type', 'group'] }, then: { $ifNull: ['$conversation.group.name', 'Group'] } },
              { case: { $eq: ['$conversation.type', 'cloud'] }, then: 'Your Cloud' }
            ],
            default: 'Unknown'
          }
        },
        conversationAvatarUrl: {
          $switch: {
            branches: [
              { case: { $eq: ['$conversation.type', 'direct'] }, then: { $ifNull: [{ $arrayElemAt: ['$otherUsers.avatarUrl', 0] }, ''] } },
              { case: { $eq: ['$conversation.type', 'group'] }, then: { $ifNull: ['$conversation.group.avatarUrl', ''] } },
              { case: { $eq: ['$conversation.type', 'cloud'] }, then: 'https://cdn-icons-png.flaticon.com/512/8038/8038388.png' }
            ],
            default: ''
          }
        },

        // DIRECT: otherUser (lấy phần tử đầu)
        direct: {
          otherUser: {
            $cond: [
              { $eq: ['$conversation.type', 'direct'] },
              {
                id: { $arrayElemAt: [{ $map: { input: '$otherUsers', as: 'u', in: '$$u._id' } }, 0] },
                fullName: { $arrayElemAt: ['$otherUsers.fullName', 0] },
                username: { $arrayElemAt: ['$otherUsers.username', 0] },
                avatarUrl: { $arrayElemAt: ['$otherUsers.avatarUrl', 0] },
                status: { $arrayElemAt: ['$otherUsers.status', 0] }
              },
              {}
            ]
          }
        },

        // GROUP: build members (bao gồm cả mình + others)
        group: {
          name: '$conversation.group.name',
          avatarUrl: '$conversation.group.avatarUrl',
          members: {
            $cond: [
              { $eq: ['$conversation.type', 'group'] },
              {
                $map: {
                  input: { $concatArrays: [['$meUser'], '$otherUsers'] },
                  as: 'm',
                  in: {
                    id: '$$m._id',
                    fullName: '$$m.fullName',
                    username: '$$m.username',
                    avatarUrl: '$$m.avatarUrl'
                  }
                }
              },
              []
            ]
          }
        }
      }
    }
  ]

  const data = await ConversationMember.aggregate(pipeline).allowDiskUse(true)
  await Promise.all(data.map(row => markFriendshipOnConversation(userId, row)))

  const hasMore = p * l < total
  return { data, page: p, limit: l, hasMore }
}

const fetchConversationDetail = async (userId, conversationId, limit = 30, beforeSeq) => {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error('Invalid conversationId')
    err.status = 400
    throw err
  }

  const convo = await Conversation.findById(conversationId).lean()
  if (!convo) {
    const err = new Error('Conversation not found')
    err.status = 404
    throw err
  }

  await messageService.assertCanAccessConversation(userId, convo)

  // ===== Header =====
  let displayName = null
  let conversationAvatarUrl = null
  let enrichedDirect = convo.direct || null

  if (convo.type === 'direct') {
    const [userA, userB] = await Promise.all([
      User.findById(convo.direct?.userA).lean(),
      User.findById(convo.direct?.userB).lean()
    ])

    const meIsA = String(convo.direct?.userA) === String(userId)
    const other = meIsA ? userB : userA

    if (other) {
      displayName = other.fullName || other.username || 'User'
      conversationAvatarUrl = other.avatarUrl || null
      enrichedDirect = {
        ...convo.direct,
        otherUser: {
          _id: other._id,
          fullName: other.fullName || null,
          username: other.username || null,
          avatarUrl: other.avatarUrl || null,
          status: other.status || null // { isOnline, lastActiveAt }
          // friendship sẽ gắn sau, không có isFriend nữa
        }
      }
    } else {
      displayName = 'Conversation'
    }
  }

  if (convo.type === 'group') {
    displayName = convo.group?.name || 'Group'
    conversationAvatarUrl = convo.group?.avatarUrl || null
  }

  if (convo.type === 'cloud') {
    displayName = 'Cloud Chat'
  }

  // ===== Messages (oldest -> newest) =====
  const messages = await messageService.listMessages({ userId, conversationId, limit, beforeSeq })
  const nextBeforeSeq = messages.length > 0 ? messages[0].seq : null

  // ===== Group members =====
  let groupMembers = []
  let memberIds = []
  if (convo.type === 'group') {
    const cms = await ConversationMember.find(
      { conversation: convo._id },
      { userId: 1 }
    ).lean()

    memberIds = (cms || [])
      .map(cm => cm?.userId)
      .filter(Boolean)
      .map(id => String(id))
  }

  // ===== Load users (senders + members) =====
  const senderIds = [
    ...new Set(
      messages
        .map(m => m?.senderId)
        .filter(Boolean)
        .map(id => String(id))
    )
  ]

  const combinedIds = [...new Set([...senderIds, ...memberIds])]

  let usersById = new Map()
  if (combinedIds.length) {
    const users = await User.find(
      { _id: { $in: combinedIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { fullName: 1, username: 1, avatarUrl: 1, status: 1 }
    ).lean()
    usersById = new Map(users.map(u => [String(u._id), u]))
  }

  if (convo.type === 'group') {
    groupMembers = memberIds.map(uid => {
      const u = usersById.get(String(uid))
      return u
        ? {
          id: u._id,
          fullName: u.fullName || null,
          username: u.username || null,
          avatarUrl: u.avatarUrl || null,
          status: u.status || null // friendship sẽ gắn sau
        }
        : {
          id: uid,
          fullName: null,
          username: null,
          avatarUrl: null,
          status: null
        }
    })
  }

  // Enrich messages.sender cho group
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

  const result = {
    conversation: {
      _id: convo._id,
      type: convo.type,
      direct: enrichedDirect,
      group: convo.type === 'group'
        ? { ...(convo.group || {}), members: groupMembers }
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

  // Gắn FRIENDSHIP (không còn isFriend)
  await markFriendshipOnConversation(userId, result.conversation)

  return result
}

const getUnreadSummary = async (userId) => {
  // Lấy membership của user
  const members = await ConversationMember.find({ userId })
    .select("conversation lastReadMessageSeq")
    .lean()

  // Lấy messageSeq của các conversation liên quan
  const convoIds = members.map(m => m.conversation)
  const convos = await Conversation.find({ _id: { $in: convoIds } })
    .select("_id messageSeq")
    .lean()

  const seqMap = Object.fromEntries(convos.map(c => [String(c._id), c.messageSeq || 0]))

  const items = members.map(m => {
    const cid = String(m.conversation)
    const unread = Math.max(0, (seqMap[cid] || 0) - (m.lastReadMessageSeq || 0))
    return { conversationId: cid, unread }
  })

  const totalConversations = items.reduce((acc, i) => acc + (i.unread > 0 ? 1 : 0), 0)
  const totalMessages = items.reduce((acc, i) => acc + i.unread, 0)

  return { items, totalConversations, totalMessages }
}

const deleteConversation = async (userId, conversationId) => {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error('Invalid conversationId')
    err.status = 400
    throw err
  }

  // Tìm conversation member
  const member = await ConversationMember.findOne({
    conversation: conversationId,
    userId: userId
  })

  if (!member) {
    const err = new Error('You are not a member of this conversation')
    err.status = 403
    throw err
  }

  // Lấy conversation để check type
  const conversation = await Conversation.findById(conversationId).lean()
  if (!conversation) {
    const err = new Error('Conversation not found')
    err.status = 404
    throw err
  }

  // Lấy messageSeq hiện tại để làm mốc
  const currentSeq = conversation.messageSeq || 0

  // Soft delete conversation cho user này
  member.deletedAt = new Date()
  member.deletedAtSeq = currentSeq
  await member.save()

  // Cập nhật tất cả tin nhắn trong conversation này - thêm user vào deletedFor
  await Message.updateMany(
    { conversationId: conversationId },
    {
      $addToSet: {
        deletedFor: {
          userId: new mongoose.Types.ObjectId(userId),
          deletedAt: new Date()
        }
      }
    }
  )

  return {
    ok: true,
    message: 'Conversation deleted successfully'
  }
}

const leaveGroup = async (userId, conversationId, io) => {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error('Invalid conversationId')
    err.status = 400
    throw err
  }

  // Tìm conversation
  const conversation = await Conversation.findById(conversationId).lean()
  if (!conversation) {
    const err = new Error('Conversation not found')
    err.status = 404
    throw err
  }

  // Chỉ cho phép leave group
  if (conversation.type !== 'group') {
    const err = new Error('You can only leave group conversations')
    err.status = 400
    throw err
  }

  // Tìm member record
  const member = await ConversationMember.findOne({
    conversation: conversationId,
    userId: userId
  })

  if (!member) {
    const err = new Error('You are not a member of this group')
    err.status = 403
    throw err
  }

  // Lấy thông tin user để thông báo
  const user = await User.findById(userId).select('fullName username avatarUrl').lean()
  const userName = user?.fullName || user?.username || 'Someone'

  // Hard delete khỏi conversation_members
  await ConversationMember.deleteOne({
    conversation: conversationId,
    userId: userId
  })

  // Tạo tin nhắn thông báo
  const notificationMessage = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    seq: conversation.messageSeq + 1,
    senderId: new mongoose.Types.ObjectId(userId),
    type: 'notification',
    body: {
      text: `${userName} đã rời khỏi nhóm`
    },
    createdAt: new Date()
  })

  // Cập nhật messageSeq của conversation
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $inc: { messageSeq: 1 },
      $set: {
        lastMessage: {
          seq: conversation.messageSeq + 1,
          messageId: notificationMessage._id,
          type: 'notification',
          textPreview: `${userName} đã rời khỏi nhóm`,
          senderId: userId,
          createdAt: new Date()
        },
        updatedAt: new Date()
      }
    }
  )

  // Emit notification cho các thành viên còn lại
  if (io) {
    io.to(`conversation:${conversationId}`).emit('member:left', {
      conversationId,
      userId,
      userName,
      message: {
        _id: notificationMessage._id,
        conversationId,
        seq: conversation.messageSeq + 1,
        type: 'notification',
        body: { text: `${userName} đã rời khỏi nhóm` },
        senderId: userId,
        createdAt: notificationMessage.createdAt
      }
    })
  }

  return {
    ok: true,
    message: 'Left group successfully'
  }
}
async function assertIsMember(userId, conversationId) {
  const cm = await ConversationMember.findOne({ userId, conversation: conversationId, deletedAt: null }).lean();
  if (!cm) {
    const err = new Error("You are not a member of this conversation");
    err.status = 403;
    throw err;
  }
}

async function listConversationMedia({ userId, conversationId, type, page, limit, q }) {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error("Invalid conversationId");
    err.status = 400;
    throw err;
  }

  // phải là thành viên
  await assertIsMember(userId, conversationId);

  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(50, Number(limit) || 24));
  const skip = (p - 1) * l;

  const filter = { conversationId: new mongoose.Types.ObjectId(conversationId) };
  if (type && ["image", "video", "audio", "file"].includes(type)) {
    filter.type = type;
  }
  // search theo filename (tuỳ chọn)
  if (q && q.trim()) {
    filter.$text = { $search: q.trim() };
  }

  const [items, total] = await Promise.all([
    Media.find(filter, {
      url: 1,
      type: 1,
      uploadedAt: 1,
      uploaderId: 1,
      metadata: 1
    })
    .sort({ uploadedAt: -1, _id: -1 })
    .skip(skip)
    .limit(l)
    .lean(),
    Media.countDocuments(filter)
  ]);

  const hasMore = p * l < total;

  // quick preview: 6 ảnh/video mới nhất để gắn vào “Ảnh/Video”
  const quickPreview = await Media.find(
    { conversationId, type: { $in: ["image", "video"] } },
    { url: 1, type: 1, uploadedAt: 1, metadata: 1 }
  )
  .sort({ uploadedAt: -1, _id: -1 })
  .limit(6)
  .lean();

  // summary: đếm theo type (để render badge tab)
  const byTypeAgg = await Media.aggregate([
    { $match: { conversationId: new mongoose.Types.ObjectId(conversationId) } },
    { $group: { _id: "$type", count: { $sum: 1 } } }
  ]);
  const summary = byTypeAgg.reduce((acc, it) => (acc[it._id] = it.count, acc), {});

  return {
    page: p,
    limit: l,
    total,
    hasMore,
    items,
    quickPreview,
    summary // { image: n, video: n, audio: n, file: n }
  };
}

const ALLOWED_HOURS = [2, 4, 8, 12, 24];

function calcMutedUntil(duration) {
  if (duration === "forever") return null;
  const h = Number(duration);
  if (!ALLOWED_HOURS.includes(h)) {
    const err = new Error("Invalid duration");
    err.status = 400;
    throw err;
  }
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d;
}

async function updateNotificationSettings({ userId, conversationId, muted, duration }) {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error("Invalid conversationId");
    err.status = 400;
    throw err;
  }
  const cm = await ConversationMember.findOne({ conversation: conversationId, userId });
  if (!cm) {
    const err = new Error("Not a member");
    err.status = 404;
    throw err;
  }

  if (muted) {
    cm.notifications.muted = true;
    cm.notifications.mutedUntil = calcMutedUntil(duration); // null nếu "forever"
  } else {
    cm.notifications.muted = false;
    cm.notifications.mutedUntil = null;
  }
  await cm.save();

  return {
    conversationId,
    muted: cm.notifications.muted,
    mutedUntil: cm.notifications.mutedUntil
  };
}

async function isMemberMutedNow({ userId, conversationId }) {
  const cm = await ConversationMember.findOne({ conversation: conversationId, userId })
  .select("notifications")
  .lean();
  if (!cm?.notifications?.muted) return false;
  const until = cm.notifications.mutedUntil;
  return !until || new Date(until) > new Date();
}
export const conversationService = {
  listConversationMedia,
  createConversation,
  getConversation,
  fetchConversationDetail,
  getUnreadSummary,
  deleteConversation,
  leaveGroup,
  updateNotificationSettings,
  isMemberMutedNow
}