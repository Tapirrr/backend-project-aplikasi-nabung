import type { NextFunction, Response } from "express";
import type { AuthRequest } from "./authMiddleware.ts";

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role === "admin") {
    return next();
  } else {
    return res.status(403).json({ message: "bukan atmin!!" });
  }
}
