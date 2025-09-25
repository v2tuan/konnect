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
        enum: ['text', 'image', 'file', 'notification'],
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
    recalled: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

let Message = mongoose.model('Message', messageSchema);
export default Message;