import mongoose, { Schema, Document, Types } from "mongoose";

export type OrderStatus = "pending" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "transfer" | "qris";

export interface IOrderItem {
  product: Types.ObjectId;
  variantId?: Types.ObjectId;
  variantName?: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface IOrder extends Document {
  orderNumber: string; // Kode transaksi unik (contoh: TRX-20260620-0001)
  customerName: string;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  cashAmount?: number; // Jumlah uang dibayar (jika cash)
  changeAmount?: number; // Kembalian (jika cash)
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
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
  price: {
    type: Number,
    required: [true, "Harga jual wajib ditentukan"],
    min: [0, "Harga tidak boleh negatif"],
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerName: {
      type: String,
      default: "Pelanggan Umum",
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [
        (val: any) => val.length > 0,
        "Item pesanan minimal harus ada 1",
      ],
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer", "qris"],
      required: [true, "Metode pembayaran wajib ditentukan"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    cashAmount: {
      type: Number,
      default: 0,
    },
    changeAmount: {
      type: Number,
      default: 0,
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

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
