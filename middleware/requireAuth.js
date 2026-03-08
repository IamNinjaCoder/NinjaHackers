// middleware/requireAuth.js
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }

    // If not admin, appropriately handle API vs Browser requests
    if (req.path.startsWith('/api/') || req.accepts('json') || req.get('Accept')?.includes('application/json')) {
        return res.status(401).json({ error: 'Admin login required.' });
    } else {
        return res.redirect('/admin/index.html');
    }
}

module.exports = requireAuth;


