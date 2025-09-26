// models/media.js
const mediaSchema = new mongoose.Schema({
  uploaderId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  conversationId: {type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true},
  messageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null},

  type: {type: String, enum: ['image', 'file', 'link', 'video'], required: true}, // thêm 'video' cho rõ
  mimeType: {type: String, required: true},

  // Cloudinary:
  cldPublicId: {type: String, index: true},      // e.g. conversations/<cid>/images/uuid
  cldResourceType: {type: String},               // 'image' | 'video' | 'raw'
  cldFormat: {type: String},                     // jpg, png, mp4, pdf, ...
  secureUrl: {type: String},                     // bản gốc (Cloudinary trả)
  thumbnailUrl: {type: String},                  // bản thumb đã transform (tự build)
  width: {type: Number},
  height: {type: Number},
  duration: {type: Number},                      // video/audio s

  fileName: {type: String},
  fileSize: {type: Number},                      // bytes

  createdAt: {type: Date, default: Date.now}
});
