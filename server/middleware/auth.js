// ──────────────────────────────────────────────────────────────
//  auth middleware — the "bouncer" for protected routes.
//  Put this in front of any route that should require login. It reads
//  the token from the request, verifies it, and attaches the user to
//  req.user so the route knows WHO is asking. No valid token → 401.
// ──────────────────────────────────────────────────────────────
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  // The frontend sends the token as:  Authorization: Bearer <token>
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Not logged in." });
  }

  try {
    // verify() checks the signature with our secret AND that it hasn't
    // expired. If anything's off, it throws — and we reject the request.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // ROLE GATE: every route this middleware protects is recruiter-side
    // (tests, jobs, candidates...). A candidate's token is valid but must
    // not open recruiter doors. Tokens from before roles existed have no
    // role claim — those are all recruiters, so they pass.
    // REVISIT when candidates get their own authed routes (e.g. "my
    // applications"): split this into requireRecruiter / requireCandidate.
    if (payload.role === "candidate") {
      return res.status(403).json({ error: "Recruiter account required." });
    }

    req.user = payload; // { id, email, role } — now the route knows who this is
    next(); // all good — hand off to the actual route
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Session expired or invalid. Please log in again." });
  }
}

module.exports = auth;
