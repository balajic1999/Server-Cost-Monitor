import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtUser } from "@cloudpulse/types";
import { env } from "../config/env";

export interface AuthedRequest extends Request {
  user?: JwtUser;
}

/**
 * Extract JWT from httpOnly cookie (primary) or Authorization header (fallback).
 * Cookie-based auth is preferred for XSS protection.
 * Header-based auth is kept for API clients and backward compatibility.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // 1. Try httpOnly cookie first (browser clients)
  let token = req.cookies?.access_token;

  // 2. Fallback to Authorization header (API clients, mobile apps)
  if (!token) {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      token = auth.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtUser;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
