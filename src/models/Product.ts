import mongoose, { Schema, Document } from "mongoose";

export interface IVariant {
  _id?: mongoose.Types.ObjectId;
  name: string; // Contoh: "40 KG", "50 KG", "5 KG", "25 KG"
  price: number; // Harga khusus varian ini
  stock: number; // Stok khusus varian ini
  minimumStock: number; // Batas minimal stok varian sebelum peringatan dipicu
  expiryDate?: Date; // Tanggal kedaluwarsa opsional untuk varian
  sku?: string; // Kode unik varian (optional)
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number; // Base price (bisa jadi harga default atau minimum)
  category: string;
  stock: number; // Total stok (akumulasi dari semua varian jika ada varian)
  minimumStock: number; // Batas minimal stok produk (jika tidak ada varian) sebelum peringatan dipicu
  expiryDate?: Date; // Tanggal kedaluwarsa opsional untuk produk
  image: string;
  isActive: boolean;
  variants: IVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IVariant>({
  name: {
    type: String,
    required: [true, "Nama varian wajib diisi"],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Harga varian wajib diisi"],
    min: [0, "Harga tidak boleh negatif"],
  },
  stock: {
    type: Number,
    required: [true, "Stok varian wajib diisi"],
    min: [0, "Stok tidak boleh negatif"],
    default: 0,
  },
  minimumStock: {
    type: Number,
    default: 5,
    min: [0, "Batas minimum stok tidak boleh negatif"],
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  sku: {
    type: String,
    trim: true,
  },
});

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
      min: [0, "Stok tidak boleh negatif"],
      default: 0,
    },
    minimumStock: {
      type: Number,
      default: 5,
      min: [0, "Batas minimum stok tidak boleh negatif"],
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    image: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug & total stok & default minimum stock logic sebelum disimpan
productSchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Jika produk memiliki varian, maka total stok (stock) adalah jumlah dari stok varian
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce(
      (total, variant) => total + variant.stock,
      0
    );

    // Set base price produk ke varian pertama
    if (this.variants[0]) {
      this.price = this.variants[0].price;
    }
  }
});

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;
