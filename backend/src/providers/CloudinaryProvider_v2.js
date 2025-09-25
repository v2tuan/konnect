const { cloudinary } = require("~/config/cloudinary")
import streamifier from "streamifier"

const uploadSingle = async (file, option = {}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(option, (err, result) => {
            if(err) reject(err)
            else resolve(result)
        })
        streamifier.createReadStream(file.buffer).pipe(stream)
    })
}

const uploadMultiple = async (files, options = {}) => {
    const uploadPromises = files.map(file => 
        uploadSingle(file, options)
    )
    const results = await Promise.all(uploadPromises)
    return results
}

export const cloudinaryProvider = {
    uploadSingle, 
    uploadMultiple
}