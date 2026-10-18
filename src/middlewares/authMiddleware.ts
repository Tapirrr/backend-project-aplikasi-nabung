import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";


export interface AuthRequest extends Request {user?: any;}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction,) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ message: "Token invalid!" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "super-secret");
    req.user = verified; 
    next();
  } catch (error) {
    res.status(403).json({ message: "Token invalid!" });
  }
}
