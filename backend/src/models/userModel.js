// models/userModel.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            trim: true,
            // ví dụ regex VN: bắt đầu bằng 0, 9-11 số. Tuỳ bạn chỉnh lại:
            match: [/^0\d{9,10}$/, 'Invalid phone number']
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            // unique + sparse + partial index được set ở phần .index() bên dưới
        },
        password: {
            type: String,
            required: true,
            // Nếu muốn ẩn mặc định, bật dòng dưới và nhớ .select('+password') khi login
            // select: false
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        avatarUrl: {
            type: String,
            default: 'https://example.com/default-avatar.png'
        },
        dateOfBirth: { type: Date },
        bio: { type: String, default: '', maxlength: 300 },

        // Xác minh email (tuỳ bạn dùng hay không)
        // isEmailVerified: { type: Boolean, default: false },
        // signupOtp: { type: String, default: null, select: false },
        // signupOtpExpiresAt: { type: Date, default: null, select: false },

        // Quên mật khẩu
        resetOtp: { type: String, default: null, select: false },
        resetOtpExpiresAt: { type: Date, default: null, select: false },
        resetOtpAttempts: { type: Number, default: 0, select: false },
        resetLastSentAt: { type: Date, default: null, select: false },

        // Soft delete
        isDeleted: { type: Boolean, default: false },

        // Dành cho xoá cũ: nếu bạn vẫn muốn, giữ lại _destroy hoặc thay bằng isDeleted
        // _destroy: { type: Boolean, default: false }
    },
    {
        timestamps: true,        // tự động createdAt, updatedAt
        versionKey: false
    }
);

// Unique indexes với partialFilterExpression để hỗ trợ soft-delete
userSchema.index(
    { phone: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
);
userSchema.index(
    { email: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: {
            isDeleted: false,
            email: { $exists: true, $type: 'string' }
        }
    }
);

// Chuẩn hoá JSON trả về: ẩn field nhạy cảm
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.password;
        delete ret.resetOtp;
        delete ret.resetOtpExpiresAt;
        delete ret.resetOtpAttempts;
        delete ret.resetLastSentAt;
        delete ret.signupOtp;
        delete ret.signupOtpExpiresAt;
        return ret;
    }
});

// Nếu vẫn muốn hook cập nhật thủ công, có thể dùng pre('save'), nhưng timestamps đã lo:
//// userSchema.pre('save', function (next) {
////   this.updatedAt = new Date();
////   next();
//// });

const User = mongoose.model('User', userSchema);
export default User;
