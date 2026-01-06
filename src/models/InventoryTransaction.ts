import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryTransaction extends Document {
  storeId: mongoose.Types.ObjectId;
  ingredientId: mongoose.Types.ObjectId;
  type: 'in' | 'out' | 'adjustment'; // Nhập | Xuất | Điều chỉnh
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  orderId?: mongoose.Types.ObjectId; // If related to order
  note?: string;
  createdBy: mongoose.Types.ObjectId; // User who made transaction
  createdAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true,
    },
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    quantityBefore: {
      type: Number,
      required: true,
    },
    quantityAfter: {
      type: Number,
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
inventoryTransactionSchema.index({ storeId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ ingredientId: 1, createdAt: -1 });

const InventoryTransaction = mongoose.model<IInventoryTransaction>(
  'InventoryTransaction',
  inventoryTransactionSchema
);
export default InventoryTransaction;