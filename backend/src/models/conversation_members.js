import mongoose from "mongoose";

let conversationMemberSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  lastReadMessageSeq: {
    type: Number,
    default: 0
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

let ConversationMember = mongoose.model('ConversationMember', conversationMemberSchema);
export default ConversationMember;