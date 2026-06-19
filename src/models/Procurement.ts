import mongoose, { Schema, Document, Types } from "mongoose";

export type ProcurementStatus =
  | "pending"
  | "ordered"
  | "received"
  | "cancelled";

export interface IProcurementItem {
  product: Types.ObjectId;
  variantId?: Types.ObjectId;
  variantName?: string;
  quantity: number;
  costPrice: number;
  totalPrice: number;
}

export interface IProcurement extends Document {
  procurementNumber: string; // Kode unik pengadaan (contoh: PR-20260620-0001)
  supplier: Types.ObjectId;
  items: IProcurementItem[];
  totalAmount: number;
  status: ProcurementStatus;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const procurementItemSchema = new Schema<IProcurementItem>({
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
  quantity: {
    type: Number,
    required: [true, "Quantity wajib ditentukan"],
    min: [1, "Quantity minimal 1"],
  },
  costPrice: {
    type: Number,
    required: [true, "Harga beli (cost price) wajib ditentukan"],
    min: [0, "Harga beli tidak boleh negatif"],
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const procurementSchema = new Schema<IProcurement>(
  {
    procurementNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier wajib ditentukan"],
    },
    items: {
      type: [procurementItemSchema],
      required: true,
      validate: [
        (val: any) => val.length > 0,
        "Item pengadaan minimal harus ada 1",
      ],
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "ordered", "received", "cancelled"],
      default: "pending",
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
procurementSchema.index({ procurementNumber: 1 });
procurementSchema.index({ supplier: 1 });
procurementSchema.index({ status: 1 });

const Procurement = mongoose.model<IProcurement>(
  "Procurement",
  procurementSchema
);

export default Procurement;
