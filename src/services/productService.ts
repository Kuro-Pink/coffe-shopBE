import Product, { IProduct } from '../models/Product';
import Category from '../models/Category';
import Store from '../models/Store';
import Voucher from '../models/Voucher';
import { ApiError } from '../utils/ApiError';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload';
import { applyVoucherToProduct } from './voucherPriceService';

interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  storeId: string;
  image?: Express.Multer.File;
  isAvailable?: boolean;
}

interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  isAvailable?: boolean;
  image?: Express.Multer.File;
}

class ProductService {
  // Get all products by store
  async getProductsByStore(storeId: string, filter: any = {}): Promise<IProduct[]> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const query: any = { storeId };

    // Filter by category
    if (filter.categoryId) {
      query.categoryId = filter.categoryId;
    }

    // Filter by availability
    if (filter.isAvailable !== undefined) {
      query.isAvailable = filter.isAvailable === 'true';
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });

    const result = await Promise.all(products.map((p) => applyVoucherToProduct(p)));

    return result;
  }

  // Get product by ID
  async getProductById(productId: string): Promise<IProduct> {
    const product = await Product.findById(productId)
      .populate('categoryId', 'name')
      .populate('storeId', 'name');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    return applyVoucherToProduct(product);
  }

  // Create product
  async createProduct(data: CreateProductData): Promise<IProduct> {
    // Verify store exists
    const store = await Store.findById(data.storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    // Verify category exists and belongs to the store
    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    if (category.storeId.toString() !== data.storeId) {
      throw new ApiError(400, 'Category does not belong to this store');
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (data.image) {
      const uploadResult = await uploadToCloudinary(data.image, 'products');
      imageUrl = uploadResult.url;
    }

    const product = await Product.create({
      name: data.name,
      description: data.description,
      price: data.price,
      categoryId: data.categoryId,
      storeId: data.storeId,
      image: imageUrl,
      isAvailable: data.isAvailable ?? true,
    });

    return product;
  }

  // Update product
  async updateProduct(productId: string, data: UpdateProductData): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // If updating category, verify it belongs to the same store
    if (data.categoryId) {
      const category = await Category.findById(data.categoryId);
      if (!category) {
        throw new ApiError(404, 'Category not found');
      }
      if (category.storeId.toString() !== product.storeId.toString()) {
        throw new ApiError(400, 'Category does not belong to this store');
      }
    }

    // Upload new image if provided
    // Upload new image if provided
    if (data.image) {
      if (product.image) {
        const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      }

      const uploadResult = await uploadToCloudinary(data.image, 'products');
      product.image = uploadResult.url;
    }

    // ❗ XÓA image KHỎI data để tránh overwrite
    delete (data as any).image;

    // Update other fields
    Object.assign(product, data);
    await product.save();

    return product;
  }

  // Delete product
  async deleteProduct(productId: string): Promise<void> {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Delete image from Cloudinary if exists
    if (product.image) {
      const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    await Product.findByIdAndDelete(productId);
  }

  // Toggle product availability
  async toggleAvailability(productId: string): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    return product;
  }

  // Get products by category
  async getProductsByCategory(categoryId: string): Promise<IProduct[]> {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const products = await Product.find({ categoryId }).sort({ createdAt: -1 });
    return products;
  }
}

export default new ProductService();
