import jsonwebtoken from 'jsonwebtoken'
import { env } from '../config/environment.js';

export const generateToken = (userId, res) => {
    const token = jsonwebtoken.sign({ userId }, env.JWT_SECRET, {
        expiresIn: '1h'
    });
    res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
    });
    return token;
}