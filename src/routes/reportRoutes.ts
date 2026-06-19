import { Router } from "express";
import {
  dashboard,
  bestSelling,
  topSuppliers,
  lowStock,
  salesTrend,
  procurementTrend,
} from "../controllers/reportController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// Semua route laporan bisnis dibatasi hanya untuk Admin
router.use(protect, authorize("admin"));

// GET /api/reports/dashboard
router.get("/dashboard", dashboard);

// GET /api/reports/best-selling
router.get("/best-selling", bestSelling);

// GET /api/reports/top-suppliers
router.get("/top-suppliers", topSuppliers);

// GET /api/reports/low-stock
router.get("/low-stock", lowStock);

// GET /api/reports/sales-trend
router.get("/sales-trend", salesTrend);

// GET /api/reports/procurement-trend
router.get("/procurement-trend", procurementTrend);

export default router;
