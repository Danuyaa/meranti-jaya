import mongoose, { Schema, Document, Types } from "mongoose";

export type MovementType = "IN" | "OUT" | "ADJUSTMENT" | "DAMAGED" | "RETURN";

export interface IStockMovement extends Document {
  product: Types.ObjectId;
  variantId?: Types.ObjectId; // Jika perubahan stok pada varian tertentu
  variantName?: string; // Nama varian untuk referensi cepat
  type: MovementType;
  quantity: number; // Jumlah perubahan (selalu positif)
  previousStock: number; // Stok sebelum perubahan
  currentStock: number; // Stok setelah perubahan
  note: string; // Alasan/keterangan perubahan
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Produk wajib diisi"],
    },
    variantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    variantName: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ["IN", "OUT", "ADJUSTMENT", "DAMAGED", "RETURN"],
      required: [true, "Tipe pergerakan stok wajib diisi"],
    },
    quantity: {
      type: Number,
      required: [true, "Jumlah perubahan wajib diisi"],
      min: [1, "Jumlah minimal 1"],
    },
    previousStock: {
      type: Number,
      required: true,
    },
    currentStock: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User pembuat wajib diisi"],
    },
  },
  {
    timestamps: true,
  }
);

// Index untuk query yang sering digunakan
stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ createdBy: 1 });

const StockMovement = mongoose.model<IStockMovement>(
  "StockMovement",
  stockMovementSchema
);

export default StockMovement;
