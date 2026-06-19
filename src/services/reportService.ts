import Order from "../models/Order";
import Procurement from "../models/Procurement";
import Product from "../models/Product";
import Supplier from "../models/Supplier";
import mongoose from "mongoose";

/**
 * 1. Mendapatkan Top 5 Produk Terlaris (Best Selling Products)
 */
export const getBestSellingProducts = async (
  limit: number = 5
): Promise<any[]> => {
  const result = await Order.aggregate([
    // Hanya ambil transaksi completed
    { $match: { status: "completed" } },
    // Pecah array items
    { $unwind: "$items" },
    // Group berdasarkan produk dan varian (opsional)
    {
      $group: {
        _id: "$items.product",
        totalQtySold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
      },
    },
    // Urutkan berdasarkan kuantitas terbanyak
    { $sort: { totalQtySold: -1 } },
    // Batasi output
    { $limit: limit },
    // Populate data produk
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    // Proyeksi field yang dikembalikan
    {
      $project: {
        _id: 1,
        totalQtySold: 1,
        totalRevenue: 1,
        name: "$productDetails.name",
        category: "$productDetails.category",
        price: "$productDetails.price",
        stock: "$productDetails.stock",
      },
    },
  ]);

  return result;
};

/**
 * 2. Mendapatkan Top Supplier (Berdasarkan total volume pembelian / dana pengadaan terbayar)
 */
export const getTopSuppliers = async (limit: number = 5): Promise<any[]> => {
  const result = await Procurement.aggregate([
    // Hanya ambil procurement received
    { $match: { status: "received" } },
    // Group berdasarkan supplier
    {
      $group: {
        _id: "$supplier",
        totalProcuredAmount: { $sum: "$totalAmount" },
        totalOrdersCount: { $sum: 1 },
      },
    },
    // Urutkan pengeluaran pengadaan terbanyak
    { $sort: { totalProcuredAmount: -1 } },
    { $limit: limit },
    // Populate supplier
    {
      $lookup: {
        from: "suppliers",
        localField: "_id",
        foreignField: "_id",
        as: "supplierDetails",
      },
    },
    { $unwind: "$supplierDetails" },
    {
      $project: {
        _id: 1,
        totalProcuredAmount: 1,
        totalOrdersCount: 1,
        name: "$supplierDetails.name",
        phone: "$supplierDetails.phone",
        address: "$supplierDetails.address",
      },
    },
  ]);

  return result;
};

/**
 * 3. Mendapatkan Daftar Produk Stok Menipis (Stok <= MinimumStock atau Stok = 0)
 */
export const getLowStockProducts = async (): Promise<any[]> => {
  const products = await Product.find({ isActive: true });
  const lowStockItems: any[] = [];

  for (const product of products) {
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (variant.stock <= variant.minimumStock) {
          lowStockItems.push({
            productId: product._id,
            name: `${product.name} - ${variant.name}`,
            category: product.category,
            stock: variant.stock,
            minimumStock: variant.minimumStock,
            type: "variant",
            variantId: variant._id,
          });
        }
      }
    } else {
      if (product.stock <= product.minimumStock) {
        lowStockItems.push({
          productId: product._id,
          name: product.name,
          category: product.category,
          stock: product.stock,
          minimumStock: product.minimumStock,
          type: "base",
        });
      }
    }
  }

  // Urutkan berdasarkan stok terkecil (stok habis di atas)
  return lowStockItems.sort((a, b) => a.stock - b.stock);
};

/**
 * 4. Mendapatkan Grafik Penjualan Bulanan (Tahun Berjalan)
 */
export const getMonthlySalesTrend = async (): Promise<any[]> => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

  const result = await Order.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        totalSales: { $sum: "$totalAmount" },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result;
};

/**
 * 5. Mendapatkan Grafik Pengadaan Bulanan (Tahun Berjalan)
 */
export const getMonthlyProcurementTrend = async (): Promise<any[]> => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

  const result = await Procurement.aggregate([
    {
      $match: {
        status: "received",
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        totalProcurement: { $sum: "$totalAmount" },
        procurementCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result;
};

/**
 * 6. Dashboard Ringkasan Utama (Mengumpulkan seluruh analytics stat di atas)
 */
export const getDashboardSummary = async (): Promise<any> => {
  const [bestSelling, topSuppliers, lowStock, salesTrend, procurementTrend] =
    await Promise.all([
      getBestSellingProducts(5),
      getTopSuppliers(5),
      getLowStockProducts(),
      getMonthlySalesTrend(),
      getMonthlyProcurementTrend(),
    ]);

  // Statistik ringkasan cepat
  const totalSalesRevenue = salesTrend.reduce(
    (sum, item) => sum + item.totalSales,
    0
  );
  const totalSalesCount = salesTrend.reduce(
    (sum, item) => sum + item.transactionCount,
    0
  );
  const totalProcurementCost = procurementTrend.reduce(
    (sum, item) => sum + item.totalProcurement,
    0
  );

  return {
    quickStats: {
      totalSalesRevenue,
      totalSalesCount,
      totalProcurementCost,
      lowStockAlertCount: lowStock.length,
    },
    bestSelling,
    topSuppliers,
    lowStock: lowStock.slice(0, 10), // ambil top 10 stok tipis saja untuk widget dashboard
    salesTrend,
    procurementTrend,
  };
};
