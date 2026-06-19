import { Router } from "express";
import {
  index,
  show,
  store,
  complete,
} from "../controllers/stockAuditController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// Semua route audit stok dibatasi hanya untuk Admin
router.use(protect, authorize("admin"));

// GET /api/stock-audits
router.get("/", index);

// GET /api/stock-audits/:id
router.get("/:id", show);

// POST /api/stock-audits
router.post("/", store);

// PUT /api/stock-audits/:id/complete
router.put("/:id/complete", complete);

export default router;
