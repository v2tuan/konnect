import Notification from "../models/notifications";
import ConversationMember from "../models/conversation_members";
import Block from "../models/blocks";

/** Helpers (nội bộ) */
const isBlocked = async (receiverId, senderId) => {
  try {
    const bl = await Block.findOne({userId: receiverId, blockedUserId: senderId}).lean();
    return !!bl;
  } catch (e) {
    // nếu DB lỗi, fallback coi như không block để không chặn flow chính (tuỳ bạn muốn throw)
    console.error("[notification][isBlocked] error:", e.message);
    return false;
  }
};

const safeCreate = async (notif) => {
  try {
    const doc = await Notification.create(notif);
    return doc.toJSON();
  } catch (e) {
    console.error("[notification][create] failed:", e.message);
    throw e; // giữ hành vi fail-fast cho tầng gọi trên nếu muốn bắt
  }
};

// Upsert 1 read-receipt / (receiver, conversation, reader) để không spam
const upsertReadReceipt = async ({
                                   receiverId,
                                   senderId, // readerId
                                   conversationId,
                                   lastReadSeq,
                                   lastReadMessageId,
                                   title,
                                   content,
                                   extra = {},
                                 }) => {
  try {
    if (await isBlocked(receiverId, senderId)) return null;

    const doc = await Notification.findOneAndUpdate(
      {receiverId, senderId, conversationId, type: "message_read"},
      {
        $set: {
          title,
          content,
          lastReadSeq: lastReadSeq ?? null,
          lastReadMessageId: lastReadMessageId ?? null,
          extra,
          status: "unread",
          updatedAt: new Date(),
        },
        $setOnInsert: {type: "message_read", createdAt: new Date()},
      },
      {new: true, upsert: true}
    ).lean();

    return doc;
  } catch (e) {
    console.error("[notification][upsertReadReceipt] failed:", e.message);
    throw e;
  }
};

/** ===== Public APIs (giống style userService) ===== */

const create = async ({
                        receiverId,
                        senderId,
                        type,
                        title = "",
                        content = "",
                        conversationId = null,
                        messageId = null,
                        extra = {},
                      }) => {
  try {
    if (await isBlocked(receiverId, senderId)) return null;
    return await safeCreate({
      receiverId,
      senderId,
      type,
      title,
      content,
      conversationId,
      messageId,
      extra,
      status: "unread",
    });
  } catch (e) {
    throw e;
  }
};

// 1) Có tin nhắn mới → thông báo tới các thành viên khác
const notifyMessage = async ({conversationId, message, senderId, senderName}) => {
  try {
    let content = "";
    switch (message.type) {
      case "text":
        content = message.body?.text || "Tin nhắn mới";
        break;
      case "image":
        content = "Đã gửi một ảnh";
        break;
      case "file":
        content = "Đã gửi một tệp";
        break;
      default:
        content = "Tin nhắn mới";
    }

    const members = await ConversationMember.find({conversation: conversationId})
    .select("userId")
    .lean();

    const tasks = members
    .filter((m) => String(m.userId) !== String(senderId))
    .map((m) =>
      create({
        receiverId: m.userId,
        senderId,
        type: "message",
        title: senderName || "Tin nhắn mới",
        content,
        conversationId,
        messageId: message._id,
        extra: {seq: message.seq, senderId, conversationId},
      })
    );

    const created = await Promise.all(tasks);
    return created.filter(Boolean);
  } catch (e) {
    console.error("[notification][notifyMessage] failed:", e.message);
    throw e;
  }
};

// 2) Ai đó đã đọc tới (read-receipt) → thông báo cho các thành viên khác
const notifyMessageRead = async ({
                                   conversationId,
                                   readerId,
                                   readerName,
                                   lastReadSeq = null,
                                   lastReadMessageId = null,
                                 }) => {
  try {
    const members = await ConversationMember.find({conversation: conversationId})
    .select("userId")
    .lean();

    const title = "Đã đọc tin nhắn";
    const content = lastReadSeq
      ? `${readerName || "Ai đó"} đã xem tới #${lastReadSeq}`
      : `${readerName || "Ai đó"} đã xem tin nhắn`;

    const tasks = members
    .filter((m) => String(m.userId) !== String(readerId))
    .map((m) =>
      upsertReadReceipt({
        receiverId: m.userId,
        senderId: readerId,
        conversationId,
        lastReadSeq,
        lastReadMessageId,
        title,
        content,
        extra: {readerId, lastReadSeq, lastReadMessageId, conversationId},
      })
    );

    const upserts = await Promise.all(tasks);
    return upserts.filter(Boolean);
  } catch (e) {
    console.error("[notification][notifyMessageRead] failed:", e.message);
    throw e;
  }
};

// 3) List / mark read (khay thông báo)
const list = async ({userId, cursor = null, limit = 20, onlyUnread = false, type = null, conversationId = null}) => {
  try {
    const q = {receiverId: userId};
    if (onlyUnread) q.status = "unread";
    if (type) q.type = type;
    if (conversationId) q.conversationId = conversationId;
    if (cursor) q._id = {$lt: cursor};

    return await Notification.find(q).sort({_id: -1}).limit(Math.min(Number(limit) || 20, 100)).lean();
  } catch (e) {
    console.error("[notification][list] failed:", e.message);
    throw e;
  }
};

const markAsRead = async ({userId, ids}) => {
  try {
    if (!Array.isArray(ids) || !ids.length) return 0;
    const res = await Notification.updateMany(
      {receiverId: userId, _id: {$in: ids}, status: "unread"},
      {$set: {status: "read", readAt: new Date(), updatedAt: new Date()}}
    );
    return res.modifiedCount || 0;
  } catch (e) {
    console.error("[notification][markAsRead] failed:", e.message);
    throw e;
  }
};

const markAllAsRead = async ({userId, type = null, conversationId = null}) => {
  try {
    const q = {receiverId: userId, status: "unread"};
    if (type) q.type = type;
    if (conversationId) q.conversationId = conversationId;

    const res = await Notification.updateMany(q, {
      $set: {status: "read", readAt: new Date(), updatedAt: new Date()},
    });
    return res.modifiedCount || 0;
  } catch (e) {
    console.error("[notification][markAllAsRead] failed:", e.message);
    throw e;
  }
};

export const notificationService = {
  create,
  notifyMessage,
  notifyMessageRead,
  list,
  markAsRead,
  markAllAsRead,
};
