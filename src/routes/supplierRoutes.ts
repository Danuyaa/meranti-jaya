import { Router } from "express";
import {
  index,
  show,
  store,
  update,
  destroy,
} from "../controllers/supplierController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// Semua route memerlukan autentikasi & hanya admin
router.use(protect, authorize("admin"));

// GET /api/suppliers
router.get("/", index);

// GET /api/suppliers/:id
router.get("/:id", show);

// POST /api/suppliers
router.post("/", store);

// PUT /api/suppliers/:id
router.put("/:id", update);

// DELETE /api/suppliers/:id
router.delete("/:id", destroy);

export default router;
