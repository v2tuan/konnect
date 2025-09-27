// src/models/media.js
import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    type: {
      type: String, // 'image' | 'file' | 'audio' ...
      required: true,
    },
    url: { type: String, required: true },
    metadata: {
      filename: String,
      size: Number,
      mimetype: String,
      width: Number,
      height: Number,
      duration: Number, // với audio/video nếu có
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Hot-reload safe: dùng lại model nếu đã đăng ký
export default mongoose.models.Media || mongoose.model('Media', mediaSchema);
