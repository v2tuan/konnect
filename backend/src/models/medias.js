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
        // enum: ['image', 'file'],
        // required: true
    },
    url: {
        type: String,
        required: true
    },
    metadata: { // Thông tin thêm về file
        filename: String,
        size: Number, // Kích thước file tính theo bytes
        mimetype: String // loại MIME (image/png, application/pdf, ...).
    },
    uploadedAt: { type: Date, default: Date.now }
});
let Media = mongoose.model('Media', mediaSchema);
export default Media;