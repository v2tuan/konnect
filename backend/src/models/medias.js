import mongoose from "mongoose";

let mediaSchema = new mongoose.Schema({
    uploaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    type: {
        type: String,
        enum: ['image', 'file'],
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
let Media = mongoose.model('Media', mediaSchema);
export default Media;