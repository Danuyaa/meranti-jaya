import { Router } from "express";
import { getOverview } from "../controllers/dashboardController";
import { protect } from "../middleware/auth";

const router = Router();

// Semua route dashboard overview memerlukan login
router.use(protect);

// GET /api/dashboard
router.get("/", getOverview);

export default router;
