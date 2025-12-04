import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  tableNumber: string;
  area: string;
  storeId: mongoose.Types.ObjectId;
  qrCodeUrl: string;
  createdAt: Date;
}

const tableSchema = new Schema<ITable>(
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
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unique table number per store
tableSchema.index({ storeId: 1, tableNumber: 1 }, { unique: true });

const Table = mongoose.model<ITable>('Table', tableSchema);
export default Table;