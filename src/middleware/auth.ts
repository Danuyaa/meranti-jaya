import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { sendError } from "../utils/response";

interface JwtPayload {
  id: string;
  role: string;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      sendError(res, 401, "Akses ditolak. Token tidak ditemukan");
      return;
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    // Find user and attach to request
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      sendError(res, 401, "User tidak ditemukan");
      return;
    }

    (req as any).user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    sendError(res, 401, "Token tidak valid");
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).user?.role;

    if (!roles.includes(userRole)) {
      sendError(res, 403, "Anda tidak memiliki akses ke resource ini");
      return;
    }

    next();
  };
};
