import mongoose from "mongoose";

let messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    seq: {
        type: Number,
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file', 'notification', 'audio'],
        required: true
    },
    body: {
        text: { type: String, default: '' }
    },
    media: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Media'
        }
    ],
    reactions: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            emoji: { type: String }  // ví dụ: '👍', '❤️', '😂'
        }
    ],
    recalled: {
        type: Boolean,
        default: false
    },
    deletedFor: [
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: { type: Date, default: Date.now }
    }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

let Message = mongoose.model('Message', messageSchema);
export default Message;