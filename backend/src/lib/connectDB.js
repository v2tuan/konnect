import e from "express";
import mongoose from "mongoose"
require('dotenv').config();

const connectDB = async () => {
    console.log("Connecting to MongoDB...");
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected successfully")
    } catch (error) {
        console.error("MongoDB connection failed:", error.message)
    }
};

export default connectDB;