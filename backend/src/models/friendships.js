import mongoose from "mongoose";

let friendshipSchema = new mongoose.Schema({
    profileReceive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    profileRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
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

friendshipSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

let FriendShip = mongoose.model('Friendship', friendshipSchema);

export default FriendShip;