import mongoose, { Document, Schema } from 'mongoose';

export interface IBill extends Document {
  billNumber: string;
  storeId: mongoose.Types.ObjectId;
  tableId: mongoose.Types.ObjectId;
  tableName: string;
  tableArea: string;
  customerName: string;
  customerPhone: string;
  orderIds: mongoose.Types.ObjectId[];
  items: Array<{
    productId: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'transfer';
  amountReceived?: number;
  changeAmount?: number;
  sessionStartTime: Date;
  sessionEndTime: Date;
  isPaid: boolean;
  qrPaymentUrl?: string;
  createdAt: Date;
  paidAt?: Date;
  voucherId?: mongoose.Types.ObjectId;
  voucherCode?: string;
  discountDetail?: {
    type: 'percent' | 'fixed';
    value: number;
  };
}

const BillSchema = new Schema<IBill>(
  {
    billNumber: {
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
    tableArea: {
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
    },
    orderIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer'],
      required: true,
    },
    amountReceived: {
      type: Number,
    },
    changeAmount: {
      type: Number,
    },
    sessionStartTime: {
      type: Date,
      required: true,
    },
    sessionEndTime: {
      type: Date,
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    qrPaymentUrl: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    voucherId: {
      type: Schema.Types.ObjectId,
      ref: 'Voucher',
    },
    voucherCode: String,
    discountDetail: {
      type: {
        type: String,
        enum: ['percent', 'fixed'],
      },
      value: Number,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
BillSchema.index({ storeId: 1, createdAt: -1 });
BillSchema.index({ customerPhone: 1 });
BillSchema.index({ isPaid: 1 });

export default mongoose.model<IBill>('Bill', BillSchema);
