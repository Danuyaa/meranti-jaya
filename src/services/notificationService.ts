import Notification, {
  INotification,
  NotificationType,
} from "../models/Notification";
import Product from "../models/Product";
import cron from "node-cron";
import mongoose from "mongoose";

interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

interface PaginatedNotifications {
  notifications: INotification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

/**
 * Membuat notifikasi baru secara aman, mencegah duplikasi yang belum dibaca.
 */
const createUniqueNotification = async (
  type: NotificationType,
  title: string,
  message: string,
  productId: string,
  variantId?: string,
  variantName?: string
): Promise<void> => {
  // Cek apakah sudah ada notifikasi belum dibaca dengan tipe dan produk yang sama
  const existing = await Notification.findOne({
    type,
    product: productId,
    variantId: variantId || null,
    isRead: false,
  });

  if (!existing) {
    await Notification.create({
      type,
      title,
      message,
      product: productId,
      variantId: variantId || undefined,
      variantName: variantName || undefined,
    });
  }
};

/**
 * Memindai produk & varian untuk mendeteksi low stock, out of stock, dan barang kedaluwarsa.
 */
export const checkStockAndExpiry = async (): Promise<void> => {
  try {
    const products = await Product.find({ isActive: true });
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    for (const product of products) {
      // === KASUS 1: Produk memiliki Varian ===
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          const variantIdStr = String(variant._id);

          // Pengecekan Stok
          if (variant.stock === 0) {
            await createUniqueNotification(
              "OUT_OF_STOCK",
              "Stok Varian Habis!",
              `Varian "${variant.name}" pada produk "${product.name}" telah habis.`,
              String(product._id),
              variantIdStr,
              variant.name
            );
          } else if (variant.stock <= variant.minimumStock) {
            await createUniqueNotification(
              "LOW_STOCK",
              "Stok Varian Menipis!",
              `Stok varian "${variant.name}" pada produk "${product.name}" tersisa ${variant.stock} (Min: ${variant.minimumStock}).`,
              String(product._id),
              variantIdStr,
              variant.name
            );
          }

          // Pengecekan Kedaluwarsa
          if (variant.expiryDate) {
            const expDate = new Date(variant.expiryDate);
            if (expDate <= today) {
              await createUniqueNotification(
                "EXPIRED",
                "Varian Produk Kedaluwarsa!",
                `Varian "${variant.name}" pada produk "${product.name}" telah kedaluwarsa pada ${expDate.toLocaleDateString("id-ID")}.`,
                String(product._id),
                variantIdStr,
                variant.name
              );
            } else if (expDate <= thirtyDaysLater) {
              const diffTime = Math.abs(expDate.getTime() - today.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              await createUniqueNotification(
                "EXPIRING_SOON",
                "Varian Mendekati Kedaluwarsa!",
                `Varian "${variant.name}" pada produk "${product.name}" akan kedaluwarsa dalam ${diffDays} hari (${expDate.toLocaleDateString("id-ID")}).`,
                String(product._id),
                variantIdStr,
                variant.name
              );
            }
          }
        }
      }
      // === KASUS 2: Produk tanpa Varian ===
      else {
        // Pengecekan Stok
        if (product.stock === 0) {
          await createUniqueNotification(
            "OUT_OF_STOCK",
            "Stok Produk Habis!",
            `Produk "${product.name}" telah habis.`,
            String(product._id)
          );
        } else if (product.stock <= product.minimumStock) {
          await createUniqueNotification(
            "LOW_STOCK",
            "Stok Produk Menipis!",
            `Stok produk "${product.name}" tersisa ${product.stock} (Min: ${product.minimumStock}).`,
            String(product._id)
          );
        }

        // Pengecekan Kedaluwarsa
        if (product.expiryDate) {
          const expDate = new Date(product.expiryDate);
          if (expDate <= today) {
            await createUniqueNotification(
              "EXPIRED",
              "Produk Kedaluwarsa!",
              `Produk "${product.name}" telah kedaluwarsa pada ${expDate.toLocaleDateString("id-ID")}.`,
              String(product._id)
            );
          } else if (expDate <= thirtyDaysLater) {
            const diffTime = Math.abs(expDate.getTime() - today.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            await createUniqueNotification(
              "EXPIRING_SOON",
              "Produk Mendekati Kedaluwarsa!",
              `Produk "${product.name}" akan kedaluwarsa dalam ${diffDays} hari (${expDate.toLocaleDateString("id-ID")}).`,
              String(product._id)
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "Gagal melakukan pengecekan otomatis stok & kedaluwarsa:",
      error
    );
  }
};

/**
 * Inisialisasi scheduler berjalan otomatis setiap jam 00:00 (Tengah malam)
 */
export const initNotificationScheduler = (): void => {
  // Berjalan setiap hari pada pukul 00:00
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Menjalankan pengecekan otomatis stok & kedaluwarsa...");
    await checkStockAndExpiry();
  });
  console.log(
    "⏰ Scheduler Peringatan Otomatis terdaftar (Berjalan tiap pukul 00:00)"
  );
};

/**
 * Mengambil daftar notifikasi dengan filter & pagination
 */
export const getNotifications = async (
  query: NotificationQuery
): Promise<PaginatedNotifications> => {
  const { page = 1, limit = 20, isRead, type } = query;

  const filter: Record<string, any> = {};

  if (isRead !== undefined) {
    filter.isRead = isRead;
  }

  if (type) {
    filter.type = type;
  }

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ isRead: false });

  const notifications = await Notification.find(filter)
    .populate("product", "name slug category price stock minimumStock")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
  };
};

/**
 * Tandai satu notifikasi sebagai dibaca
 */
export const markNotificationAsRead = async (
  id: string
): Promise<INotification> => {
  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  ).populate("product", "name slug category price stock");

  if (!notification) {
    throw new Error("Notifikasi tidak ditemukan");
  }

  return notification;
};

/**
 * Tandai semua notifikasi sebagai dibaca
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
};
