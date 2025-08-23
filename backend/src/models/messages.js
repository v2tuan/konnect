import mongoose from "mongoose";

let mediaSchema = new mongoose.Schema({
    mediaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    },
    mimeType: {
        type: String
    },
    size: {
        type: Number
    },
    thumbnailUrl: {
        type: String
    }
}, { _id: false });

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
    media: mediaSchema,
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