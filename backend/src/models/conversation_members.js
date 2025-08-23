import mongoose from "mongoose";

let conversationMemberSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nickname: {
        type: String
    },
    role: {
        type: String,
        enum: ['member', 'admin', 'owner'],
        default: 'member'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastReadMessageSeq: {
        type: Number,
        default: 0
    }
});

let ConversationMember = mongoose.model('ConversationMember', conversationMemberSchema);
export default ConversationMember;