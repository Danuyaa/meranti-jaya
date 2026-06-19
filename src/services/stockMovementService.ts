import StockMovement, {
  IStockMovement,
  MovementType,
} from "../models/StockMovement";
import Product from "../models/Product";
import mongoose from "mongoose";

interface StockMovementInput {
  productId: string;
  variantId?: string;
  type: MovementType;
  quantity: number;
  note?: string;
  createdBy: string;
}

interface StockMovementQuery {
  page?: number;
  limit?: number;
  productId?: string;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
}

interface PaginatedMovements {
  movements: IStockMovement[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Tipe yang menambah stok
const STOCK_IN_TYPES: MovementType[] = ["IN", "RETURN"];
// Tipe yang mengurangi stok
const STOCK_OUT_TYPES: MovementType[] = ["OUT", "DAMAGED"];

/**
 * Membuat catatan pergerakan stok dan mengupdate stok produk/varian secara atomik.
 */
export const createStockMovement = async (
  input: StockMovementInput
): Promise<IStockMovement> => {
  const { productId, variantId, type, quantity, note, createdBy } = input;

  // Validasi quantity
  if (quantity <= 0) {
    throw new Error("Jumlah perubahan stok harus lebih dari 0");
  }

  // Cari produk
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  let previousStock: number;
  let currentStock: number;
  let variantName: string | undefined;

  // === Jika perubahan stok pada VARIAN tertentu ===
  if (variantId) {
    const variant = product.variants.find(
      (v: any) => String(v._id) === variantId
    );
    if (!variant) {
      throw new Error("Varian tidak ditemukan pada produk ini");
    }

    previousStock = variant.stock;
    variantName = variant.name;

    // Hitung stok baru
    if (STOCK_IN_TYPES.includes(type)) {
      currentStock = previousStock + quantity;
    } else if (STOCK_OUT_TYPES.includes(type)) {
      if (previousStock < quantity) {
        throw new Error(
          `Stok varian "${variant.name}" tidak mencukupi (tersisa: ${previousStock})`
        );
      }
      currentStock = previousStock - quantity;
    } else {
      // ADJUSTMENT: quantity menjadi stok baru langsung
      currentStock = quantity;
    }

    // Update stok varian
    variant.stock = currentStock;

    // Save product (akan trigger pre-save hook untuk recalculate total stock)
    await product.save();
  }
  // === Jika perubahan stok pada PRODUK tanpa varian ===
  else {
    if (product.variants.length > 0) {
      throw new Error(
        "Produk ini memiliki varian. Harap tentukan variantId untuk mengubah stok"
      );
    }

    previousStock = product.stock;

    if (STOCK_IN_TYPES.includes(type)) {
      currentStock = previousStock + quantity;
    } else if (STOCK_OUT_TYPES.includes(type)) {
      if (previousStock < quantity) {
        throw new Error(
          `Stok produk tidak mencukupi (tersisa: ${previousStock})`
        );
      }
      currentStock = previousStock - quantity;
    } else {
      // ADJUSTMENT
      currentStock = quantity;
    }

    product.stock = currentStock;
    await product.save();
  }

  // Buat catatan pergerakan stok
  const movement = await StockMovement.create({
    product: productId,
    variantId: variantId || undefined,
    variantName: variantName || undefined,
    type,
    quantity,
    previousStock,
    currentStock,
    note: note || "",
    createdBy,
  });

  return movement;
};

/**
 * Mendapatkan riwayat pergerakan stok dengan filter dan pagination.
 */
export const getStockMovements = async (
  query: StockMovementQuery
): Promise<PaginatedMovements> => {
  const { page = 1, limit = 20, productId, type, startDate, endDate } = query;

  const filter: Record<string, any> = {};

  if (productId) {
    filter.product = new mongoose.Types.ObjectId(productId);
  }

  if (type) {
    filter.type = type;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }
  }

  const total = await StockMovement.countDocuments(filter);

  const movements = await StockMovement.find(filter)
    .populate("product", "name slug category")
    .populate("createdBy", "name username")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    movements,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mendapatkan riwayat pergerakan stok berdasarkan produk tertentu.
 */
export const getMovementsByProduct = async (
  productId: string
): Promise<IStockMovement[]> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  const movements = await StockMovement.find({ product: productId })
    .populate("createdBy", "name username")
    .sort({ createdAt: -1 });

  return movements;
};

/**
 * Mendapatkan ringkasan stok: total IN, OUT, ADJUSTMENT, DAMAGED, RETURN per produk.
 */
export const getStockSummary = async (
  productId: string
): Promise<Record<string, any>> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  const summary = await StockMovement.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$type",
        totalQuantity: { $sum: "$quantity" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Format summary
  const result: Record<string, { totalQuantity: number; count: number }> = {
    IN: { totalQuantity: 0, count: 0 },
    OUT: { totalQuantity: 0, count: 0 },
    ADJUSTMENT: { totalQuantity: 0, count: 0 },
    DAMAGED: { totalQuantity: 0, count: 0 },
    RETURN: { totalQuantity: 0, count: 0 },
  };

  for (const item of summary) {
    result[item._id] = {
      totalQuantity: item.totalQuantity,
      count: item.count,
    };
  }

  return {
    product: {
      id: product._id,
      name: product.name,
      currentStock: product.stock,
      variants: product.variants,
    },
    summary: result,
  };
};
