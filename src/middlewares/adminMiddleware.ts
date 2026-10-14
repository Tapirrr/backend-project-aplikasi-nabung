import type { NextFunction, Request, Response } from "express";

export function adminMiddlewares(req: any, res: Response, next: NextFunction) {
  if (req.user?.role == "admin") {
    return next();
  } else {
    return res.status(403).json({
      message: "bukan atmin!!",
    });
  }
}
