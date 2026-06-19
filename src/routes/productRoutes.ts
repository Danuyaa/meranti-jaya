import { Router } from "express";
import {
  index,
  show,
  store,
  update,
  destroy,
  categories,
} from "../controllers/productController";
import { protect, authorize } from "../middleware/auth";
import upload from "../config/upload";

const router = Router();

// Public routes
router.get("/", index);
router.get("/categories", categories);
router.get("/:id", show);

// Protected routes (admin only)
router.post("/", protect, authorize("admin"), upload.single("image"), store);
router.put("/:id", protect, authorize("admin"), upload.single("image"), update);
router.delete("/:id", protect, authorize("admin"), destroy);

export default router;
