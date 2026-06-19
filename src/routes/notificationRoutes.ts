import { Router } from "express";
import {
  index,
  read,
  readAll,
  triggerCheck,
} from "../controllers/notificationController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// Semua route notifikasi memerlukan autentikasi
router.use(protect);

// GET /api/notifications - List notifikasi
router.get("/", index);

// PUT /api/notifications/read-all - Tandai semua dibaca
router.put("/read-all", readAll);

// PUT /api/notifications/:id/read - Tandai satu dibaca
router.put("/:id/read", read);

// POST /api/notifications/trigger-check - Picu scan manual (admin only)
router.post("/trigger-check", authorize("admin"), triggerCheck);

export default router;
