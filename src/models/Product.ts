import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Nama produk wajib diisi"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Harga produk wajib diisi"],
      min: [0, "Harga tidak boleh negatif"],
    },
    category: {
      type: String,
      required: [true, "Kategori produk wajib diisi"],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Stok produk wajib diisi"],
      min: [0, "Stok tidak boleh negatif"],
      default: 0,
    },
    image: {
      type: String,
      default: "",
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

// Auto-generate slug from name before save
productSchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;
