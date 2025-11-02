import ConversationMember from "~/models/conversation_members";

/** Phát 1 event tới:
 *  - Room cuộc trò chuyện: conversation:<id> (ai đang mở phòng thấy ngay)
 *  - Toàn bộ user rooms của members: user:<userId> (để list ngoài cũng cập nhật)
 */
export async function emitToConvoAndUsers(io, conversationId, event, payload) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit(event, payload);

  try {
    const members = await ConversationMember.find({
      conversation: conversationId,
      deletedAt: null
    }).select("userId").lean();

    members.forEach(m => {
      io.to(`user:${m.userId}`).emit(event, payload);
    });
  } catch (e) {
    console.error("[emitToConvoAndUsers] failed:", e.message);
  }
}
