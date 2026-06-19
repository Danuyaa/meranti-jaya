import { Router } from "express";
import {
  reportDamaged,
  reportExpired,
  getWarnings,
} from "../controllers/qualityControlController";
import { protect } from "../middleware/auth";

const router = Router();

// Semua route Quality Control (QC) memerlukan login
router.use(protect);

// GET /api/quality-controls/warnings
router.get("/warnings", getWarnings);

// POST /api/quality-controls/damaged
router.post("/damaged", reportDamaged);

// POST /api/quality-controls/expired
router.post("/expired", reportExpired);

export default router;
