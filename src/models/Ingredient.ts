import mongoose, { Document, Schema } from 'mongoose';

export interface IIngredient extends Document {
  storeId: mongoose.Types.ObjectId;
  name: string;
  unit: string; // ml, g, kg, cái, lon, ...
  quantity: number; // Current stock
  minQuantity: number; // Alert threshold
  cost: number; // Cost per unit (optional for reports)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      lowercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ingredientSchema.index({ storeId: 1, name: 1 });
ingredientSchema.index({ storeId: 1, isActive: 1 });

// Virtual: is low stock
ingredientSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minQuantity;
});

const Ingredient = mongoose.model<IIngredient>('Ingredient', ingredientSchema);
export default Ingredient;