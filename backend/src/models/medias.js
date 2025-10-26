// src/models/media.js
import mongoose from "mongoose"

const { Schema, model, models } = mongoose

const MediaSchema = new Schema(
  {
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    senderId:       { type: mongoose.Types.ObjectId, ref: "User", required: true },
    sentAt:   { type: Date },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["image", "file", "audio", "video"], // tùy bạn mở rộng
      required: true
    },
    url: { type: String, required: true },
    metadata: {
      filename: String,
      size: Number,
      mimetype: String,
      width: Number,
      height: Number,
      duration: Number // với audio/video nếu có
    },
    uploadedAt: { type: Date, default: Date.now }
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "medias" // đặt rõ tên collection cho nhất quán
  },

)
// các index truy vấn phổ biến
MediaSchema.index({ conversationId: 1, type: 1, uploadedAt: -1 });
MediaSchema.index({ "metadata.filename": "text" }, { name: "media_filename_text" });

// Hot-reload safe
export const Media = models.Media || model("Media", MediaSchema)
export default Media
