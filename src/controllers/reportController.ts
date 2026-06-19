import { Request, Response } from "express";
import {
  getDashboardSummary,
  getBestSellingProducts,
  getTopSuppliers,
  getLowStockProducts,
  getMonthlySalesTrend,
  getMonthlyProcurementTrend,
} from "../services/reportService";
import { sendSuccess, sendError } from "../utils/response";

// GET /api/reports/dashboard
export const dashboard = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const summary = await getDashboardSummary();
    sendSuccess(
      res,
      200,
      "Ringkasan dashboard laporan berhasil diambil",
      summary
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data ringkasan dashboard";
    sendError(res, 500, message);
  }
};

// GET /api/reports/best-selling
export const bestSelling = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { limit } = req.query;
    const products = await getBestSellingProducts(limit ? Number(limit) : 10);
    sendSuccess(res, 200, "Laporan produk terlaris berhasil diambil", products);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil laporan produk terlaris";
    sendError(res, 500, message);
  }
};

// GET /api/reports/top-suppliers
export const topSuppliers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { limit } = req.query;
    const suppliers = await getTopSuppliers(limit ? Number(limit) : 10);
    sendSuccess(
      res,
      200,
      "Laporan supplier teratas berhasil diambil",
      suppliers
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil laporan supplier";
    sendError(res, 500, message);
  }
};

// GET /api/reports/low-stock
export const lowStock = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await getLowStockProducts();
    sendSuccess(res, 200, "Laporan stok menipis berhasil diambil", products);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil laporan stok menipis";
    sendError(res, 500, message);
  }
};

// GET /api/reports/sales-trend
export const salesTrend = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const trend = await getMonthlySalesTrend();
    sendSuccess(res, 200, "Tren penjualan bulanan berhasil diambil", trend);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil tren penjualan bulanan";
    sendError(res, 500, message);
  }
};

// GET /api/reports/procurement-trend
export const procurementTrend = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const trend = await getMonthlyProcurementTrend();
    sendSuccess(res, 200, "Tren pengadaan bulanan berhasil diambil", trend);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil tren pengadaan bulanan";
    sendError(res, 500, message);
  }
};
