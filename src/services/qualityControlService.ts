import Product from "../models/Product";
import { createStockMovement } from "./stockMovementService";
import mongoose from "mongoose";

interface QCReportInput {
  productId: string;
  variantId?: string;
  quantity: number;
  note: string;
  createdBy: string;
}

interface QCWarningItem {
  productId: string;
  name: string;
  category: string;
  variantId?: string;
  variantName?: string;
  stock: number;
  minimumStock: number;
  status: "OUT_OF_STOCK" | "LOW_STOCK" | "EXPIRED" | "EXPIRING_SOON";
  expiryDate?: Date;
  daysRemaining?: number;
}

/**
 * Melaporkan barang rusak (mengurangi stok dan mencatat movement DAMAGED)
 */
export const reportDamagedItem = async (input: QCReportInput): Promise<any> => {
  const { productId, variantId, quantity, note, createdBy } = input;

  if (quantity <= 0) {
    throw new Error("Kuantitas barang rusak harus lebih besar dari 0");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  // Validasi stok yang ada
  if (variantId) {
    const variant = product.variants.find(
      (v: any) => String(v._id) === variantId
    );
    if (!variant) {
      throw new Error("Varian produk tidak ditemukan");
    }
    if (variant.stock < quantity) {
      throw new Error(
        `Stok varian tidak mencukupi untuk dilaporkan rusak (Tersisa: ${variant.stock})`
      );
    }
  } else {
    if (product.variants.length > 0) {
      throw new Error("Produk memiliki varian. Harap tentukan variantId");
    }
    if (product.stock < quantity) {
      throw new Error(
        `Stok produk tidak mencukupi untuk dilaporkan rusak (Tersisa: ${product.stock})`
      );
    }
  }

  // Panggil createStockMovement dengan tipe DAMAGED (ini otomatis mengurangi stok produk/varian)
  const movement = await createStockMovement({
    productId,
    variantId,
    type: "DAMAGED",
    quantity,
    note: `Laporan Barang Rusak: ${note}`,
    createdBy,
  });

  return {
    message: "Laporan barang rusak berhasil dicatat. Stok otomatis dikurangi.",
    movement,
  };
};

/**
 * Melaporkan penarikan barang kedaluwarsa (mengurangi stok dan mencatat movement DAMAGED/EXPIRED)
 */
export const reportExpiredItem = async (input: QCReportInput): Promise<any> => {
  const { productId, variantId, quantity, note, createdBy } = input;

  if (quantity <= 0) {
    throw new Error("Kuantitas barang kedaluwarsa harus lebih besar dari 0");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  // Validasi stok
  if (variantId) {
    const variant = product.variants.find(
      (v: any) => String(v._id) === variantId
    );
    if (!variant) {
      throw new Error("Varian produk tidak ditemukan");
    }
    if (variant.stock < quantity) {
      throw new Error(
        `Stok varian tidak mencukupi untuk dikeluarkan (Tersisa: ${variant.stock})`
      );
    }
  } else {
    if (product.variants.length > 0) {
      throw new Error("Produk memiliki varian. Harap tentukan variantId");
    }
    if (product.stock < quantity) {
      throw new Error(
        `Stok produk tidak mencukupi untuk dikeluarkan (Tersisa: ${product.stock})`
      );
    }
  }

  // Panggil createStockMovement dengan tipe DAMAGED (atau custom log penarikan kedaluwarsa)
  const movement = await createStockMovement({
    productId,
    variantId,
    type: "DAMAGED",
    quantity,
    note: `Laporan Penarikan Barang Kedaluwarsa: ${note}`,
    createdBy,
  });

  return {
    message:
      "Laporan penarikan barang kedaluwarsa berhasil dicatat. Stok otomatis dikurangi.",
    movement,
  };
};

/**
 * Mendapatkan daftar barang peringatan (stok menipis, habis, kedaluwarsa, mendekati kedaluwarsa)
 */
export const getQCWarnings = async (): Promise<QCWarningItem[]> => {
  const products = await Product.find({ isActive: true });
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  const warnings: QCWarningItem[] = [];

  for (const product of products) {
    // 1. Produk dengan varian
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        let isWarning = false;
        let status: QCWarningItem["status"] = "LOW_STOCK";
        let daysRemaining: number | undefined;

        // Cek kedaluwarsa varian
        if (variant.expiryDate) {
          const expDate = new Date(variant.expiryDate);
          if (expDate <= today) {
            isWarning = true;
            status = "EXPIRED";
          } else if (expDate <= thirtyDaysLater) {
            isWarning = true;
            status = "EXPIRING_SOON";
            const diffTime = Math.abs(expDate.getTime() - today.getTime());
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }

        // Cek stok varian
        if (variant.stock === 0) {
          isWarning = true;
          status = "OUT_OF_STOCK";
        } else if (variant.stock <= variant.minimumStock) {
          isWarning = true;
          // low stock hanya diset jika status tidak kedaluwarsa / expiring soon
          if (status !== "EXPIRED" && status !== "EXPIRING_SOON") {
            status = "LOW_STOCK";
          }
        }

        if (isWarning) {
          warnings.push({
            productId: String(product._id),
            name: product.name,
            category: product.category,
            variantId: String(variant._id),
            variantName: variant.name,
            stock: variant.stock,
            minimumStock: variant.minimumStock,
            status,
            expiryDate: variant.expiryDate,
            daysRemaining,
          });
        }
      }
    }
    // 2. Produk tanpa varian
    else {
      let isWarning = false;
      let status: QCWarningItem["status"] = "LOW_STOCK";
      let daysRemaining: number | undefined;

      // Cek kedaluwarsa
      if (product.expiryDate) {
        const expDate = new Date(product.expiryDate);
        if (expDate <= today) {
          isWarning = true;
          status = "EXPIRED";
        } else if (expDate <= thirtyDaysLater) {
          isWarning = true;
          status = "EXPIRING_SOON";
          const diffTime = Math.abs(expDate.getTime() - today.getTime());
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      // Cek stok
      if (product.stock === 0) {
        isWarning = true;
        status = "OUT_OF_STOCK";
      } else if (product.stock <= product.minimumStock) {
        isWarning = true;
        if (status !== "EXPIRED" && status !== "EXPIRING_SOON") {
          status = "LOW_STOCK";
        }
      }

      if (isWarning) {
        warnings.push({
          productId: String(product._id),
          name: product.name,
          category: product.category,
          stock: product.stock,
          minimumStock: product.minimumStock,
          status,
          expiryDate: product.expiryDate,
          daysRemaining,
        });
      }
    }
  }

  // Urutkan peringatan: OUT_OF_STOCK -> EXPIRED -> EXPIRING_SOON -> LOW_STOCK
  const orderWeight = {
    OUT_OF_STOCK: 1,
    EXPIRED: 2,
    EXPIRING_SOON: 3,
    LOW_STOCK: 4,
  };

  return warnings.sort((a, b) => orderWeight[a.status] - orderWeight[b.status]);
};
