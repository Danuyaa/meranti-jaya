import Order, { IOrder, OrderStatus, PaymentMethod } from "../models/Order";
import Product from "../models/Product";
import { createStockMovement } from "./stockMovementService";
import mongoose from "mongoose";

interface OrderItemInput {
  product: string;
  variantId?: string;
  quantity: number;
}

interface OrderInput {
  customerName?: string;
  items: OrderItemInput[];
  paymentMethod: PaymentMethod;
  status?: OrderStatus;
  cashAmount?: number;
  note?: string;
  createdBy: string;
}

interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  search?: string; // nomor transaksi atau nama customer
  startDate?: string;
  endDate?: string;
}

interface PaginatedOrders {
  orders: IOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Generate serial transaction order number (TRX-YYYYMMDD-XXXX)
 */
const generateOrderNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  const prefix = `TRX-${year}${month}${date}-`;

  // Cari transaksi terakhir dengan prefix hari ini
  const lastOrder = await Order.findOne({
    orderNumber: new RegExp(`^${prefix}`),
  })
    .sort({ createdAt: -1 })
    .select("orderNumber");

  let serial = 1;
  if (lastOrder) {
    const parts = lastOrder.orderNumber.split("-");
    const lastSerial = parseInt(parts[2], 10);
    if (!isNaN(lastSerial)) {
      serial = lastSerial + 1;
    }
  }

  const serialStr = String(serial).padStart(4, "0");
  return `${prefix}${serialStr}`;
};

/**
 * Membuat pesanan pelanggan baru (dan otomatis memotong stok)
 */
export const createOrder = async (input: OrderInput): Promise<IOrder> => {
  const {
    customerName,
    items,
    paymentMethod,
    status = "completed",
    cashAmount = 0,
    note,
    createdBy,
  } = input;

  if (items.length === 0) {
    throw new Error("Item pesanan minimal harus ada 1");
  }

  const processedItems = [];
  let totalAmount = 0;

  // 1. Validasi produk, varian, harga, dan stok terlebih dahulu
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Produk dengan ID ${item.product} tidak ditemukan`);
    }

    let price = product.price;
    let variantName: string | undefined;

    if (item.variantId) {
      const variant = product.variants.find(
        (v: any) => String(v._id) === item.variantId
      );
      if (!variant) {
        throw new Error(
          `Varian dengan ID ${item.variantId} tidak ditemukan pada produk ${product.name}`
        );
      }
      price = variant.price;
      variantName = variant.name;

      // Cek stok varian jika status langsung "completed"
      if (status === "completed" && variant.stock < item.quantity) {
        throw new Error(
          `Stok produk "${product.name}" varian "${variant.name}" tidak mencukupi (Tersisa: ${variant.stock})`
        );
      }
    } else {
      if (product.variants.length > 0) {
        throw new Error(
          `Produk "${product.name}" memiliki varian. Harap tentukan variantId`
        );
      }

      // Cek stok produk utama jika status langsung "completed"
      if (status === "completed" && product.stock < item.quantity) {
        throw new Error(
          `Stok produk "${product.name}" tidak mencukupi (Tersisa: ${product.stock})`
        );
      }
    }

    const itemTotalPrice = item.quantity * price;
    totalAmount += itemTotalPrice;

    processedItems.push({
      product: new mongoose.Types.ObjectId(item.product),
      variantId: item.variantId
        ? new mongoose.Types.ObjectId(item.variantId)
        : undefined,
      variantName,
      quantity: item.quantity,
      price,
      totalPrice: itemTotalPrice,
    });
  }

  // 2. Kalkulasi pembayaran tunai (cash)
  let changeAmount = 0;
  if (paymentMethod === "cash") {
    if (cashAmount < totalAmount) {
      throw new Error(
        `Uang bayar tidak mencukupi. Total: Rp ${totalAmount.toLocaleString()}, Dibayarkan: Rp ${cashAmount.toLocaleString()}`
      );
    }
    changeAmount = cashAmount - totalAmount;
  }

  // Generate order number
  const orderNumber = await generateOrderNumber();

  // 3. Simpan data pesanan ke database
  const order = await Order.create({
    orderNumber,
    customerName: customerName || "Pelanggan Umum",
    items: processedItems,
    totalAmount,
    paymentMethod,
    status,
    cashAmount: paymentMethod === "cash" ? cashAmount : 0,
    changeAmount: paymentMethod === "cash" ? changeAmount : 0,
    note: note || "",
    createdBy,
  });

  // 4. Jika status completed, lakukan pemotongan stok lewat StockMovement
  if (status === "completed") {
    for (const item of order.items) {
      await createStockMovement({
        productId: String(item.product),
        variantId: item.variantId ? String(item.variantId) : undefined,
        type: "OUT",
        quantity: item.quantity,
        note: `Penjualan dari Transaksi #${order.orderNumber}`,
        createdBy: createdBy,
      });
    }
  }

  return order;
};

/**
 * Mengambil daftar pesanan pelanggan (dengan search & filters)
 */
export const getOrders = async (
  query: OrderQuery
): Promise<PaginatedOrders> => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentMethod,
    search,
    startDate,
    endDate,
  } = query;

  const filter: Record<string, any> = {};

  if (status) {
    filter.status = status;
  }

  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }
  }

  const total = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .populate("createdBy", "name username")
    .populate("items.product", "name slug category")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mengambil detail pesanan berdasarkan ID
 */
export const getOrderById = async (id: string): Promise<IOrder> => {
  const order = await Order.findById(id)
    .populate("createdBy", "name username")
    .populate("items.product", "name slug category price stock");

  if (!order) {
    throw new Error("Pesanan tidak ditemukan");
  }

  return order;
};

/**
 * Update status order (pending -> completed, atau completed/pending -> cancelled)
 */
export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
  userId: string
): Promise<IOrder> => {
  const order = await Order.findById(id);
  if (!order) {
    throw new Error("Pesanan tidak ditemukan");
  }

  if (order.status === "cancelled") {
    throw new Error(
      "Pesanan yang sudah dibatalkan tidak bisa diubah statusnya lagi"
    );
  }

  if (status === order.status) {
    return order;
  }

  // Transisi status: pending -> completed (potong stok)
  if (order.status === "pending" && status === "completed") {
    // Validasi stok dahulu sebelum memotong
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Produk tidak ditemukan saat memproses pesanan`);
      }

      if (item.variantId) {
        const variant = product.variants.find(
          (v: any) => String(v._id) === String(item.variantId)
        );
        if (!variant || variant.stock < item.quantity) {
          throw new Error(
            `Stok varian "${item.variantName}" tidak mencukupi untuk memproses pesanan`
          );
        }
      } else {
        if (product.stock < item.quantity) {
          throw new Error(`Stok produk "${product.name}" tidak mencukupi`);
        }
      }
    }

    // Stok aman, jalankan pemotongan stok
    for (const item of order.items) {
      await createStockMovement({
        productId: String(item.product),
        variantId: item.variantId ? String(item.variantId) : undefined,
        type: "OUT",
        quantity: item.quantity,
        note: `Penjualan dari Transaksi #${order.orderNumber}`,
        createdBy: userId,
      });
    }
  }

  // Transisi status: completed -> cancelled (kembalikan stok)
  if (order.status === "completed" && status === "cancelled") {
    for (const item of order.items) {
      await createStockMovement({
        productId: String(item.product),
        variantId: item.variantId ? String(item.variantId) : undefined,
        type: "RETURN",
        quantity: item.quantity,
        note: `Pembatalan Transaksi #${order.orderNumber}`,
        createdBy: userId,
      });
    }
  }

  order.status = status;
  await order.save();

  return getOrderById(order._id.toString());
};
