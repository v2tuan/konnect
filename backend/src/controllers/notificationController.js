// controllers/notification.controller.js
import {notificationService} from "../services/notificationService";


const markAllRead = async (req, res, next) => {
  try {
    const userId = req.userId // ✅ dùng đúng field
    if (!userId) return res.status(401).json({message: "Unauthorized"})

    const {type = null, conversationId = null} = req.body || {}
    const updated = await notificationService.markAllAsRead({userId, type, conversationId})

    // (khuyến nghị) bắn socket để các tab user sync ngay khay chuông
    req.io?.to?.(`user:${userId}`)?.emit("notification:mark-all-read", {
      type: type || null,
      conversationId: conversationId || null,
      updated
    })

    return res.json({ok: true, updated})
  } catch (e) {
    console.error("[notificationController][markAllRead] error:", e.message)
    next(e)
    return res.status(500).json({message: e.message})
  }
}

const list = async (req, res, next) => {
  try {
    const userId = req.userId // ✅ thống nhất
    if (!userId) return res.status(401).json({message: "Unauthorized"})

    const {
      cursor = null,
      limit = 20,
      onlyUnread = "false",
      type = null,
      conversationId = null
    } = req.query

    const items = await notificationService.list({
      userId,
      cursor,
      limit: Number(limit) || 20,
      onlyUnread: String(onlyUnread) === "true",
      type: type || null,
      conversationId: conversationId || null
    })

    return res.json({
      items,
      nextCursor: items.length ? items[items.length - 1]._id : null
    })
  } catch (e) {
    console.error("[notificationController][list] error:", e.message)
    next(e)
    return res.status(500).json({message: e.message})
  }
}

const markRead = async (req, res, next) => {
  try {
    const userId = req.userId // ✅ thống nhất
    if (!userId) return res.status(401).json({message: "Unauthorized"})

    const {ids = []} = req.body || {}
    const updated = await notificationService.markAsRead({
      userId,
      ids,
      io: req.io // ⬅️ Thêm dòng này
    })
    return res.json({updated})
  } catch (e) {
    console.error("[notificationController][markRead] error:", e.message)
    next(e)

    return res.status(500).json({message: e.message})
  }
}
const notifyMessage = async (req, res) => {
  try {
    const authUserId = req.userId; // người đang gọi API (sender mặc định)
    if (!authUserId) return res.status(401).json({message: "Unauthorized"});

    const {
      conversationId,
      // Một trong hai:
      message: messagePayload = null,  // message đã có đủ _id, type, body, seq, senderId
      messageId = null,                // nếu không có message payload thì truyền messageId
      senderId = authUserId,           // fallback: lấy từ auth user
      senderName = req.user?.fullName || req.user?.username || "Ai đó",
    } = req.body || {};

    if (!conversationId) {
      return res.status(400).json({message: "conversationId is required"});
    }

    // Lấy message (ưu tiên payload, nếu không có thì load bằng messageId)
    let message = messagePayload;
    if (!message) {
      if (!messageId) {
        return res.status(400).json({message: "Either message or messageId is required"});
      }
      const loaded = await Message.findById(messageId)
      .select("_id type body seq conversationId senderId createdAt")
      .lean();
      if (!loaded) return res.status(404).json({message: "Message not found"});
      if (String(loaded.conversationId) !== String(conversationId)) {
        return res.status(400).json({message: "messageId does not belong to conversationId"});
      }
      message = loaded;
    }

    // Nếu client không truyền senderId, dùng từ message/sender hoặc auth user
    const finalSenderId = senderId || message.senderId || authUserId;

    // Gọi service để tạo notification cho các thành viên còn lại
    const notifs = await notificationService.notifyMessage({
      conversationId,
      message,
      senderId: finalSenderId,
      senderName,
    });

    // (tuỳ chọn) Socket emit ở đây nếu bạn muốn:
    // notifs.forEach(n => io.to(`user:${n.receiverId}`).emit('notification:new', n));

    return res.json({
      ok: true,
      created: notifs.length,
      items: notifs,
    });
  } catch (e) {
    console.error("[notificationMessageController][notifyMessage] error:", e.message);
    return res.status(500).json({message: e.message});
  }
};
export const notificationController = {
  list,
  markRead,
  markAllRead,
  notifyMessage
};
