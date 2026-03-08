import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  quantity: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  storeId: mongoose.Types.ObjectId;
  tableId: mongoose.Types.ObjectId;
  tableName: string;
  customerName: string;
  customerPhone: string;
  customerNote: string;
  items: IOrderItem[];
  subtotal: number; // tổng trước voucher
  productSaving: number; // tổng giảm theo sản phẩm
  voucherDiscount: number; // giảm theo mã
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  confirmedBy?: mongoose.Types.ObjectId; // Staff who confirmed order
  confirmedAt?: Date;
  completedBy?: mongoose.Types.ObjectId; // Staff who marked as completed
  paidBy?: mongoose.Types.ObjectId; // Staff who processed payment
  isPaid: boolean;
  paymentMethod?: 'cash' | 'transfer';
  createdAt: Date;
  completedAt?: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    originalPrice: { type: Number, required: true, min: 0 },
    finalPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0 },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
    },
    tableName: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerNote: {
      type: String,
      default: '',
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must have at least one item',
      },
    },
    subtotal: { type: Number, default: 0 },
    productSaving: { type: Number, default: 0 },
    voucherDiscount: { type: Number, default: 0 },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    confirmedAt: {
      type: Date,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer'],
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
orderSchema.index({ storeId: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ tableId: 1 });
orderSchema.index({ isPaid: 1 });

const Order = mongoose.model<IOrder>('Order', orderSchema);
export default Order;
