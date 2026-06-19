import { Request, Response } from "express";
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../services/supplierService";
import { sendSuccess, sendError } from "../utils/response";

// GET /api/suppliers
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, search } = req.query;

    const result = await getAllSuppliers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
    });

    sendSuccess(res, 200, "Data supplier berhasil diambil", result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil data supplier";
    sendError(res, 500, message);
  }
};

// GET /api/suppliers/:id
export const show = async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await getSupplierById(req.params.id as string);
    sendSuccess(res, 200, "Detail supplier berhasil diambil", supplier);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil detail supplier";
    const statusCode = message === "Supplier tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};

// POST /api/suppliers
export const store = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, description } = req.body;

    if (!name || !phone || !address) {
      sendError(res, 400, "Nama, telepon, dan alamat wajib diisi");
      return;
    }

    const supplier = await createSupplier({
      name,
      phone,
      email,
      address,
      description,
    });

    sendSuccess(res, 201, "Supplier berhasil ditambahkan", supplier);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menambahkan supplier";
    sendError(res, 400, message);
  }
};

// PUT /api/suppliers/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, description } = req.body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;

    const supplier = await updateSupplier(req.params.id as string, updateData);

    sendSuccess(res, 200, "Supplier berhasil diperbarui", supplier);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui supplier";
    const statusCode = message === "Supplier tidak ditemukan" ? 404 : 400;
    sendError(res, statusCode, message);
  }
};

// DELETE /api/suppliers/:id
export const destroy = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteSupplier(req.params.id as string);
    sendSuccess(res, 200, "Supplier berhasil dihapus");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus supplier";
    const statusCode = message === "Supplier tidak ditemukan" ? 404 : 500;
    sendError(res, statusCode, message);
  }
};
