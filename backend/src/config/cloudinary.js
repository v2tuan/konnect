import {v2 as cloudinary} from 'cloudinary'
import { env } from './environment'
// import { CloudinaryStorage } from 'multer-storage-cloudinary'

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
})

// // Storage cho multer: file sẽ được gửi trực tiếp lên Cloudinary
// const storage = (options) => {
//     return new CloudinaryStorage({
//         cloudinary,
//         params: {
//             ...options
//         }
//     })
// }

export {cloudinary}