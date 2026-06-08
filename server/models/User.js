// ──────────────────────────────────────────────────────────────
//  User model — a recruiter account.
//  CRITICAL: we never store the raw password. We store a one-way
//  HASH of it (made by bcrypt). You can check a password against a
//  hash, but you can't turn a hash back into the password.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,    // no two accounts with the same email
      lowercase: true, // store "Bob@x.com" as "bob@x.com" so logins match
      trim: true,
    },

    // The bcrypt hash of the password — NOT the password itself.
    passwordHash: {
      type: String,
      required: true,
    },

    // The company this recruiter hires for. The recruiter IS the company's
    // face in our app (agreed Phase-3 design) — no separate Company entity
    // yet. Shown on the public job board ("Backend Dev at TechInnovative").
    // Optional so accounts made before this field keep working.
    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    // ONE account system, two kinds of user. Recruiters see the hiring
    // dashboard; candidates see the job-board side. Default "recruiter" so
    // every account made before this field keeps working unchanged.
    role: {
      type: String,
      enum: ["recruiter", "candidate"],
      default: "recruiter",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
