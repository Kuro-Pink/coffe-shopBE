import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
  storeId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  status: 'active' | 'completed';

  // Performance metrics (calculated on check-out)
  hoursWorked?: number;
  ordersProcessed?: number;
  ordersCompleted?: number;
  ordersCancelled?: number;
  cashCollected?: number;
  transferCollected?: number;
  systemRevenue?: number;
  totalRevenue?: number;
  averageOrderValue?: number;

  // Location (optional - for verification)
  checkInLocation?: {
    latitude: number;
    longitude: number;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
  };

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
      index: true,
    },
    hoursWorked: {
      type: Number,
      min: 0,
    },
    ordersProcessed: {
      type: Number,
      default: 0,
    },

    ordersCompleted: {
      type: Number,
      default: 0,
    },

    ordersCancelled: {
      type: Number,
      default: 0,
    },

    cashCollected: {
      type: Number,
      default: 0,
    },

    transferCollected: {
      type: Number,
      default: 0,
    },

    systemRevenue: {
      type: Number,
      default: 0,
    },

    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    checkInLocation: {
      latitude: Number,
      longitude: Number,
    },
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
shiftSchema.index({ storeId: 1, checkInTime: -1 });
shiftSchema.index({ staffId: 1, status: 1 });
shiftSchema.index({ storeId: 1, status: 1, checkInTime: -1 });

const Shift = mongoose.model<IShift>('Shift', shiftSchema);
export default Shift;
