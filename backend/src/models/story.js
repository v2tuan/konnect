import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bgColor: { type: String, default: "#000000" },
    media: {
      url: { type: String },
      type: { type: String }, // image | video
    },
    music: {
        name: { type: String },
        url: { type: String },
        artist: { type: String },
    },
    musicStyle: { type: String, enum: ["bar", "card", "waveform", "none"], default: "none" },
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // Tự động xoá sau 24 giờ
  },
  { timestamps: true }
);
export const Story = mongoose.model("Story", storySchema);