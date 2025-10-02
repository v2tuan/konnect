import { cloudinaryProvider } from "~/providers/CloudinaryProvider_v2"


const uploadMultiple = async (files, conversationId) => {
    const uploadOptions = {
        folder: `konnect/${conversationId}`,
        resource_type: 'auto'
    }

    const uploadResults = await cloudinaryProvider.uploadMultiple(files, uploadOptions)
    // console.log('Cloudinary upload results:', uploadResults)

    return uploadResults.map((result, index) => ({
        url: result.secure_url,
        type: result.resource_type,
        metadata: {
          filename: files[index].originalname,
          size: result.bytes,
          mimetype: files[index].mimetype
        }
      }))
}
const saveUploadedToDB = async ({ files, conversationId, uploaderId }) => {
  // files: mảng từ uploadMultiple (có url, type, metadata)
  const docs = files.map(f => ({
    conversationId,
    uploaderId,
    type: mapResourceTypeToMediaType(f.type), // "image" | "video" | "audio" | "file"
    url: f.url,
    metadata: f.metadata,
    uploadedAt: new Date()
  }));

  const saved = await Media.insertMany(docs, { ordered: true });
  return saved;
};

function mapResourceTypeToMediaType(rt) {
  // Cloudinary resource_type: image | video | raw
  if (rt === "image") return "image";
  if (rt === "video") return "video";
  // audio thường nằm trong video/raw trên Cloudinary; bạn có thể detect theo mimetype
  return "file";
}

export const mediaService = {
  uploadMultiple,
  saveUploadedToDB
};
