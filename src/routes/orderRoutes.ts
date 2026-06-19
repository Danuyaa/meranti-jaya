import { Router } from "express";
import { index, show, store, update } from "../controllers/orderController";
import { protect } from "../middleware/auth";

const router = Router();

// Semua route pesanan memerlukan login (Admin atau Cashier)
router.use(protect);

// GET /api/orders
router.get("/", index);

// GET /api/orders/:id
router.get("/:id", show);

// POST /api/orders
router.post("/", store);

// PUT /api/orders/:id
router.put("/:id", update);

export default router;
