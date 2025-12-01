import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  image?: string;
  categoryId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  isAvailable: boolean;
  createdAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive'],
    },
    image: {
      type: String,
      default: '',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
productSchema.index({ storeId: 1, categoryId: 1 });
productSchema.index({ storeId: 1, isAvailable: 1 });

const Product = mongoose.model<IProduct>('Product', productSchema);
export default Product;
