import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function createIdentityImageAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "5m" });
}

export function verifyIdentityImageAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
