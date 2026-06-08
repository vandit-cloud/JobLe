// ──────────────────────────────────────────────────────────────
//  Auth routes — register a recruiter, and log them in.
//  Both end by handing back a JWT "token" the frontend will store
//  and send on future requests to prove who it is.
// ──────────────────────────────────────────────────────────────
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Build a signed token for a user. It carries the user's id + email + role
// ("the claims"), is signed with our secret, and expires in 7 days. Because
// the role is INSIDE the signed token, a user can't edit localStorage to
// promote themselves — changing the payload breaks the signature.
function makeToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role || "recruiter" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── REGISTER ───────────────────────────────────────────────────
// POST /api/auth/register  { email, password }
router.post("/register", async (req, res) => {
  try {
    const { email, password, companyName, role } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required." });
    // Whitelist the role — never store whatever string the client sent.
    const safeRole = role === "candidate" ? "candidate" : "recruiter";
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters." });

    // Don't allow two accounts with the same email.
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ error: "That email is already registered." });

    // Hash the password before storing. 10 = "salt rounds" — how much work
    // bcrypt does. Higher = slower to crack, but slower to log in. 10 is a
    // sensible default.
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      // companyName only makes sense for recruiters.
      companyName: safeRole === "recruiter" ? (companyName || "").trim() : "",
      role: safeRole,
    });
    res.status(201).json({
      token: makeToken(user),
      email: user.email,
      companyName: user.companyName,
      role: user.role,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── LOGIN ──────────────────────────────────────────────────────
// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });

    // SECURITY CHOICE: if the email doesn't exist OR the password is wrong,
    // we return the SAME generic message. Telling an attacker "that email
    // exists, but wrong password" would let them discover valid emails.
    if (!user)
      return res.status(401).json({ error: "Invalid email or password." });

    // bcrypt.compare re-hashes the attempt and checks it against the stored
    // hash — without ever un-hashing anything.
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ error: "Invalid email or password." });

    res.json({
      token: makeToken(user),
      email: user.email,
      companyName: user.companyName || "",
      role: user.role || "recruiter",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
