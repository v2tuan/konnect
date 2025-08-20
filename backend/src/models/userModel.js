import mongooes from 'mongoose'

let userSchema = new mongooes.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

let User = mongooes.model('User', userSchema);

export default User;