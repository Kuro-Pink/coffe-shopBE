import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreRequest extends Document {
  userId: mongoose.Types.ObjectId;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo?: string;
  businessLicense?: string; // Optional: số ĐKKD
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const storeRequestSchema = new Schema<IStoreRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    storeAddress: {
      type: String,
      required: [true, 'Store address is required'],
      trim: true,
    },
    storePhone: {
      type: String,
      required: [true, 'Store phone is required'],
      trim: true,
    },
    storeLogo: {
      type: String,
      default: '',
    },
    businessLicense: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index
storeRequestSchema.index({ userId: 1, status: 1 });
storeRequestSchema.index({ status: 1, createdAt: -1 });

const StoreRequest = mongoose.model<IStoreRequest>('StoreRequest', storeRequestSchema);
export default StoreRequest;