// middleware/requireAuth.js
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }

    // If not admin, redirect HTML requests to login, or reject API calls
    if (req.accepts('html')) {
        return res.redirect('/admin/login.html'); // Or whatever the admin login path is
    } else {
        return res.status(401).json({ error: 'Admin login required.' });
    }
}

module.exports = requireAuth;


