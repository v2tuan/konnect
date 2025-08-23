import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { generateToken } from '../lib/jwtToken.js';
import sendMail from '../lib/sendMailUtil.js';
import User from '../models/userModel.js';
import { authService } from '../services/authService.js';

const INVALID_FIELD_USER = [
    "_id", "password", "createdAt", "updatedAt", "_destroy"
]

let signup = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { phone, email, password, fullName, dateOfBirth } = req.body;
        if (!email || !password || !fullName || !dateOfBirth) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        const newUser = new User({
            phone,
            email,
            password: hashedPassword,
            fullName,
            dateOfBirth
        });

        if (newUser) {
            session.startTransaction();
            await newUser.save({ session: session });
            const otp = generateOtp();
            const text = `Your OTP is ${otp}. Please use this to complete your registration.`;
            const htmlContent = `Your OTP is <strong>${otp}</strong>. Please use this to complete your registration.`;
            await sendMail(email, 'OTP for Registration', text, htmlContent);
            await session.commitTransaction();
            return res.status(201).json({ message: 'User registered successfully' });
        }
        await session.endSession();
        return res.status(500).json({ message: 'Error registering user' });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error during registration:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

let generateOtp = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
}

let login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user || user._destroy) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        generateToken(user._id, res);

        const userValid = user.toObject()

        INVALID_FIELD_USER.forEach((field) => {
            delete userValid[field]
        })

        return res.status(200).json({
            message: 'Login successful',
            ...userValid
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

let logout = (req, res) => {
    try {
        res.clearCookie('token');
        return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const update = async (req, res, next ) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' })
        }
        const updatedUser = await authService.update(userId, req.body)
        res.status(StatusCodes.OK).json(updatedUser)
    } catch (error) {
        next(error)
    }
}


export const authController = {
    login,
    signup,
    generateOtp,
    logout,
    update
}