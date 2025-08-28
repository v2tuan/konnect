import mongoose from 'mongoose'

let userSchema = new mongoose.Schema({
    phone: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true // Allows for unique email but does not require it
    },
    password: {
        type: String,
        required: true
    },
    avatarUrl: {
        type: String,
        default: 'https://example.com/default-avatar.png' // Default avatar URL
    },
    fullName: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date
    },
    bio: {
        type: String,
        default: ''
    },
    status: {
        isOnline: { type: Boolean, default: false },
        lastActiveAt: { type: Date, default: null }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: null
    },
    _destroy: {
        type: Boolean,
        default: false
    },
    // OTP cho quên mật khẩu
    resetOtp: { type: String, default: null },
    resetOtpExpiresAt: { type: Date, default: null },
    resetOtpAttempts: { type: Number, default: 0,},
    resetLastSentAt: { type: Date, default: null }
});

userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});
// Chuẩn hoá JSON trả ra client (ẩn field nhạy cảm)
// userSchema.set('toJSON', {
//     transform: (doc, ret) => {
//         ret.id = ret._id.toString();
//         delete ret._id;
//         delete ret.password;
//         delete ret.resetOtp;
//         delete ret.resetOtpExpiresAt;
//         delete ret.resetOtpAttempts;
//         delete ret.resetLastSentAt;
//         return ret;
//     }
// });
// Nghiên cứu về Index để tăng tốc truy vấn
// userSchema.index({ phone: 1 });

// Sparse index (MongoDB shell)
userSchema.index({ phone: 1 }, { unique: true, sparse: true });


let User = mongoose.model('User', userSchema);

export default User;