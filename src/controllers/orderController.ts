import { Request, Response } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "../services/orderService";
import { sendSuccess, sendError } from "../utils/response";
import { OrderStatus, PaymentMethod } from "../models/Order";

// POST /api/orders
export const store = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, items, paymentMethod, status, cashAmount, note } =
      req.body;
    const userId = (req as any).user?.id;

    if (!items || !Array.isArray(items) || !paymentMethod) {
      sendError(res, 400, "items (array) dan paymentMethod wajib diisi");
      return;
    }

    const order = await createOrder({
      customerName,
      items,
      paymentMethod: paymentMethod as PaymentMethod,
      status: status as OrderStatus,
      cashAmount: cashAmount ? Number(cashAmount) : undefined,
      note,
      createdBy: userId,
    });

    sendSuccess(res, 201, "Pesanan berhasil dibuat", order);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat pesanan";
    sendError(res, 400, message);
  }
};

// GET /api/orders
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, status, paymentMethod, search, startDate, endDate } =
      req.query;

    const result = await getOrders({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as OrderStatus,
      paymentMethod: paymentMethod as PaymentMethod,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    sendSuccess(res, 200, "Data pesanan berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil data pesanan";
    sendError(res, 500, message);
  }
};

// GET /api/orders/:id
export const show = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await getOrderById(req.params.id as string);
    sendSuccess(res, 200, "Detail pesanan berhasil diambil", order);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil detail pesanan";
    const statusCode = message === "Pesanan tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};

// PUT /api/orders/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const userId = (req as any).user?.id;

    if (!status) {
      sendError(res, 400, "Status wajib ditentukan");
      return;
    }

    const validStatus = ["pending", "completed", "cancelled"];
    if (!validStatus.includes(status)) {
      sendError(
        res,
        400,
        `Status tidak valid. Gunakan salah satu dari: ${validStatus.join(", ")}`
      );
      return;
    }

    const order = await updateOrderStatus(
      req.params.id as string,
      status as OrderStatus,
      userId
    );

    sendSuccess(res, 200, "Status pesanan berhasil diperbarui", order);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memperbarui status pesanan";
    const statusCode = message === "Pesanan tidak ditemukan" ? 404 : 400;
    sendError(res, statusCode, message);
  }
};
