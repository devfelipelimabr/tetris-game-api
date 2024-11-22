// middlewares/auth.js
const jwt = require('jsonwebtoken');
const { JwtBlacklist } = require('../models');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        // Check if token is blacklisted
        const blacklistedToken = await JwtBlacklist.findOne({ where: { token } });
        if (blacklistedToken) {
            return res.status(401).json({ error: 'Token has been invalidated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = { authenticateToken };