// ──────────────────────────────────────────────────────────────
//  Admin script: delete a user account (by email), safely.
//
//  WHY THIS EXISTS: it's the ADMIN counterpart to the in-app "Delete
//  account" button. The button lets a user delete only THEMSELVES;
//  this script lets the lead delete ANYONE from their own machine
//  (e.g. clearing out test accounts). Both share the exact same cascade
//  logic — services/accountDeletion.js — so they can never drift apart.
//
//  SAFE BY DEFAULT: with no flag it's a DRY RUN — it only PRINTS what
//  it would delete. Nothing is removed until you re-run with --confirm.
//
//  Usage (from the server/ folder):
//    node scripts/deleteUser.js someone@example.com           ← dry run
//    node scripts/deleteUser.js someone@example.com --confirm ← actually delete
// ──────────────────────────────────────────────────────────────
const path = require("path");
// Load server/.env no matter which folder we're run from.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const { summarizeOwnedData, deleteAccount } = require("../services/accountDeletion");

async function main() {
  // ── 1. Read & validate the command-line arguments ───────────────
  const email = (process.argv[2] || "").toLowerCase().trim();
  const confirm = process.argv.includes("--confirm");

  if (!email || email.startsWith("--")) {
    console.error("Usage: node scripts/deleteUser.js <email> [--confirm]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
  });

  // ── 2. Find the account ─────────────────────────────────────────
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`No user found with email "${email}". Nothing to do.`);
    return;
  }
  console.log(
    `Found ${user.role} account: ${user.email} (id ${user._id})` +
      (user.companyName ? ` — ${user.companyName}` : "")
  );

  // ── 3. Show what WOULD be deleted (preview) ─────────────────────
  if (user.role === "candidate") {
    console.log(
      "\nThis is a candidate login. Only the login is removed; any resume\n" +
        "rows recruiters hold for this email are linked by email, not id,\n" +
        "and are left untouched."
    );
  } else {
    const { counts } = await summarizeOwnedData(user._id);
    console.log("\nThis recruiter owns:");
    for (const [k, v] of Object.entries(counts)) {
      console.log(`  ${k.padEnd(13)} ${v}`);
    }
  }

  if (!confirm) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --confirm to delete.");
    return;
  }

  // ── 4. Delete (shared cascade) ──────────────────────────────────
  const result = await deleteAccount(user);
  if (result.role === "candidate") {
    console.log("\n✅ Deleted the candidate login.");
  } else {
    console.log("\n✅ Deleted the recruiter account and all owned data above.");
  }
}

// Always disconnect, even if something throws, so the script exits cleanly.
main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
