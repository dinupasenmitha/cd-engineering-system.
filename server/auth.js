/* =========================================================
   CD Engineering — Authentication Middleware
   ========================================================= */

// ── Require Authentication ────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    // Touch session to reset inactivity timer
    req.session.touch();
    return next();
  }
  return res.status(401).json({ error: 'Authentication required. Please login.' });
}

// ── Require Admin Role ────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin privileges required for this action.' });
}

// ── Get Current User from Session ─────────────────────────
function getCurrentUser(req) {
  return req.session && req.session.user ? req.session.user : null;
}

module.exports = { requireAuth, requireAdmin, getCurrentUser };
