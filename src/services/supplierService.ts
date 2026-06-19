import Supplier, { ISupplier } from "../models/Supplier";

interface SupplierInput {
  name: string;
  phone: string;
  email?: string;
  address: string;
  description?: string;
}

interface SupplierQuery {
  page?: number;
  limit?: number;
  search?: string;
}

interface PaginatedResult {
  suppliers: ISupplier[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Get all suppliers
export const getAllSuppliers = async (
  query: SupplierQuery
): Promise<PaginatedResult> => {
  const { page = 1, limit = 10, search } = query;

  const filter: Record<string, any> = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Supplier.countDocuments(filter);

  const suppliers = await Supplier.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    suppliers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get supplier by ID
export const getSupplierById = async (id: string): Promise<ISupplier> => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw new Error("Supplier tidak ditemukan");
  }
  return supplier;
};

// Create supplier
export const createSupplier = async (
  input: SupplierInput
): Promise<ISupplier> => {
  const { name, phone, email, address, description } = input;

  const existing = await Supplier.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });
  if (existing) {
    throw new Error("Supplier dengan nama tersebut sudah ada");
  }

  const supplier = await Supplier.create({
    name,
    phone,
    email: email || "",
    address,
    description: description || "",
  });

  return supplier;
};

// Update supplier
export const updateSupplier = async (
  id: string,
  input: Partial<SupplierInput>
): Promise<ISupplier> => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw new Error("Supplier tidak ditemukan");
  }

  if (input.name) {
    const existing = await Supplier.findOne({
      name: { $regex: `^${input.name}$`, $options: "i" },
      _id: { $ne: id },
    });
    if (existing) {
      throw new Error("Supplier dengan nama tersebut sudah ada");
    }
  }

  if (input.name !== undefined) supplier.name = input.name;
  if (input.phone !== undefined) supplier.phone = input.phone;
  if (input.email !== undefined) supplier.email = input.email;
  if (input.address !== undefined) supplier.address = input.address;
  if (input.description !== undefined) supplier.description = input.description;

  await supplier.save();
  return supplier;
};

// Delete supplier
export const deleteSupplier = async (id: string): Promise<void> => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw new Error("Supplier tidak ditemukan");
  }
  await Supplier.findByIdAndDelete(id);
};
