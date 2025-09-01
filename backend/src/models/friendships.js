import mongoose from "mongoose";

let frinendshipSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedBy: {
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

frinendshipSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

let FriendShip = mongoose.model('Friendship', frinendshipSchema);

export default FriendShip;