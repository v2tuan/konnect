import jsonwebtoken from 'jsonwebtoken';
import { env } from '../config/environment';

export const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decoded = jsonwebtoken.verify(token, env.JWT_SECRET);
        // const user = await User.findById(decoded.userId).select('-password -_destroy');
        // if (!user) {
        //     return res.status(404).json({ message: 'User not found' });
        // }
        // req.user = user;
        // console.log('Authenticated user:', user);
        req.userId = decoded.userId; // Store userId in request for later use
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
}
export default authMiddleware;