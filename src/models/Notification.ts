import mongoose, { Schema, Document, Types } from "mongoose";

export type NotificationType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "EXPIRING_SOON"
  | "EXPIRED";

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  product: Types.ObjectId;
  variantId?: Types.ObjectId;
  variantName?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["LOW_STOCK", "OUT_OF_STOCK", "EXPIRING_SOON", "EXPIRED"],
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    variantName: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes untuk performa optimal query notifikasi terbaru & yang belum dibaca
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ product: 1, variantId: 1, type: 1 });

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;
