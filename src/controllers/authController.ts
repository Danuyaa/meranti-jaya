import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/authService";
import { sendSuccess, sendError } from "../utils/response";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, email, password, role } = req.body;

    // Validation
    if (!name || !username || !email || !password) {
      sendError(res, 400, "Name, username, email, dan password wajib diisi");
      return;
    }

    const result = await registerUser({ name, username, email, password, role });

    sendSuccess(res, 201, "Register berhasil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Register gagal";
    sendError(res, 400, message);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      sendError(res, 400, "Username/email dan password wajib diisi");
      return;
    }

    const result = await loginUser({ identifier, password });

    sendSuccess(res, 200, "Login berhasil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login gagal";
    sendError(res, 401, message);
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, 200, "User data retrieved", (req as any).user);
  } catch (error) {
    sendError(res, 500, "Gagal mengambil data user");
  }
};
