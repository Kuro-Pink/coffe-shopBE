import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  tableNumber: string;
  area: string;
  storeId: mongoose.Types.ObjectId;
  qrCodeUrl: string;
  status: 'available' | 'occupied' | 'needs_cleaning'; 
  currentSession?: { 
    customerName?: string;
    customerPhone: string;
    startTime: Date;
    totalOrders: number;
    totalAmount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    tableNumber: {
      type: String,
      required: [true, 'Table number is required'],
      trim: true,
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true,
      default: 'Tầng 1',
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
    },
    qrCodeUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'needs_cleaning'],
      default: 'available',
    },
    currentSession: {
      customerName: { type: String },
      customerPhone: { type: String },
      startTime: { type: Date },
      totalOrders: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TableSchema.index({ storeId: 1, tableNumber: 1 }, { unique: true });
TableSchema.index({ status: 1 });

export default mongoose.model<ITable>('Table', TableSchema);