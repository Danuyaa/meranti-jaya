import { Router } from "express";
import {
  store,
  index,
  byProduct,
  summary,
} from "../controllers/stockMovementController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// Semua route memerlukan autentikasi
router.use(protect);

// GET /api/stock-movements - List semua pergerakan stok (admin & cashier)
router.get("/", index);

// GET /api/stock-movements/product/:productId - Riwayat stok per produk
router.get("/product/:productId", byProduct);

// GET /api/stock-movements/summary/:productId - Ringkasan stok produk
router.get("/summary/:productId", summary);

// POST /api/stock-movements - Catat pergerakan stok baru (admin only)
router.post("/", authorize("admin"), store);

export default router;
