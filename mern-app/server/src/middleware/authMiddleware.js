import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Allow bypassing strict user lookup if it's the mocked dev admin token
            if (decoded.role === 'dev_admin') {
                req.user = { role: 'admin', username: 'devAuth' };
                return next();
            }

            req.user = await User.findById(decoded.id).select('-password');
            if(!req.user) {
                return res.status(401).json({ error: 'Not authorized, user missing' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

export const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden. Admin credentials required.' });
    }
};
