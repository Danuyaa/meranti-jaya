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
    const { name, description, price, category, stock } = req.body;

    // Validation
    if (!name || price === undefined || !category || stock === undefined) {
      sendError(res, 400, "Name, price, category, dan stock wajib diisi");
      return;
    }

    // Build image URL if file uploaded
    const image = req.file ? `/uploads/${req.file.filename}` : "";

    const product = await createProduct({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      image,
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
    const { name, description, price, category, stock } = req.body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (category !== undefined) updateData.category = category;
    if (stock !== undefined) updateData.stock = Number(stock);

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
