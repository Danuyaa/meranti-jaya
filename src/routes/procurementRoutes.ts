import { Router } from "express";
import {
  index,
  show,
  store,
  update,
} from "../controllers/procurementController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// Semua route pengadaan memerlukan login admin
router.use(protect, authorize("admin"));

// GET /api/procurements
router.get("/", index);

// GET /api/procurements/:id
router.get("/:id", show);

// POST /api/procurements
router.post("/", store);

// PUT /api/procurements/:id
router.put("/:id", update);

export default router;
