import Procurement, {
  IProcurement,
  ProcurementStatus,
} from "../models/Procurement";
import Product from "../models/Product";
import Supplier from "../models/Supplier";
import { createStockMovement } from "./stockMovementService";
import mongoose from "mongoose";

interface ProcurementItemInput {
  product: string;
  variantId?: string;
  quantity: number;
  costPrice: number;
}

interface ProcurementInput {
  supplier: string;
  items: ProcurementItemInput[];
  note?: string;
  createdBy: string;
}

interface ProcurementQuery {
  page?: number;
  limit?: number;
  status?: ProcurementStatus;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

interface PaginatedProcurements {
  procurements: IProcurement[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Generate serial procurement number (PR-YYYYMMDD-XXXX)
 */
const generateProcurementNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  const prefix = `PR-${year}${month}${date}-`;

  // Cari transaksi terakhir dengan prefix hari ini
  const lastProcurement = await Procurement.findOne({
    procurementNumber: new RegExp(`^${prefix}`),
  })
    .sort({ createdAt: -1 })
    .select("procurementNumber");

  let serial = 1;
  if (lastProcurement) {
    const parts = lastProcurement.procurementNumber.split("-");
    const lastSerial = parseInt(parts[2], 10);
    if (!isNaN(lastSerial)) {
      serial = lastSerial + 1;
    }
  }

  const serialStr = String(serial).padStart(4, "0");
  return `${prefix}${serialStr}`;
};

/**
 * Buat pengadaan baru (Default status: pending)
 */
export const createProcurement = async (
  input: ProcurementInput
): Promise<IProcurement> => {
  const { supplier, items, note, createdBy } = input;

  // Cek supplier
  const existingSupplier = await Supplier.findById(supplier);
  if (!existingSupplier) {
    throw new Error("Supplier tidak ditemukan");
  }

  if (items.length === 0) {
    throw new Error("Item pengadaan minimal harus ada 1");
  }

  const processedItems = [];
  let totalAmount = 0;

  // Validasi produk & varian untuk setiap item
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Produk dengan ID ${item.product} tidak ditemukan`);
    }

    let variantName: string | undefined;

    if (item.variantId) {
      const variant = product.variants.find(
        (v: any) => String(v._id) === item.variantId
      );
      if (!variant) {
        throw new Error(
          `Varian dengan ID ${item.variantId} tidak ditemukan pada produk ${product.name}`
        );
      }
      variantName = variant.name;
    } else if (product.variants.length > 0) {
      throw new Error(
        `Produk "${product.name}" memiliki varian. Harus menentukan variantId`
      );
    }

    const itemTotalPrice = item.quantity * item.costPrice;
    totalAmount += itemTotalPrice;

    processedItems.push({
      product: new mongoose.Types.ObjectId(item.product),
      variantId: item.variantId
        ? new mongoose.Types.ObjectId(item.variantId)
        : undefined,
      variantName,
      quantity: item.quantity,
      costPrice: item.costPrice,
      totalPrice: itemTotalPrice,
    });
  }

  const procurementNumber = await generateProcurementNumber();

  const procurement = await Procurement.create({
    procurementNumber,
    supplier,
    items: processedItems,
    totalAmount,
    status: "pending",
    note: note || "",
    createdBy,
  });

  return procurement;
};

/**
 * Mendapatkan daftar pengadaan dengan filter & pagination
 */
export const getProcurements = async (
  query: ProcurementQuery
): Promise<PaginatedProcurements> => {
  const {
    page = 1,
    limit = 10,
    status,
    supplierId,
    startDate,
    endDate,
  } = query;

  const filter: Record<string, any> = {};

  if (status) {
    filter.status = status;
  }

  if (supplierId) {
    filter.supplier = new mongoose.Types.ObjectId(supplierId);
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

  const total = await Procurement.countDocuments(filter);

  const procurements = await Procurement.find(filter)
    .populate("supplier", "name phone address")
    .populate("createdBy", "name username")
    .populate("items.product", "name slug category")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    procurements,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mengambil detail pengadaan berdasarkan ID
 */
export const getProcurementById = async (id: string): Promise<IProcurement> => {
  const procurement = await Procurement.findById(id)
    .populate("supplier", "name phone address")
    .populate("createdBy", "name username")
    .populate("items.product", "name slug category");

  if (!procurement) {
    throw new Error("Data pengadaan tidak ditemukan");
  }

  return procurement;
};

/**
 * Update status pengadaan (dan trigger stok bertambah jika received)
 */
export const updateProcurementStatus = async (
  id: string,
  status: ProcurementStatus,
  note?: string,
  userId?: string
): Promise<IProcurement> => {
  const procurement = await Procurement.findById(id);
  if (!procurement) {
    throw new Error("Data pengadaan tidak ditemukan");
  }

  // Jika status saat ini received atau cancelled, tidak boleh diubah lagi
  if (procurement.status === "received") {
    throw new Error(
      "Pengadaan yang sudah diterima (received) tidak dapat diubah statusnya"
    );
  }
  if (procurement.status === "cancelled") {
    throw new Error(
      "Pengadaan yang sudah dibatalkan (cancelled) tidak dapat diubah statusnya"
    );
  }

  // Validasi transisi status
  if (status === procurement.status) {
    if (note !== undefined) {
      procurement.note = note;
      await procurement.save();
    }
    return procurement;
  }

  // Jika diubah menjadi received, tambahkan stok produk & catat stock movement
  if (status === "received") {
    if (!userId) {
      throw new Error(
        "ID User wajib dilampirkan untuk memproses penerimaan barang"
      );
    }

    for (const item of procurement.items) {
      // Panggil createStockMovement dari stockMovementService
      // Ini akan otomatis menambahkan stok produk/varian secara aman dan mencatat riwayat
      await createStockMovement({
        productId: String(item.product),
        variantId: item.variantId ? String(item.variantId) : undefined,
        type: "IN",
        quantity: item.quantity,
        note: `Penerimaan Barang dari Pengadaan #${procurement.procurementNumber}`,
        createdBy: userId,
      });
    }
  }

  procurement.status = status;
  if (note !== undefined) {
    procurement.note = note;
  }

  await procurement.save();

  // Populate data baru sebelum di-return
  return getProcurementById(procurement._id.toString());
};
