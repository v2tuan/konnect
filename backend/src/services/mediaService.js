// services/mediaService.js
import mongoose from "mongoose";
import Media from "~/models/medias";
import { cloudinaryProvider } from "~/providers/CloudinaryProvider_v2";

/**
 * Map Cloudinary resource_type -> Media.type
 * - image  -> "image"
 * - video  -> "video"
 * - raw    -> "file" (audio tùy nhà cung cấp: thường nằm trong video/raw; FE dựa mimetype để hiển thị)
 */
function mapResourceTypeToMediaType(rt) {
  if (rt === "image") return "image";
  if (rt === "video") return "video";
  return "file";
}

/**
 * Upload nhiều file lên Cloudinary (auto resource type, chunk cho file lớn)
 * @param {Array<File|Buffer>} files
 * @param {string} conversationId
 * @param {{userId?: string, now?: Date}} opts
 * @returns {Promise<Array<{url: string, type: 'image'|'video'|'file', metadata: object }>>}
 */
const uploadMultiple = async (files, conversationId, { userId, now } = {}) => {
  const uploadOptions = {
    folder: `konnect/${conversationId}`,
    resource_type: "auto",
    // chunk_size chỉ có tác dụng với video/raw; không hại gì khi là image
    chunk_size: 6 * 1024 * 1024 // 6MB
  };

  const results = await cloudinaryProvider.uploadMultiple(files, uploadOptions);

  return results.map((result, index) => {
    const f = files[index];
    const resourceType = result.resource_type; // image | video | raw
    return {
      url: result.secure_url,
      type: mapResourceTypeToMediaType(resourceType),
      metadata: {
        publicId: result.public_id,
        resourceType,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
        // Tên file/mimetype từ request
        filename: f?.originalname || result.original_filename,
        size: result.bytes,
        mimetype: f?.mimetype || (resourceType === "image"
          ? `image/${result.format}`
          : resourceType === "video"
            ? `video/${result.format}`
            : "application/octet-stream"),
        // Thêm thông tin phục vụ FE filter
        senderId: userId || null,
        sentAt: now || new Date()
      }
    };
  });
};

/**
 * Lưu các bản ghi Media vào DB
 * (BỔ SUNG: set `senderId`, `sentAt` để FE group/filter theo người gửi & ngày)
 * @param {{files: Array<{url:string,type:string,metadata:object}>, conversationId: string, uploaderId: string, senderId?: string, sentAt?: Date}} params
 * @returns {Promise<Array<Media>>}
 */
const saveUploadedToDB = async ({ files, conversationId, uploaderId, senderId, sentAt }) => {
  const convIdObj = new mongoose.Types.ObjectId(conversationId);
  const uploaderIdObj = new mongoose.Types.ObjectId(uploaderId);
  const senderIdObj = senderId ? new mongoose.Types.ObjectId(senderId) : uploaderIdObj;
  const now = sentAt || new Date();

  const docs = files.map(f => ({
    conversationId: convIdObj,
    uploaderId: uploaderIdObj,
    senderId: senderIdObj,       // ✅ thêm
    type: f.type,                // "image" | "video" | "file"
    url: f.url,
    metadata: f.metadata || {},
    sentAt: now,                 // ✅ thêm
    uploadedAt: new Date()
  }));

  const saved = await Media.insertMany(docs, { ordered: true });
  return saved;
};

export const mediaService = {
  uploadMultiple,
  saveUploadedToDB
};
