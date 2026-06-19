import { Request, Response } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} from "../services/productService";
import { sendSuccess, sendError } from "../utils/response";

// Helper to parse variants from body
const parseVariants = (variantsInput: any): any[] | undefined => {
  if (!variantsInput) return undefined;
  try {
    if (typeof variantsInput === "string") {
      return JSON.parse(variantsInput);
    }
    return variantsInput;
  } catch (error) {
    throw new Error(
      "Format data varian tidak valid (harus berupa JSON string atau Array)"
    );
  }
};

// GET /api/products
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, search, category, sortBy, order } = req.query;

    const result = await getAllProducts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      category: category as string,
      sortBy: sortBy as string,
      order: order as "asc" | "desc",
    });

    sendSuccess(res, 200, "Data produk berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil data produk";
    sendError(res, 500, message);
  }
};

// GET /api/products/categories
export const categories = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await getCategories();
    sendSuccess(res, 200, "Data kategori berhasil diambil", result);
  } catch (error) {
    sendError(res, 500, "Gagal mengambil data kategori");
  }
};

// GET /api/products/:id
export const show = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await getProductById(req.params.id as string);
    sendSuccess(res, 200, "Detail produk berhasil diambil", product);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil detail produk";
    const statusCode = message === "Produk tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};

// POST /api/products
export const store = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      variants,
      minimumStock,
      expiryDate,
    } = req.body;

    // Parse variants if provided
    let parsedVariants: any[] | undefined;
    try {
      parsedVariants = parseVariants(variants);
    } catch (err: any) {
      sendError(res, 400, err.message);
      return;
    }

    // Validation
    // Jika tidak ada varian, price dan stock di level produk wajib diisi.
    // Jika ada varian, price dan stock level produk opsional karena akan dihitung otomatis dari varian.
    if (!name || !category) {
      sendError(res, 400, "Nama dan kategori wajib diisi");
      return;
    }

    const hasVariants = parsedVariants && parsedVariants.length > 0;

    if (!hasVariants && (price === undefined || stock === undefined)) {
      sendError(
        res,
        400,
        "Harga dan stok wajib diisi jika produk tidak memiliki varian"
      );
      return;
    }

    // Build image URL if file uploaded
    const image = req.file ? `/uploads/${req.file.filename}` : "";

    const product = await createProduct({
      name,
      description,
      price: price !== undefined ? Number(price) : 0,
      category,
      stock: stock !== undefined ? Number(stock) : 0,
      image,
      variants: parsedVariants,
      minimumStock:
        minimumStock !== undefined ? Number(minimumStock) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    sendSuccess(res, 201, "Produk berhasil ditambahkan", product);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menambahkan produk";
    sendError(res, 400, message);
  }
};

// PUT /api/products/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      variants,
      minimumStock,
      expiryDate,
    } = req.body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (category !== undefined) updateData.category = category;
    if (stock !== undefined) updateData.stock = Number(stock);
    if (minimumStock !== undefined)
      updateData.minimumStock = Number(minimumStock);
    if (expiryDate !== undefined)
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;

    // Parse variants if provided
    if (variants !== undefined) {
      try {
        updateData.variants = parseVariants(variants);
      } catch (err: any) {
        sendError(res, 400, err.message);
        return;
      }
    }

    // Handle image upload
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const product = await updateProduct(req.params.id as string, updateData);

    sendSuccess(res, 200, "Produk berhasil diperbarui", product);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui produk";
    const statusCode = message === "Produk tidak ditemukan" ? 404 : 400;
    sendError(res, statusCode, message);
  }
};

// DELETE /api/products/:id
export const destroy = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteProduct(req.params.id as string);
    sendSuccess(res, 200, "Produk berhasil dihapus");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus produk";
    const statusCode = message === "Produk tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};
