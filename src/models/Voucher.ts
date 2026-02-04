import mongoose, { Document, Schema } from 'mongoose';

export interface IVoucher extends Document {
  code?: string; // null = auto
  name: string;
  type: 'percent' | 'fixed';
  value: number;

  scope: 'product' | 'order';

  productIds?: mongoose.Types.ObjectId[];

  minBillValue?: number;
  maxDiscount?: number;

  usageLimit?: number;
  usedCount: number;

  startDate: Date;
  endDate: Date;

  isActive: boolean;
  storeId: mongoose.Types.ObjectId;
}

const voucherSchema = new Schema<IVoucher>(
  {
    code: {
      type: String,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    scope: { type: String, enum: ['product', 'order'], required: true },
    productIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      default: [],
    },
    minBillValue: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
  },
  { timestamps: true },
);

voucherSchema.index({ storeId: 1 });
voucherSchema.index({ storeId: 1, code: 1 }, { unique: true, sparse: true });

export default mongoose.model<IVoucher>('Voucher', voucherSchema);
