// ──────────────────────────────────────────────────────────────
//  authAny — verify a login token but DON'T gate on role. Use this for
//  routes that any logged-in user may call regardless of side, e.g.
//  "delete my own account". (auth.js = recruiter-only, authCandidate.js
//  = candidate-only; this is the role-agnostic third option.)
//
//  It still proves WHO is asking (req.user.id comes from the signed
//  token), so a route built on it can only ever act on the caller
//  themselves — never on an arbitrary user.
// ──────────────────────────────────────────────────────────────
const jwt = require("jsonwebtoken");

function authAny(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Not logged in." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, email, role }
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Session expired or invalid. Please log in again." });
  }
}

module.exports = authAny;
