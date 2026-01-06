import mongoose, { Document, Schema } from 'mongoose';

export interface IProductIngredient extends Document {
  productId: mongoose.Types.ObjectId;
  ingredientId: mongoose.Types.ObjectId;
  amount: number; // Amount needed per product
  createdAt: Date;
}

const productIngredientSchema = new Schema<IProductIngredient>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: one product can't have duplicate ingredients
productIngredientSchema.index({ productId: 1, ingredientId: 1 }, { unique: true });

const ProductIngredient = mongoose.model<IProductIngredient>(
  'ProductIngredient',
  productIngredientSchema
);
export default ProductIngredient;