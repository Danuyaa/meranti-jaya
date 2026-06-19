import Product, { IProduct } from "../models/Product";
import fs from "fs";
import path from "path";

interface ProductInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
}

interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}

interface PaginatedResult {
  products: IProduct[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Get all products with search, filter, and pagination
export const getAllProducts = async (
  query: ProductQuery
): Promise<PaginatedResult> => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    sortBy = "createdAt",
    order = "desc",
  } = query;

  // Build filter
  const filter: Record<string, any> = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    filter.category = { $regex: `^${category}$`, $options: "i" };
  }

  // Count total
  const total = await Product.countDocuments(filter);

  // Get products
  const products = await Product.find(filter)
    .sort({ [sortBy]: order === "asc" ? 1 : -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get single product by ID
export const getProductById = async (id: string): Promise<IProduct> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }
  return product;
};

// Create product
export const createProduct = async (input: ProductInput): Promise<IProduct> => {
  const { name, description, price, category, stock, image } = input;

  // Check duplicate name
  const existing = await Product.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });
  if (existing) {
    throw new Error("Produk dengan nama tersebut sudah ada");
  }

  const product = await Product.create({
    name,
    description: description || "",
    price,
    category,
    stock,
    image: image || "",
  });

  return product;
};

// Update product
export const updateProduct = async (
  id: string,
  input: Partial<ProductInput>
): Promise<IProduct> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  // Check duplicate name (exclude current product)
  if (input.name) {
    const existing = await Product.findOne({
      name: { $regex: `^${input.name}$`, $options: "i" },
      _id: { $ne: id },
    });
    if (existing) {
      throw new Error("Produk dengan nama tersebut sudah ada");
    }
  }

  // Update fields
  if (input.name !== undefined) product.name = input.name;
  if (input.description !== undefined) product.description = input.description;
  if (input.price !== undefined) product.price = input.price;
  if (input.category !== undefined) product.category = input.category;
  if (input.stock !== undefined) product.stock = input.stock;

  // Handle image update - delete old image if replaced
  if (
    input.image !== undefined &&
    product.image &&
    product.image !== input.image
  ) {
    deleteImageFile(product.image);
  }
  if (input.image !== undefined) product.image = input.image;

  await product.save();
  return product;
};

// Delete product
export const deleteProduct = async (id: string): Promise<void> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  // Delete image file if exists
  if (product.image) {
    deleteImageFile(product.image);
  }

  await Product.findByIdAndDelete(id);
};

// Get all categories
export const getCategories = async (): Promise<string[]> => {
  const categories = await Product.distinct("category");
  return categories.sort();
};

// Helper: delete image file from uploads
const deleteImageFile = (imagePath: string): void => {
  try {
    const filename = imagePath.split("/").pop();
    if (filename) {
      const fullPath = path.join(__dirname, "../uploads", filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch {
    // Silently ignore file deletion errors
  }
};
