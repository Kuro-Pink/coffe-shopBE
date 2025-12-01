import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  storeId: mongoose.Types.ObjectId;
  order: number;
  createdAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
categorySchema.index({ storeId: 1, order: 1 });

const Category = mongoose.model<ICategory>('Category', categorySchema);
export default Category;