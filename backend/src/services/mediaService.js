import { cloudinaryProvider } from "~/providers/CloudinaryProvider_v2"


const uploadMultiple = async (files, conversationId) => {
    const uploadOptions = {
        folder: `konnect/${conversationId}`,
        resource_type: 'auto'
    }

    const uploadResults = await cloudinaryProvider.uploadMultiple(files, uploadOptions)

    return uploadResults.map((result, index) => ({
        url: result.url,
        type: result.resource_type,
        metadata: {
          filename: files[index].originalname,
          size: result.bytes,
          mimetype: files[index].mimetype
        }
      }))
}

export const mediaService = {
    uploadMultiple
}