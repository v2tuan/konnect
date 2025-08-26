import mongoose from "mongoose";

let conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['direct', 'group', 'cloud'],
        required: true
    },
    direct: {
        userA: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        userB: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    group: {
        name: {
            type: String,
            default: 'New Group'
        },
        avatarUrl: {
            type: String,
            default: 'https://example.com/default-group-avatar.png' // Default group avatar URL
        }
    },
    messageSeq: {
        type: Number,
        default: 0
    },
    lastMessage: {
        seq: { type: Number, default: 0 },
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
        type: { type: String, enum: ['text', 'image', 'file', 'notification'], default: 'text' },
        textPreview: { type: String, default: '' },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: null }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: null
    }
});

conversationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

let Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;