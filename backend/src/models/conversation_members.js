import mongoose from "mongoose";

const conversationMemberSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true, index: true },
  nickname: String,
  role: { type: String, enum: ["member", "admin", "owner"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
  lastReadMessageSeq: { type: Number, default: 0 },

  // 🔕 Thêm cấu hình thông báo theo từng thành viên
  notifications: {
    muted: { type: Boolean, default: false },
    // null = vĩnh viễn; nếu có ngày thì hết mute khi now >= mutedUntil
    mutedUntil: { type: Date, default: null }
  }
});

conversationMemberSchema.methods.isMutedNow = function () {
  if (!this.notifications?.muted) return false;
  const until = this.notifications?.mutedUntil;
  return !until || until > new Date();
};

conversationMemberSchema.index({ conversation: 1, userId: 1 }, { unique: true });
conversationMemberSchema.index({ userId: 1, "notifications.muted": 1 });
conversationMemberSchema.index({ userId: 1, conversation: 1, "notifications.mutedUntil": 1 });

const ConversationMember = mongoose.model("ConversationMember", conversationMemberSchema);
export default ConversationMember;
