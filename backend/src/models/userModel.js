import mongoose from 'mongoose'

let userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
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
    }
});

userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Nghiên cứu về Index để tăng tốc truy vấn
// userSchema.index({ phone: 1 });

let User = mongoose.model('User', userSchema);

export default User;