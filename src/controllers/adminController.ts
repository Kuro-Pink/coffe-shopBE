import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import storeService from '../services/storeService';
import dashboardService from '../services/dashboardService';

class AdminController {
  // Get all stores data in dashboard
  getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await dashboardService.getDashboardStats();

    res.status(200).json(ApiResponse.success(stats, 'Dashboard statistics retrieved successfully'));
  });

  getRevenueChart = catchAsync(async (req: Request, res: Response) => {
    const days = Number(req.query.days || 7);

    const data = await dashboardService.getRevenueByRange(days);

    res.status(200).json(ApiResponse.success(data));
  });

  getRecentActivities = catchAsync(async (req: Request, res: Response) => {
    const data = await dashboardService.getRecentActivities();
    res.status(200).json(ApiResponse.success(data));
  });

  getRevenueOverview = catchAsync(async (req: Request, res: Response) => {
    const data = await dashboardService.getRevenueOverview();
    res.status(200).json(ApiResponse.success(data));
  });

  getRevenueByStore = catchAsync(async (req: Request, res: Response) => {
    const data = await dashboardService.getRevenueByStore();

    res.status(200).json(ApiResponse.success(data, 'Revenue by store retrieved successfully'));
  });

  getRevenueByStoreDetail = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const days = Number(req.query.days || 30);

    const data = await dashboardService.getRevenueByStoreDetail(id, days);

    res.status(200).json(ApiResponse.success(data, 'Revenue detail retrieved successfully'));
  });

  // Get all stores
  getAllStores = catchAsync(async (req: Request, res: Response) => {
    const { isActive } = req.query;

    const filter: any = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const stores = await storeService.getAllStores(filter);

    res.status(200).json(ApiResponse.success(stores, 'Stores retrieved successfully'));
  });

  // Get store by ID
  getStoreById = catchAsync(async (req: Request, res: Response) => {
    const store = await storeService.getStoreById(req.params.id);

    res.status(200).json(ApiResponse.success(store, 'Store retrieved successfully'));
  });

  // Create store
  createStore = catchAsync(async (req: Request, res: Response) => {
    const data = {
      ...req.body,
      logo: req.file,
    };

    const store = await storeService.createStore(data);

    res.status(201).json(ApiResponse.success(store, 'Store created successfully', 201));
  });

  // Update store
  updateStore = catchAsync(async (req: Request, res: Response) => {
    const data: any = {
      ...req.body,
    };

    if (req.file) {
      data.logo = req.file;
    }

    const store = await storeService.updateStore(req.params.id, data);

    res.status(200).json(ApiResponse.success(store, 'Store updated successfully'));
  });

  // Delete store
  deleteStore = catchAsync(async (req: Request, res: Response) => {
    await storeService.deleteStore(req.params.id);

    res.status(200).json(ApiResponse.success(null, 'Store deleted successfully'));
  });

  // Toggle store status
  toggleStoreStatus = catchAsync(async (req: Request, res: Response) => {
    const store = await storeService.toggleStoreStatus(req.params.id);

    res.status(200).json(ApiResponse.success(store, 'Store status updated successfully'));
  });

  // Get statistics
  getStatistics = catchAsync(async (req: Request, res: Response) => {
    const stats = await storeService.getStatistics();

    res.status(200).json(ApiResponse.success(stats, 'Statistics retrieved successfully'));
  });
}

export default new AdminController();
