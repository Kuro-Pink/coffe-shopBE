import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from './../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import categoryService from '../services/categoryService';
import productService from '../services/productService';
import tableService from '../services/tableService';
import orderService from '../services/orderService';

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

  // Update table status
  updateTableStatus = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body;

    if (!['available', 'occupied', 'needs_cleaning'].includes(status)) {
      throw new ApiError(
        400, 
        'Invalid status. Must be "available", "occupied", or "needs_cleaning"'
      );
    }

    const table = await tableService.updateTableStatus(req.params.id, status);

    res.status(200).json(
      ApiResponse.success(table, 'Table status updated successfully')
    );
  });

  // Get unpaid orders by table (for current session only)
  getUnpaidOrdersByTable = catchAsync(async (req: Request, res: Response) => {
    const { tableId } = req.params;

    // ✅ Controller gọi tableService
    const table = await tableService.getTableById(tableId);

    if (!table.currentSession) {
      return res.status(200).json(
        ApiResponse.success([], 'No active session for this table')
      );
    }

    // ✅ Controller truyền session sang orderService
    const orders = await orderService.getUnpaidOrdersBySession(
      tableId,
      table.currentSession
    );

    res.status(200).json(
      ApiResponse.success(orders, 'Unpaid orders retrieved successfully')
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


  // ========== ORDERS ==========

  // Get all orders
  getOrders = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { status, startDate, endDate } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const orders = await orderService.getOrdersByStore(storeId, filter);

    res.status(200).json(
      ApiResponse.success(orders, 'Orders retrieved successfully')
    );
  });

  // Get order by ID
  getOrderById = catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.getOrderById(req.params.id);

    res.status(200).json(
      ApiResponse.success(order, 'Order retrieved successfully')
    );
  });

  // Update order status
  updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body;
    const staffId = (req as any).user._id; // Get staff/host ID from token

    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const order = await orderService.updateOrderStatus(
      req.params.id, 
      status,
      staffId // ← Pass staffId
    );

    res.status(200).json(
      ApiResponse.success(order, 'Order status updated successfully')
    );
  });


  // Get order statistics (WITH DATE FILTER FROM QUERY)
  getOrderStats = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    
    // ✅ FIX: Parse dates from query params
    if (startDate) {
      filter.startDate = new Date(startDate as string);
    }
    if (endDate) {
      filter.endDate = new Date(endDate as string);
    }

    const stats = await orderService.getOrderStats(storeId, filter);

    res.status(200).json(
      ApiResponse.success(stats, 'Order statistics retrieved successfully')
    );
  });

  // Get today's stats (for dashboard)
  getTodayStats = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const stats = await orderService.getTodayStats(storeId);

    res.status(200).json(
      ApiResponse.success(stats, 'Today statistics retrieved successfully')
    );
  });
}

export default new HostController();