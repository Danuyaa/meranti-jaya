import { Request, Response } from "express";
import { getDashboardOverview } from "../services/dashboardService";
import { sendSuccess, sendError } from "../utils/response";

// GET /api/dashboard
export const getOverview = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const overview = await getDashboardOverview();
    sendSuccess(
      res,
      200,
      "Data ringkasan overview dashboard berhasil diambil",
      overview
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data overview dashboard";
    sendError(res, 500, message);
  }
};
