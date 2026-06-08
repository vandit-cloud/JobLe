// ──────────────────────────────────────────────────────────────
//  authCandidate — the bouncer for CANDIDATE-side routes (e.g. "my
//  assignments"). Mirror image of middleware/auth.js, which guards the
//  recruiter side: same token verification, opposite role gate.
//  (Kept as two small files instead of one configurable middleware so
//  each route file reads plainly: auth = recruiter, authCandidate = candidate.)
// ──────────────────────────────────────────────────────────────
const jwt = require("jsonwebtoken");

function authCandidate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Not logged in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "candidate") {
      return res.status(403).json({ error: "Candidate account required." });
    }

    req.user = payload; // { id, email, role }
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Session expired or invalid. Please log in again." });
  }
}

module.exports = authCandidate;
