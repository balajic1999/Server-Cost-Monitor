import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtUser } from "@cloudpulse/types";
import { env } from "../config/env";

export interface AuthedRequest extends Request {
  user?: JwtUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid bearer token" });
  }

  const token = auth.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtUser;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
