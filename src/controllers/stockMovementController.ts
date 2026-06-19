import { Request, Response } from "express";
import {
  createStockMovement,
  getStockMovements,
  getMovementsByProduct,
  getStockSummary,
} from "../services/stockMovementService";
import { sendSuccess, sendError } from "../utils/response";

// POST /api/stock-movements
export const store = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, variantId, type, quantity, note } = req.body;
    const userId = (req as any).user?.id;

    // Validation
    if (!productId || !type || quantity === undefined) {
      sendError(res, 400, "productId, type, dan quantity wajib diisi");
      return;
    }

    const validTypes = ["IN", "OUT", "ADJUSTMENT", "DAMAGED", "RETURN"];
    if (!validTypes.includes(type)) {
      sendError(
        res,
        400,
        `Type tidak valid. Gunakan: ${validTypes.join(", ")}`
      );
      return;
    }

    const movement = await createStockMovement({
      productId,
      variantId,
      type,
      quantity: Number(quantity),
      note,
      createdBy: userId,
    });

    sendSuccess(res, 201, "Pergerakan stok berhasil dicatat", movement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mencatat pergerakan stok";
    sendError(res, 400, message);
  }
};

// GET /api/stock-movements
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, productId, type, startDate, endDate } = req.query;

    const result = await getStockMovements({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      productId: productId as string,
      type: type as any,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    sendSuccess(res, 200, "Data pergerakan stok berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data pergerakan stok";
    sendError(res, 500, message);
  }
};

// GET /api/stock-movements/product/:productId
export const byProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const movements = await getMovementsByProduct(
      req.params.productId as string
    );
    sendSuccess(
      res,
      200,
      "Riwayat pergerakan stok produk berhasil diambil",
      movements
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil riwayat stok";
    const statusCode = message === "Produk tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};

// GET /api/stock-movements/summary/:productId
export const summary = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getStockSummary(req.params.productId as string);
    sendSuccess(res, 200, "Ringkasan stok berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil ringkasan stok";
    const statusCode = message === "Produk tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};
