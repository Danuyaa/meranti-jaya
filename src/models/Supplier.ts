import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  phone: string;
  email?: string;
  address: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: [true, "Nama supplier wajib diisi"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Nomor telepon wajib diisi"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      required: [true, "Alamat supplier wajib diisi"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Supplier = mongoose.model<ISupplier>("Supplier", supplierSchema);

export default Supplier;
