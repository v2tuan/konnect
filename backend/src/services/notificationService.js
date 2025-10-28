import User from "../models/user"; // ⬅️ ĐẢM BẢO BẠN ĐÃ THÊM DÒNG NÀY
import Notification from "../models/notifications";
import ConversationMember from "../models/conversation_members";
import Block from "../models/blocks";
import { presence as presenceSingleton } from "../sockets/presence";

const presence = presenceSingleton ?? { isOnline: () => false, isViewing: () => false };

/* ========================= Helpers ========================= */
// ... (các hàm isBlocked, safeCreate, upsertReadReceipt, create không đổi)
const isBlocked = async (receiverId, senderId) => {
  try {
    const bl = await Block.findOne({ userId: receiverId, blockedUserId: senderId }).lean();
    return !!bl;
  } catch (e) {
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
    throw e;
  }
};

const upsertReadReceipt = async ({
                                   receiverId,
                                   senderId,
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
      { receiverId, senderId, conversationId, type: "message_read" },
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
        $setOnInsert: { type: "message_read", createdAt: new Date() },
      },
      { new: true, upsert: true }
    ).lean();
    return doc;
  } catch (e) {
    console.error("[notification][upsertReadReceipt] failed:", e.message);
    throw e;
  }
};

const create = async ({
                        receiverId,
                        senderId,
                        type,
                        title = "",
                        content = "",
                        conversationId = null,
                        messageId = null,
                        extra = {},
                        friendshipId = null,
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
      friendshipId,
      extra,
      status: "unread",
    });
  } catch (e) {
    throw e;
  }
};
/* =================== Friend Request Notify (ĐÃ SỬA) ================== */
/**
 * SỬA LỖI SOCKET:
 * Tự tìm thông tin user nếu `requesterName` không được truyền vào.
 */
const notifyFriendRequest = async ({
                                     requestId,
                                     requesterId,
                                     receiverId,
                                     requesterName,   // ⬅️ Thường bị null
                                     requesterAvatar, // ⬅️ Thường bị null
                                     io,
                                   }) => {
  try {
    if (await isBlocked(receiverId, requesterId)) return null;

    // --- Sửa từ đây ---
    let finalName = requesterName;
    let finalAvatar = requesterAvatar;
    let finalUsername = null; // Cần thêm username

    // Nếu tên/avatar không được cung cấp, hãy thử tải user
    if (!finalName || !finalAvatar) {
      try {
        const requester = await User.findById(requesterId).select("fullName username avatarUrl").lean();
        if (requester) {
          finalName = requester.fullName || requester.username;
          finalAvatar = requester.avatarUrl;
          finalUsername = requester.username; // Lấy username
        }
      } catch (userError) {
        console.error("[notifyFriendRequest] Failed to fetch requester details:", userError.message);
      }
    }

    // Fallback cuối cùng
    if (!finalName) finalName = "Ai đó";
    if (!finalUsername) finalUsername = "someone";

    const title = "Lời mời kết bạn";
    const content = `${finalName} đã gửi lời mời kết bạn cho bạn`;
    // --- Hết phần sửa logic ---

    const doc = await Notification.findOneAndUpdate(
      {
        receiverId: receiverId,    // ⬅️ Key 1: Người nhận
        senderId: requesterId,   // ⬅️ Key 2: Người gửi
        type: "friend_request" },
      {
        $set: {
          title,
          content,
          friendshipId: requestId, // ⬅️ Cập nhật friendshipId mới nhất (nếu nó bị tạo mới)
          extra: {
            requesterId,
            requesterName: finalName,
            requesterAvatar: finalAvatar,
            friendshipId: requestId, // ⬅️ Cập nhật cả ở đây
          },
          status: "unread", // ⬅️ Đặt lại là "unread"
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          receiverId: receiverId, // (Thêm đầy đủ key cho $setOnInsert)
          senderId: requesterId,
          type: "friend_request"
        },
      },
      { new: true, upsert: true } // ⬅️ upsert sẽ hoạt động đúng
    ).lean();

    io?.to?.(`user:${receiverId}`)?.emit?.("notification:new", {
      id: String(doc?._id),
      type: "friend_request",
      title,
      content, // ⬅️ Gửi content đúng
      receiverId: String(receiverId),
      friendshipId: String(requestId),
      extra: doc?.extra || {},
      createdAt: doc?.createdAt || new Date(),

      // Gửi object senderId với dữ liệu đã được fetch
      senderId: {
        id: String(requesterId),
        _id: String(requesterId),
        fullName: finalName,
        username: finalUsername, // ⬅️ Gửi username
        avatarUrl: finalAvatar
      },
      status: "unread" // (Hoặc dùng `doc.status` cũng được)
    });

    io?.to?.(`user:${receiverId}`)?.emit?.("notification:badge:inc", { by: 1 });
    return doc;
  } catch (e) {
    console.error("[notification][notifyFriendRequest] failed:", e.message);
    throw e;
  }
};

/* =================== Message New Notification =================== */
// ... (hàm notifyMessage không đổi)
const notifyMessage = async ({
                               conversationId,
                               message,
                               senderId,
                               senderName,
                               senderAvatar,
                               io,
                               presence, // optional override
                             }) => {
  try {
    // 1) Preview content
    let content = "Tin nhắn mới";
    if (message?.type === "text") {
      const raw = message?.body?.text || "";
      content = raw ? (raw.length > 120 ? raw.slice(0, 120) + "…" : raw) : "Tin nhắn mới";
    } else if (message?.type === "image") content = "Đã gửi một ảnh";
    else if (message?.type === "file") content = "Đã gửi một tệp";
    else if (message?.type === "audio") content = "Đã gửi một audio";

    // 2) Thành viên nhận (trừ người gửi)
    const members = await ConversationMember.find({
      conversation: conversationId,
      userId: { $ne: senderId },
    })
    .select("userId notifications")
    .lean();

    const now = new Date();
    const createdNotifs = [];

    for (const m of members) {
      const receiverId = String(m.userId);

      // Bỏ qua nếu đang xem phòng
      const viewing =
        (presence ?? presenceSingleton)?.isOnline?.(receiverId) &&
        (presence ?? presenceSingleton)?.isViewing?.(receiverId, conversationId);
      if (viewing) {
        io?.to?.(`user:${receiverId}`)?.emit?.("message:new", { conversationId, message });
        continue;
      }

      // mute?
      const muted =
        !!m.notifications?.muted &&
        (!m.notifications?.mutedUntil || new Date(m.notifications.mutedUntil) > now);

      // 3) Lưu notification (lịch sử + badge)
      const notif = await Notification.create({
        receiverId,
        senderId,
        type: "message",
        title: senderName || "Tin nhắn mới",
        content,
        conversationId,
        messageId: message._id,
        extra: {
          seq: message.seq,
          type: message.type,
          textPreview: message?.body?.text || "",
          senderId,
          senderName: senderName || null,
          senderAvatar: senderAvatar || null,
          conversationId,
        },
        status: "unread",
      });
      createdNotifs.push(notif);

      // 4) Emit theo muted
      if (muted) {
        io?.to?.(`user:${receiverId}`)?.emit?.("message:new", { conversationId, message });
      } else {
        io?.to?.(`user:${receiverId}`)?.emit?.("notification:new", {
          conversationId,
          message,
          senderName,
          senderAvatar,
        });
      }
    }

    return createdNotifs;
  } catch (e) {
    console.error("[notification][notifyMessage] failed:", e.message);
    throw e;
  }
};

/* ======================= Read Receipt ======================= */
// ... (hàm notifyMessageRead không đổi)
const notifyMessageRead = async ({
                                   conversationId,
                                   readerId,
                                   readerName,
                                   lastReadSeq = null,
                                   lastReadMessageId = null,
                                 }) => {
  try {
    const members = await ConversationMember.find({ conversation: conversationId })
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
        extra: { readerId, lastReadSeq, lastReadMessageId, conversationId },
      })
    );

    const upserts = await Promise.all(tasks);
    return upserts.filter(Boolean);
  } catch (e) {
    console.error("[notification][notifyMessageRead] failed:", e.message);
    throw e;
  }
};

/* ======================= Query & Mutate (ĐÃ SỬA) ====================== */
/**
 * SỬA LỖI HIỂN THỊ LIST:
 * Dùng .lean() và .map() để đảm bảo senderId (đã populate) là 1 object
 */
const list = async ({ userId, cursor = null, limit = 20, onlyUnread = false, type = null, conversationId = null }) => {
  try {
    const q = { receiverId: userId };
    if (onlyUnread) q.status = "unread";
    if (type) q.type = type;
    if (conversationId) q.conversationId = conversationId;
    if (cursor) q._id = { $lt: cursor };

    // 1. Thêm .lean()
    const docs = await Notification.find(q)
    .sort({ _id: -1 })
    .limit(Math.min(Number(limit) || 20, 100))
    .populate({
      path: "senderId",
      select: "fullName username avatarUrl"
    })
    .lean(); // ⬅️ THÊM .lean()

    // 2. Sửa lại hàm map để xử lý object (từ .lean())
    return docs.map(doc => ({
      ...doc,
      id: String(doc._id), // Đảm bảo trường `id` tồn tại
      // Đảm bảo senderId cũng có `id` nếu nó tồn tại
      senderId: doc.senderId ? {
        ...doc.senderId,
        id: String(doc.senderId._id)
      } : null
    }));
  } catch (e) {
    console.error("[notification][list] failed:", e.message);
    throw e;
  }
};

/* =================== markAsRead (Đã sửa) ================== */
// ... (hàm markAsRead của bạn đã đúng, giữ nguyên)
const markAsRead = async ({ userId, ids, io }) => { // ⬅️ Thêm `io` vào tham số
  try {
    if (!Array.isArray(ids) || !ids.length) return 0;

    const res = await Notification.updateMany(
      { receiverId: userId, _id: { $in: ids }, status: "unread" },
      { $set: { status: "read", readAt: new Date(), updatedAt: new Date() } }
    );

    // ⬇️ THÊM ĐOẠN NÀY:
    // Nếu cập nhật thành công, phát socket cho từng ID
    if (res.modifiedCount > 0 && io) {
      const room = `user:${userId}`

      ids.forEach(id => {
        io.to(room).emit("notification:updated", {
          id: id,
          status: "read"
        })
      })
    }

    return res.modifiedCount || 0;
  } catch (e) {
    console.error("[notification][markAsRead] failed:", e.message);
    throw e;
  }
};

/* =================== markAllAsRead (Không đổi) ================== */
// ... (hàm markAllAsRead không đổi)
const markAllAsRead = async ({ userId, type = null, conversationId = null }) => {
  try {
    const q = { receiverId: userId, status: "unread" };
    if (type) q.type = type;
    if (conversationId) q.conversationId = conversationId;
    const res = await Notification.updateMany(q, {
      $set: { status: "read", readAt: new Date(), updatedAt: new Date() },
    });
    return res.modifiedCount || 0;
  } catch (e) {
    console.error("[notification][markAllAsRead] failed:", e.message);
    throw e;
  }
};
/* =========================== Export ========================= */

export const notificationService = {
  create,
  notifyFriendRequest,
  notifyMessage,
  notifyMessageRead,
  list,
  markAsRead,
  markAllAsRead,
};