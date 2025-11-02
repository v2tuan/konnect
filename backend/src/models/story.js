import mongoose from "mongoose";

const positionSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  { _id: false }
);

const scaledSizeSchema = new mongoose.Schema(
  {
    w: { type: Number, default: 0 },
    h: { type: Number, default: 0 },
  },
  { _id: false }
);

const backgroundSchema = new mongoose.Schema(
  {
    image: { type: String },
    color: { type: String, default: "#000000" },
    scale: { type: Number, default: 1 },
    rotation: { type: Number, default: 0 },
    flipped: { type: Boolean, default: false },
    position: positionSchema,
    scaledSize: scaledSizeSchema,
  },
  { _id: false }
);

const layerSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    type: {
      type: String,
      enum: ["text", "sticker", "image", "music"],
      required: true,
    },
    content: { type: String }, // text layer
    url: { type: String },     // image or sticker layer
    name: { type: String },    // music layer
    x: { type: Number },
    y: { type: Number },
    color: { type: String },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // --- Background info ---
    background: backgroundSchema,

    // --- Editable layers (text, stickers, etc.) ---
    layers: [layerSchema],

    // --- Optional music ---
    music: {
      name: { type: String },
      url: { type: String },
      artist: { type: String },
    },

    musicStyle: {
      type: String,
      enum: ["bar", "card", "waveform", "none"],
      default: "none",
    },

    // --- Story lifetime ---
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // Auto delete after 24h
  },
  { timestamps: true }
);

export const Story = mongoose.model("Story", storySchema);
