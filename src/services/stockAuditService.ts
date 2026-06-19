import StockAudit, {
  IStockAudit,
  StockAuditStatus,
} from "../models/StockAudit";
import Product from "../models/Product";
import { createStockMovement } from "./stockMovementService";
import mongoose from "mongoose";

interface AuditItemInput {
  product: string;
  variantId?: string;
  physicalStock: number;
}

interface StockAuditInput {
  items: AuditItemInput[];
  note?: string;
  createdBy: string;
}

interface StockAuditQuery {
  page?: number;
  limit?: number;
  status?: StockAuditStatus;
  search?: string; // nomor audit
  startDate?: string;
  endDate?: string;
}

interface PaginatedStockAudits {
  audits: IStockAudit[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Generate serial stock audit number (AUD-YYYYMMDD-XXXX)
 */
const generateAuditNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  const prefix = `AUD-${year}${month}${date}-`;

  // Cari transaksi terakhir dengan prefix hari ini
  const lastAudit = await StockAudit.findOne({
    auditNumber: new RegExp(`^${prefix}`),
  })
    .sort({ createdAt: -1 })
    .select("auditNumber");

  let serial = 1;
  if (lastAudit) {
    const parts = lastAudit.auditNumber.split("-");
    const lastSerial = parseInt(parts[2], 10);
    if (!isNaN(lastSerial)) {
      serial = lastSerial + 1;
    }
  }

  const serialStr = String(serial).padStart(4, "0");
  return `${prefix}${serialStr}`;
};

/**
 * Membuat draft audit stok baru (status: pending secara default)
 */
export const createStockAudit = async (
  input: StockAuditInput
): Promise<IStockAudit> => {
  const { items, note, createdBy } = input;

  if (items.length === 0) {
    throw new Error("Item audit minimal harus ada 1");
  }

  const processedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Produk dengan ID ${item.product} tidak ditemukan`);
    }

    let systemStock = 0;
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
      systemStock = variant.stock;
      variantName = variant.name;
    } else {
      if (product.variants.length > 0) {
        throw new Error(
          `Produk "${product.name}" memiliki varian. Harap tentukan variantId`
        );
      }
      systemStock = product.stock;
    }

    const discrepancy = item.physicalStock - systemStock;

    processedItems.push({
      product: new mongoose.Types.ObjectId(item.product),
      variantId: item.variantId
        ? new mongoose.Types.ObjectId(item.variantId)
        : undefined,
      variantName,
      systemStock,
      physicalStock: item.physicalStock,
      discrepancy,
    });
  }

  const auditNumber = await generateAuditNumber();

  const audit = await StockAudit.create({
    auditNumber,
    items: processedItems,
    status: "pending",
    note: note || "",
    createdBy,
  });

  return audit;
};

/**
 * Mendapatkan daftar audit stok dengan filter & pagination
 */
export const getStockAudits = async (
  query: StockAuditQuery
): Promise<PaginatedStockAudits> => {
  const { page = 1, limit = 10, status, search, startDate, endDate } = query;

  const filter: Record<string, any> = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.auditNumber = { $regex: search, $options: "i" };
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

  const total = await StockAudit.countDocuments(filter);

  const audits = await StockAudit.find(filter)
    .populate("createdBy", "name username")
    .populate("items.product", "name slug category")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    audits,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mengambil detail audit stok berdasarkan ID
 */
export const getStockAuditById = async (id: string): Promise<IStockAudit> => {
  const audit = await StockAudit.findById(id)
    .populate("createdBy", "name username")
    .populate("items.product", "name slug category price stock");

  if (!audit) {
    throw new Error("Audit stok tidak ditemukan");
  }

  return audit;
};

/**
 * Menyelesaikan audit stok (status completed) & melakukan penyesuaian stok sistem otomatis
 */
export const completeStockAudit = async (
  id: string,
  userId: string
): Promise<IStockAudit> => {
  const audit = await StockAudit.findById(id);
  if (!audit) {
    throw new Error("Audit stok tidak ditemukan");
  }

  if (audit.status === "completed") {
    throw new Error(
      "Audit stok sudah berstatus completed dan tidak bisa diubah lagi"
    );
  }

  // Lakukan penyesuaian stok sistem hanya jika ada selisih (discrepancy !== 0)
  for (const item of audit.items) {
    if (item.discrepancy !== 0) {
      // Kita panggil createStockMovement dengan tipe ADJUSTMENT
      // Di dalam stockMovementService, quantity untuk ADJUSTMENT diposisikan sebagai stok akhir/fisik baru.
      await createStockMovement({
        productId: String(item.product),
        variantId: item.variantId ? String(item.variantId) : undefined,
        type: "ADJUSTMENT",
        quantity: item.physicalStock, // Stok fisik baru
        note: `Penyesuaian stok sistem via Audit #${audit.auditNumber} (Selisih: ${item.discrepancy > 0 ? "+" : ""}${item.discrepancy})`,
        createdBy: userId,
      });
    }
  }

  audit.status = "completed";
  await audit.save();

  return getStockAuditById(audit._id.toString());
};
