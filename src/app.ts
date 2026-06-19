import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import stockMovementRoutes from "./routes/stockMovementRoutes";
import supplierRoutes from "./routes/supplierRoutes";
import procurementRoutes from "./routes/procurementRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import { initNotificationScheduler } from "./services/notificationService";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock-movements", stockMovementRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/procurements", procurementRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/", (_req, res) => {
  res.json({ message: "Meranti Jaya API is running 🚀" });
});

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Start automatic warning scheduler
  initNotificationScheduler();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

export default app;
