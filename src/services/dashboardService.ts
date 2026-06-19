import Product from "../models/Product";
import Supplier from "../models/Supplier";
import Order from "../models/Order";
import Procurement from "../models/Procurement";
import Notification from "../models/Notification";

interface DashboardOverviewResult {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  totalSuppliers: number;
  totalOrders: number;
  totalProcurements: number;
  latestNotifications: any[];
}

/**
 * Mengambil ringkasan data overview utama untuk Dashboard
 */
export const getDashboardOverview =
  async (): Promise<DashboardOverviewResult> => {
    // 1. Total Produk
    const totalProducts = await Product.countDocuments({ isActive: true });

    // 2. Total Stok (Kumulatif seluruh produk aktif)
    const products = await Product.find({ isActive: true }).select(
      "stock variants minimumStock"
    );
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    // 3. Jumlah Produk Stok Menipis
    let lowStockCount = 0;
    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.stock <= variant.minimumStock) {
            lowStockCount++;
          }
        }
      } else {
        if (product.stock <= product.minimumStock) {
          lowStockCount++;
        }
      }
    }

    // 4. Total Supplier
    const totalSuppliers = await Supplier.countDocuments({ isActive: true });

    // 5. Total Pesanan (Order)
    const totalOrders = await Order.countDocuments();

    // 6. Total Pengadaan (Procurement)
    const totalProcurements = await Procurement.countDocuments();

    // 7. Notifikasi Terbaru (Ambil 5 notifikasi terbaru)
    const latestNotifications = await Notification.find()
      .populate("product", "name slug category")
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      totalSuppliers,
      totalOrders,
      totalProcurements,
      latestNotifications,
    };
  };
