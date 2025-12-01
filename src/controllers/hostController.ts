import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import categoryService from '../services/categoryService';
import productService from '../services/productService';

class HostController {
  // ========== CATEGORIES ==========
  
  // Get all categories
  getCategories = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const categories = await categoryService.getCategoriesByStore(storeId);

    res.status(200).json(
      ApiResponse.success(categories, 'Categories retrieved successfully')
    );
  });

  // Get category by ID
  getCategoryById = catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.getCategoryById(req.params.id);

    res.status(200).json(
      ApiResponse.success(category, 'Category retrieved successfully')
    );
  });

  // Create category
  createCategory = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = {
      ...req.body,
      storeId,
    };

    const category = await categoryService.createCategory(data);

    res.status(201).json(
      ApiResponse.success(category, 'Category created successfully', 201)
    );
  });

  // Update category
  updateCategory = catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);

    res.status(200).json(
      ApiResponse.success(category, 'Category updated successfully')
    );
  });

  // Delete category
  deleteCategory = catchAsync(async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id);

    res.status(200).json(
      ApiResponse.success(null, 'Category deleted successfully')
    );
  });

  // ========== PRODUCTS ==========

  // Get all products
  getProducts = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { categoryId, isAvailable } = req.query;

    const filter: any = {};
    if (categoryId) filter.categoryId = categoryId;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable;

    const products = await productService.getProductsByStore(storeId, filter);

    res.status(200).json(
      ApiResponse.success(products, 'Products retrieved successfully')
    );
  });

  // Get product by ID
  getProductById = catchAsync(async (req: Request, res: Response) => {
    const product = await productService.getProductById(req.params.id);

    res.status(200).json(
      ApiResponse.success(product, 'Product retrieved successfully')
    );
  });

  // Create product
  createProduct = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = {
      ...req.body,
      storeId,
      image: req.file,
    };

    const product = await productService.createProduct(data);

    res.status(201).json(
      ApiResponse.success(product, 'Product created successfully', 201)
    );
  });

  // Update product
  updateProduct = catchAsync(async (req: Request, res: Response) => {
    const data = {
      ...req.body,
      image: req.file,
    };

    const product = await productService.updateProduct(req.params.id, data);

    res.status(200).json(
      ApiResponse.success(product, 'Product updated successfully')
    );
  });

  // Delete product
  deleteProduct = catchAsync(async (req: Request, res: Response) => {
    await productService.deleteProduct(req.params.id);

    res.status(200).json(
      ApiResponse.success(null, 'Product deleted successfully')
    );
  });

  // Toggle product availability
  toggleProductAvailability = catchAsync(async (req: Request, res: Response) => {
    const product = await productService.toggleAvailability(req.params.id);

    res.status(200).json(
      ApiResponse.success(product, 'Product availability updated successfully')
    );
  });
}

export default new HostController();
