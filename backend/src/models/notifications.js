import mongoose from "mongoose";

// Notification schema cho sự kiện trong cuộc hội thoại (Zalo-like)
const notificationSchema = new mongoose.Schema({
  // Người nhận thông báo
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // Người tạo ra sự kiện (actor)
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // Loại thông báo
  type: {
    type: String,
    enum: [
      "message",       // có người gửi tin nhắn tới bạn/nhóm của bạn
      "message_read",  // ai đó đã đọc tin nhắn trong 1 conversation
      "friend_request",
      "friend_accept",
      "group_invite",
      "group_role",
      "call_missed",
      "system",
    ],
    required: true,
    index: true,
  },
  title: {type: String, default: ""},
  content: {type: String, default: ""}, // preview ngắn cho UI

  // Liên kết để điều hướng sâu
  conversationId: {type: mongoose.Schema.Types.ObjectId, ref: "Conversation", index: true},
  messageId: {type: mongoose.Schema.Types.ObjectId, ref: "Message"},
  friendshipId: {type: mongoose.Schema.Types.ObjectId, ref: "Friendship"},

  // Dành cho read-receipt nâng cao
  lastReadSeq: {type: Number, default: null},
  lastReadMessageId: {type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null},

  // Payload linh hoạt cho client
  extra: {type: mongoose.Schema.Types.Mixed, default: {}},

  // Trạng thái đọc của chính Notification (khay thông báo)
  status: {
    type: String,
    enum: ["unread", "read"],
    default: "unread",
    index: true,
  },
  readAt: {type: Date, default: null},

  // Timestamps
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: null},
});

notificationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index hữu ích
notificationSchema.index({receiverId: 1, status: 1, createdAt: -1});
notificationSchema.index({receiverId: 1, type: 1, createdAt: -1});
notificationSchema.index({receiverId: 1, type: 1, conversationId: 1, createdAt: -1});

notificationSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
