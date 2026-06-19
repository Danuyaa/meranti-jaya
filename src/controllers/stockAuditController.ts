import { Request, Response } from "express";
import {
  createStockAudit,
  getStockAudits,
  getStockAuditById,
  completeStockAudit,
} from "../services/stockAuditService";
import { sendSuccess, sendError } from "../utils/response";
import { StockAuditStatus } from "../models/StockAudit";

// POST /api/stock-audits
export const store = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, note } = req.body;
    const userId = (req as any).user?.id;

    if (!items || !Array.isArray(items)) {
      sendError(res, 400, "items (array) wajib diisi");
      return;
    }

    const audit = await createStockAudit({
      items,
      note,
      createdBy: userId,
    });

    sendSuccess(res, 201, "Draft audit stok berhasil dibuat", audit);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat draft audit stok";
    sendError(res, 400, message);
  }
};

// GET /api/stock-audits
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, status, search, startDate, endDate } = req.query;

    const result = await getStockAudits({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as StockAuditStatus,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    sendSuccess(res, 200, "Data audit stok berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data audit stok";
    sendError(res, 500, message);
  }
};

// GET /api/stock-audits/:id
export const show = async (req: Request, res: Response): Promise<void> => {
  try {
    const audit = await getStockAuditById(req.params.id as string);
    sendSuccess(res, 200, "Detail audit stok berhasil diambil", audit);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil detail audit stok";
    const statusCode = message === "Audit stok tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};

// PUT /api/stock-audits/:id/complete
export const complete = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const audit = await completeStockAudit(req.params.id as string, userId);
    sendSuccess(
      res,
      200,
      "Audit stok diselesaikan dan stok sistem disesuaikan",
      audit
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyelesaikan audit stok";
    const statusCode = message === "Audit stok tidak ditemukan" ? 404 : 400;
    sendError(res, statusCode, message);
  }
};
