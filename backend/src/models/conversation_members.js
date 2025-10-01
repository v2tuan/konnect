import mongoose from "mongoose";

let conversationMemberSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true, index: true },
  nickname: String,
  role: { type: String, enum: ["member", "admin", "owner"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
  lastReadMessageSeq: { type: Number, default: 0 },

  // ?? Th�m c?u h�nh th�ng b�o theo t?ng th�nh vi�n
  notifications: {
    muted: { type: Boolean, default: false },
    // null = vinh vi?n; n?u c� ng�y th� h?t mute khi now >= mutedUntil
    mutedUntil: { type: Date, default: null }
  },

  deletedAt: {
    type: Date,
    default: null
  },
  deletedAtSeq: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
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
