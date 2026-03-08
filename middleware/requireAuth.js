// middleware/requireAuth.js
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }

    // If not admin, appropriately handle API vs Browser requests
    // Browser Accept headers contain '*/*' which req.accepts('json') considers a match.
    // Use req.originalUrl or explicit accept strings to differentiate.
    if (req.originalUrl.startsWith('/api/') || req.xhr || req.get('Accept')?.includes('application/json')) {
        return res.status(401).json({ error: 'Admin login required.' });
    } else {
        return res.redirect('/admin/login.html');
    }
}

module.exports = requireAuth;


