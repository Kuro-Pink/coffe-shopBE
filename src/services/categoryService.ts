import Category, { ICategory } from '../models/Category';
import Product from '../models/Product';
import Store from '../models/Store';
import { ApiError } from '../utils/ApiError';

interface CreateCategoryData {
  name: string;
  storeId: string;
  order?: number;
}

interface UpdateCategoryData {
  name?: string;
  order?: number;
}

class CategoryService {
  // Get all categories by store
  async getCategoriesByStore(storeId: string): Promise<ICategory[]> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const categories = await Category.find({ storeId }).sort({ order: 1, createdAt: 1 });
    return categories;
  }

  // Get category by ID
  async getCategoryById(categoryId: string): Promise<ICategory> {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    return category;
  }

  // Create category
  async createCategory(data: CreateCategoryData): Promise<ICategory> {
    const store = await Store.findById(data.storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    // If no order provided, set as last
    if (data.order === undefined) {
      const lastCategory = await Category.findOne({ storeId: data.storeId })
        .sort({ order: -1 })
        .limit(1);
      data.order = lastCategory ? lastCategory.order + 1 : 0;
    }

    const category = await Category.create(data);
    return category;
  }

  // Update category
  async updateCategory(categoryId: string, data: UpdateCategoryData): Promise<ICategory> {
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    return category;
  }

  // Delete category
  async deleteCategory(categoryId: string): Promise<void> {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Check if category has products
    const productsCount = await Product.countDocuments({ categoryId });
    if (productsCount > 0) {
      throw new ApiError(400, `Cannot delete category with ${productsCount} products. Delete products first.`);
    }

    await Category.findByIdAndDelete(categoryId);
  }
}

export default new CategoryService();