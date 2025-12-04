import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import categoryService from '../services/categoryService';
import productService from '../services/productService';
import tableService from '../services/tableService';

class HostController {
  // ========== CATEGORIES ========== (keep existing code)
  
  getCategories = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const categories = await categoryService.getCategoriesByStore(storeId);
    res.status(200).json(
      ApiResponse.success(categories, 'Categories retrieved successfully')
    );
  });

  getCategoryById = catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.getCategoryById(req.params.id);
    res.status(200).json(
      ApiResponse.success(category, 'Category retrieved successfully')
    );
  });

  createCategory = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = { ...req.body, storeId };
    const category = await categoryService.createCategory(data);
    res.status(201).json(
      ApiResponse.success(category, 'Category created successfully', 201)
    );
  });

  updateCategory = catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.status(200).json(
      ApiResponse.success(category, 'Category updated successfully')
    );
  });

  deleteCategory = catchAsync(async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id);
    res.status(200).json(
      ApiResponse.success(null, 'Category deleted successfully')
    );
  });

  // ========== PRODUCTS ========== (keep existing code)

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

  getProductById = catchAsync(async (req: Request, res: Response) => {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json(
      ApiResponse.success(product, 'Product retrieved successfully')
    );
  });

  createProduct = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = { ...req.body, storeId, image: req.file };
    const product = await productService.createProduct(data);
    res.status(201).json(
      ApiResponse.success(product, 'Product created successfully', 201)
    );
  });

  updateProduct = catchAsync(async (req: Request, res: Response) => {
    const data = { ...req.body, image: req.file };
    const product = await productService.updateProduct(req.params.id, data);
    res.status(200).json(
      ApiResponse.success(product, 'Product updated successfully')
    );
  });

  deleteProduct = catchAsync(async (req: Request, res: Response) => {
    await productService.deleteProduct(req.params.id);
    res.status(200).json(
      ApiResponse.success(null, 'Product deleted successfully')
    );
  });

  toggleProductAvailability = catchAsync(async (req: Request, res: Response) => {
    const product = await productService.toggleAvailability(req.params.id);
    res.status(200).json(
      ApiResponse.success(product, 'Product availability updated successfully')
    );
  });

  // ========== TABLES ========== (NEW)

  // Get all tables
  getTables = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const tables = await tableService.getTablesByStore(storeId);
    res.status(200).json(
      ApiResponse.success(tables, 'Tables retrieved successfully')
    );
  });

  // Get table by ID
  getTableById = catchAsync(async (req: Request, res: Response) => {
    const table = await tableService.getTableById(req.params.id);
    res.status(200).json(
      ApiResponse.success(table, 'Table retrieved successfully')
    );
  });

  // Create table
  createTable = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = { ...req.body, storeId };
    const table = await tableService.createTable(data);
    res.status(201).json(
      ApiResponse.success(table, 'Table created successfully', 201)
    );
  });

  // Update table
  updateTable = catchAsync(async (req: Request, res: Response) => {
    const table = await tableService.updateTable(req.params.id, req.body);
    res.status(200).json(
      ApiResponse.success(table, 'Table updated successfully')
    );
  });

  // Delete table
  deleteTable = catchAsync(async (req: Request, res: Response) => {
    await tableService.deleteTable(req.params.id);
    res.status(200).json(
      ApiResponse.success(null, 'Table deleted successfully')
    );
  });

  // Regenerate QR code
  regenerateQRCode = catchAsync(async (req: Request, res: Response) => {
    const table = await tableService.regenerateQRCode(req.params.id);
    res.status(200).json(
      ApiResponse.success(table, 'QR code regenerated successfully')
    );
  });

  // Get table statistics
  getTableStats = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const stats = await tableService.getTableStats(storeId);
    res.status(200).json(
      ApiResponse.success(stats, 'Table statistics retrieved successfully')
    );
  });
}

export default new HostController();