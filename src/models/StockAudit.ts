import mongoose, { Schema, Document, Types } from "mongoose";

export type StockAuditStatus = "pending" | "completed";

export interface IStockAuditItem {
  product: Types.ObjectId;
  variantId?: Types.ObjectId;
  variantName?: string;
  systemStock: number;
  physicalStock: number;
  discrepancy: number; // physicalStock - systemStock
}

export interface IStockAudit extends Document {
  auditNumber: string; // Kode unik audit (contoh: AUD-20260620-0001)
  status: StockAuditStatus;
  items: IStockAuditItem[];
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockAuditItemSchema = new Schema<IStockAuditItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Produk wajib ditentukan"],
  },
  variantId: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  variantName: {
    type: String,
    default: null,
  },
  systemStock: {
    type: Number,
    required: [true, "Stok sistem wajib dicatat"],
    min: [0, "Stok sistem tidak boleh negatif"],
  },
  physicalStock: {
    type: Number,
    required: [true, "Stok fisik hasil perhitungan wajib diisi"],
    min: [0, "Stok fisik tidak boleh negatif"],
  },
  discrepancy: {
    type: Number,
    required: true,
  },
});

const stockAuditSchema = new Schema<IStockAudit>(
  {
    auditNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    items: {
      type: [stockAuditItemSchema],
      required: true,
      validate: [
        (val: any) => val.length > 0,
        "Item audit minimal harus ada 1",
      ],
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing
stockAuditSchema.index({ auditNumber: 1 });
stockAuditSchema.index({ status: 1 });
stockAuditSchema.index({ createdAt: -1 });

const StockAudit = mongoose.model<IStockAudit>("StockAudit", stockAuditSchema);

export default StockAudit;
