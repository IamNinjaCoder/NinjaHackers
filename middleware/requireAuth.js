// middleware/requireAuth.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        // Redirect browsers to login, reject API calls with 401
        return req.accepts('html')
            ? res.redirect('/login')
            : res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = requireAuth;


