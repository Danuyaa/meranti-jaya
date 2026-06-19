import { Request, Response } from "express";
import {
  reportDamagedItem,
  reportExpiredItem,
  getQCWarnings,
} from "../services/qualityControlService";
import { sendSuccess, sendError } from "../utils/response";

// POST /api/quality-controls/damaged
export const reportDamaged = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, variantId, quantity, note } = req.body;
    const userId = (req as any).user?.id;

    if (!productId || !quantity || !note) {
      sendError(res, 400, "productId, quantity, dan note wajib diisi");
      return;
    }

    const result = await reportDamagedItem({
      productId,
      variantId,
      quantity: Number(quantity),
      note,
      createdBy: userId,
    });

    sendSuccess(res, 200, result.message, result.movement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mencatat barang rusak";
    sendError(res, 400, message);
  }
};

// POST /api/quality-controls/expired
export const reportExpired = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, variantId, quantity, note } = req.body;
    const userId = (req as any).user?.id;

    if (!productId || !quantity || !note) {
      sendError(res, 400, "productId, quantity, dan note wajib diisi");
      return;
    }

    const result = await reportExpiredItem({
      productId,
      variantId,
      quantity: Number(quantity),
      note,
      createdBy: userId,
    });

    sendSuccess(res, 200, result.message, result.movement);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mencatat barang kedaluwarsa";
    sendError(res, 400, message);
  }
};

// GET /api/quality-controls/warnings
export const getWarnings = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const warnings = await getQCWarnings();
    sendSuccess(
      res,
      200,
      "Daftar barang peringatan QC berhasil diambil",
      warnings
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil daftar barang peringatan";
    sendError(res, 500, message);
  }
};
