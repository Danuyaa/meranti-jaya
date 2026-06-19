import { Request, Response } from "express";
import {
  createProcurement,
  getProcurements,
  getProcurementById,
  updateProcurementStatus,
} from "../services/procurementService";
import { sendSuccess, sendError } from "../utils/response";
import { ProcurementStatus } from "../models/Procurement";

// POST /api/procurements
export const store = async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplier, items, note } = req.body;
    const userId = (req as any).user?.id;

    if (!supplier || !items || !Array.isArray(items)) {
      sendError(res, 400, "supplier dan items (array) wajib diisi");
      return;
    }

    const procurement = await createProcurement({
      supplier,
      items,
      note,
      createdBy: userId,
    });

    sendSuccess(res, 201, "Pengadaan barang berhasil dibuat", procurement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat pengadaan barang";
    sendError(res, 400, message);
  }
};

// GET /api/procurements
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, status, supplierId, startDate, endDate } = req.query;

    const result = await getProcurements({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as ProcurementStatus,
      supplierId: supplierId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    sendSuccess(res, 200, "Data pengadaan berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil data pengadaan";
    sendError(res, 500, message);
  }
};

// GET /api/procurements/:id
export const show = async (req: Request, res: Response): Promise<void> => {
  try {
    const procurement = await getProcurementById(req.params.id as string);
    sendSuccess(res, 200, "Detail pengadaan berhasil diambil", procurement);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil detail pengadaan";
    const statusCode = message === "Data pengadaan tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};

// PUT /api/procurements/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body;
    const userId = (req as any).user?.id;

    if (!status) {
      sendError(res, 400, "Status wajib diisi");
      return;
    }

    const validStatus = ["pending", "ordered", "received", "cancelled"];
    if (!validStatus.includes(status)) {
      sendError(
        res,
        400,
        `Status tidak valid. Gunakan salah satu dari: ${validStatus.join(", ")}`
      );
      return;
    }

    const procurement = await updateProcurementStatus(
      req.params.id as string,
      status as ProcurementStatus,
      note,
      userId
    );

    sendSuccess(res, 200, "Status pengadaan berhasil diperbarui", procurement);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memperbarui status pengadaan";
    const statusCode = message === "Data pengadaan tidak ditemukan" ? 404 : 400;
    sendError(res, statusCode, message);
  }
};
