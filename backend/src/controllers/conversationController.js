import {notificationService as NotificationService} from "~/services/notificationService";
import ConversationMember from "~/models/conversation_members";
import Message from "~/models/messages";
import Conversation from "~/models/conversations";

const {StatusCodes} = require("http-status-codes")
const {conversationService} = require("~/services/conversationService")
import { SYSTEM_SENDER, SYSTEM_USER_ID } from "~/utils/constant";
import User from "~/models/user";
import { cloudinaryProvider } from "~/providers/CloudinaryProvider_v2";
import {emitToConvoAndUsers} from "~/utils/realtime";
export const createConversation = async (req, res, next) => {
  try {
    const convo = await conversationService.createConversation(req.body, req.file, req.userId, req.io)
    res.json({ conversation: convo })
  } catch (e) {
    next(e)
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

    const { beforeSeq, limit = 30 } = req.query

    const result = await conversationService.fetchConversationDetail(
      userId,
      conversationId,
      parseInt(limit),
      beforeSeq ? parseInt(beforeSeq) : undefined
    )

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

const listConversationMedia = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({message: "Unauthorized"});

    const conversationId = req.params.id;

    // CHANGED: Lấy thêm senderId, startDate, endDate từ query
    const {type, page, limit, senderId, startDate, endDate} = req.query;

    const result = await conversationService.listConversationMedia({
      userId,
      conversationId,
      type,
      page,
      limit,
      // CHANGED: Truyền thêm tham số
      senderId,
      startDate,
      endDate
    });

    return res.status(StatusCodes.OK).json(result);
  } catch (e) {
    next(e);
  }
};

const handleConversationActions = async (req, res, next) => {
  try {
    const userId = req.userId
    const conversationId = req.params.conversationId
    const { action } = req.body // "delete" hoặc "leave"

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Unauthorized'
      })
    }

    if (!action) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'action is required. Use "delete" or "leave"'
      })
    }

    // Handle delete conversation
    if (action === "delete") {
      const result = await conversationService.deleteConversation(userId, conversationId)
      return res.status(StatusCodes.OK).json(result)
    }

    // Handle leave group
    if (action === "leave") {
      const result = await conversationService.leaveGroup(userId, conversationId, req.io)
      return res.status(StatusCodes.OK).json(result)
    }

    //handle add memeber to group
    if (action === "add") {
      const { memberIds } = req.body
      if (!memberIds) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'memberIds is required' })
      }
      const result = await conversationService.addMembersToGroup({
        actorId: userId,
        conversationId,
        memberIds,
        io: req.io
      })
      return res.status(StatusCodes.OK).json(result)
    }

    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Invalid action. Use "delete" or "leave"'
    })

  } catch (error) {
    next(error)
  }
}
const updateNotifications = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });

    const conversationId = req.params.id;
    const { muted, duration } = req.body || {};
    // muted: boolean; duration: 2|4|8|12|24|"forever" (required khi muted=true)

    if (muted === true && !duration) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "duration is required when muted=true" });
    }

    const result = await conversationService.updateNotificationSettings({
      userId,
      conversationId,
      muted: !!muted,
      duration: muted ? duration : null
    });

    // Sync realtime cho các tab của chính user
    req.io?.to?.(`user:${userId}`)?.emit("conversation:mute-changed", result);

    return res.status(StatusCodes.OK).json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
};
// Đổi tên / Đổi avatar nhóm
const updateGroupMeta = async (req, res, next) => {
  try {
    const userId = req.userId;
    const conversationId = req.params.conversationId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // load conversation
    const convo = await Conversation.findById(conversationId).lean();
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    // chỉ group mới đổi tên / avatar
    if (convo.type !== "group") {
      return res.status(400).json({ message: "Only group conversations support meta update" });
    }

    // kiểm tra quyền: admin mới được sửa
    const cm = await ConversationMember.findOne({
      conversation: conversationId,
      userId,
      deletedAt: null
    }).lean();

    if (!cm) return res.status(403).json({ message: "Not a member of this conversation" });
    if (!["admin"].includes(cm.role)) {
      return res.status(403).json({ message: "Only admin can update group meta" });
    }

    // build update
    const $set = {};
    const now = new Date();

    // tên nhóm
    const displayName = (req.body?.displayName || "").trim();
    if (displayName) $set["group.name"] = displayName;

    // avatar (multer đặt file vào req.file)
    let uploadedUrl = null;
    if (req.file) {
      const up = await cloudinaryProvider.uploadSingle(req.file, {
        folder: `konnect/${conversationId}/group_avatars`,
        resource_type: "auto"
      });
      uploadedUrl = up?.secure_url || null;
      if (uploadedUrl) $set["group.avatarUrl"] = uploadedUrl;
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    $set.updatedAt = now;

    await Conversation.updateOne({ _id: conversationId }, { $set });

    // payload trả về cho FE
    const out = {
      conversationId,
      displayName: displayName || convo.group?.name || "Group",
      conversationAvatarUrl: uploadedUrl || convo.group?.avatarUrl || null,
      updatedAt: now
    };

    // realtime cho các member
    req.io?.to?.(`conversation:${conversationId}`)?.emit("conversation:meta-updated", out);

    return res.status(200).json(out); // ✅ PHẢI CÓ DÒNG NÀY ĐỂ TRẢ VỀ CHO CLIENT
  } catch (e) {
    next(e);
  }
};

// Xoá thành viên khỏi nhóm
const removeMembers = async (req, res, next) => {
  try {
    const actorId = req.userId;
    const conversationId = req.params.conversationId;
    const { memberIds = [] } = req.body || {};

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo || convo.type !== 'group') return res.status(404).json({ message: 'Group not found' });

    const actor = await ConversationMember.findOne({ conversation: conversationId, userId: actorId, deletedAt: null }).lean();
    if (!actor || actor.role !== 'admin') return res.status(403).json({ message: 'Only admin can remove members' });

    const ids = [...new Set(memberIds.map(String))].filter(id => id !== String(actorId));
    if (!ids.length) return res.json({ ok: true, removed: [] });

    await ConversationMember.deleteMany({ conversation: conversationId, userId: { $in: ids } });

    // system message
    const now = new Date();
    const actorUser = await User.findById(actorId).select('fullName username').lean();
    const users = await User.find({ _id: { $in: ids } }).select('fullName username').lean();
    const actorName = actorUser?.fullName || actorUser?.username || 'Ai đó';
    const removedNames = users.map(u => u.fullName || u.username || 'Người dùng').join(', ');

    const updated = await Conversation.findOneAndUpdate(
      { _id: conversationId },
      { $inc: { messageSeq: 1 }, $set: { updatedAt: now } },
      { new: true, lean: true }
    );
    const seq = updated.messageSeq;

    const text = `${actorName} đã xoá ${removedNames} khỏi nhóm`;
    const sysMsg = await Message.create({
      conversationId, seq, senderId: SYSTEM_USER_ID,
      type: 'notification', body: { text }, createdAt: now
    });

    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { lastMessage: { seq, messageId: sysMsg._id, type: 'notification', textPreview: text, senderId: SYSTEM_USER_ID, createdAt: now } } }
    );

    // realtime
    req.io?.to?.(`conversation:${conversationId}`)?.emit('member:removed', { conversationId, removedIds: ids });
    req.io?.to?.(`conversation:${conversationId}`)?.emit('message:new', {
      conversationId,
      message: {
        _id: sysMsg._id, conversationId, seq,
        type: 'notification', body: { text },
        senderId: SYSTEM_USER_ID, sender: SYSTEM_SENDER, createdAt: now
      }
    });

    // đẩy badge update cho người còn lại (tuỳ chọn)
    return res.json({ ok: true, removed: ids });
  } catch (e) {
    next(e);
  }
};

// Đổi role thành viên
const updateMemberRole = async (req, res, next) => {
  try {
    const actorId = req.userId;
    const conversationId = req.params.conversationId;
    const { memberId, role } = req.body || {}; // 'admin' | 'member'

    if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo || convo.type !== 'group') return res.status(404).json({ message: 'Group not found' });

    const actor = await ConversationMember.findOne({ conversation: conversationId, userId: actorId, deletedAt: null }).lean();
    if (!actor || actor.role !== 'admin') return res.status(403).json({ message: 'Only admin can change roles' });

    await ConversationMember.updateOne({ conversation: conversationId, userId: memberId }, { $set: { role } });

    req.io?.to?.(`conversation:${conversationId}`)?.emit('member:role-changed', { conversationId, memberId, role });
    return res.json({ ok: true, memberId, role });
  } catch (e) {
    next(e);
  }
};
const updateMemberNickname = async (req, res, next) => {
  try {
    const actorId = req.userId;
    const conversationId = req.params.conversationId;
    const { memberId, nickname } = req.body || {};

    const nick = (nickname ?? "").trim();
    if (nick.length > 50) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Nickname is too long (<= 50 chars)" });

    // Chỉ group mới có nickname
    const convo = await Conversation.findById(conversationId).lean();
    if (!convo) return res.status(404).json({ message: "Conversation not found" });
    if (convo.type !== "group") return res.status(400).json({ message: "Only group conversations support nicknames" });

    // Cả actor và target đều phải là member
    const [actorCM, targetCM] = await Promise.all([
      ConversationMember.findOne({ conversation: conversationId, userId: actorId, deletedAt: null }).lean(),
      ConversationMember.findOne({ conversation: conversationId, userId: memberId, deletedAt: null }).lean(),
    ]);
    if (!actorCM) return res.status(StatusCodes.FORBIDDEN).json({ message: "You are not a member of this conversation" });
    if (!targetCM) return res.status(StatusCodes.NOT_FOUND).json({ message: "Target member not found in this conversation" });

    // Lấy info user để render text
    const [actorUser, targetUser] = await Promise.all([
      User.findById(actorId).select("fullName username").lean(),
      User.findById(memberId).select("fullName username").lean()
    ]);
    const actorName = actorUser?.fullName || actorUser?.username || "Ai đó";
    const targetName = targetUser?.fullName || targetUser?.username || "Người dùng";

    // Cập nhật nickname (null nếu xoá)
    const newNick = nick || null;
    await ConversationMember.updateOne(
      { conversation: conversationId, userId: memberId, deletedAt: null },
      { $set: { nickname: newNick, updatedAt: new Date() } }
    );

    // === Tạo system message giống logic removeMembers ===
    const now = new Date();
    const updated = await Conversation.findOneAndUpdate(
      { _id: conversationId },
      { $inc: { messageSeq: 1 }, $set: { updatedAt: now } },
      { new: true, lean: true }
    );
    const seq = updated.messageSeq;

    const actionText = newNick
      ? `${actorName} đã đặt biệt danh cho ${targetName} là "${newNick}"`
      : `${actorName} đã xóa biệt danh của ${targetName}`;
    const sysBody = {
      text: actionText,
      subtype: "nickname_changed",
      targetId: String(memberId),
      nickname: newNick
    };

    const sysMsg = await Message.create({
      conversationId,
      seq,
      senderId: SYSTEM_USER_ID,
      type: "notification",
      body: sysBody,
      createdAt: now
    });

    // Cập nhật lastMessage để list hội thoại nhảy lên
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessage: {
            seq,
            messageId: sysMsg._id,
            type: "notification",
            textPreview: actionText,
            senderId: SYSTEM_USER_ID,
            createdAt: now
          }
        }
      }
    );

    // === Socket emit ===
    // 1) Thay đổi nickname cho FE patch UI ngay
    console.log('🔊 Emitting nickname-changed event:', {
      room: `conversation:${conversationId}`,
      memberId: String(memberId),
      nickname: newNick
    })

    req.io?.to(`conversation:${conversationId}`)?.emit("member:nickname-changed", {
      conversationId: String(conversationId),
      memberId: String(memberId),
      nickname: newNick,
      updatedBy: String(actorId)
    })

    console.log('🔊 Emitting message:new event')
    req.io?.to(`conversation:${conversationId}`)?.emit("message:new", {
      conversationId,
      message: {
        _id: sysMsg._id,
        conversationId,
        seq,
        type: "notification",
        body: sysBody,
        senderId: SYSTEM_USER_ID,
        sender: SYSTEM_SENDER,
        createdAt: now
      }
    })

    return res.json({
      ok: true,
      memberId: String(memberId),
      nickname: newNick,
      systemMessageId: String(sysMsg._id),
      text: actionText
    })
  } catch (e) {
    next(e)
  }
};


export const conversationController = {
  createConversation,
  getConversation,
  fetchConversationDetail,
  readToLatest,
  getUnreadSummary,
  listConversationMedia,
  handleConversationActions,
  updateNotifications,
  updateGroupMeta,
  removeMembers,
  updateMemberRole,
  updateMemberNickname
}