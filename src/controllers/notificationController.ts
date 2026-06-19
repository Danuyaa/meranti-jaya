import { Request, Response } from "express";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkStockAndExpiry,
} from "../services/notificationService";
import { sendSuccess, sendError } from "../utils/response";
import { NotificationType } from "../models/Notification";

// GET /api/notifications
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, isRead, type } = req.query;

    const result = await getNotifications({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isRead: isRead !== undefined ? isRead === "true" : undefined,
      type: type as NotificationType,
    });

    sendSuccess(res, 200, "Notifikasi berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil notifikasi";
    sendError(res, 500, message);
  }
};

// PUT /api/notifications/:id/read
export const read = async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await markNotificationAsRead(req.params.id as string);
    sendSuccess(res, 200, "Notifikasi berhasil dibaca", notification);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal membaca notifikasi";
    const statusCode = message === "Notifikasi tidak ditemukan" ? 404 : 400;
    sendError(res, statusCode, message);
  }
};

// PUT /api/notifications/read-all
export const readAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    await markAllNotificationsAsRead();
    sendSuccess(res, 200, "Semua notifikasi ditandai dibaca");
  } catch (error) {
    sendError(res, 500, "Gagal menandai semua notifikasi");
  }
};

// POST /api/notifications/trigger-check
export const triggerCheck = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await checkStockAndExpiry();
    sendSuccess(
      res,
      200,
      "Pengecekan stok & kedaluwarsa berhasil dipicu secara manual"
    );
  } catch (error) {
    sendError(res, 500, "Gagal memicu pengecekan");
  }
};
