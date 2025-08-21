import mongoose from "mongoose";
import { env } from "../config/environment";

const connectDB = async () => {
    console.log("Connecting to MongoDB...");
    try {
        await mongoose.connect(env.MONGO_URI)
        console.log("MongoDB connected successfully")
    } catch (error) {
        console.error("MongoDB connection failed:", error.message)
    }
};

export default connectDB;