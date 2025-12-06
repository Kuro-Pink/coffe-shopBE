import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import analyticsService from '../services/analyticsService';

class AnalyticsController {
  // Dashboard overview
  getDashboardOverview = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const overview = await analyticsService.getDashboardOverview(storeId);

    res.status(200).json(
      ApiResponse.success(overview, 'Dashboard overview retrieved successfully')
    );
  });

  // Revenue trends
  getRevenueTrends = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const trends = await analyticsService.getRevenueTrends(storeId, days);

    res.status(200).json(ApiResponse.success(trends, 'Revenue trends retrieved successfully'));
  });

  // Peak hours
  getPeakHours = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange: any = {};
    if (startDate) dateRange.startDate = new Date(startDate as string);
    if (endDate) dateRange.endDate = new Date(endDate as string);

    const peakHours = await analyticsService.getPeakHours(storeId, dateRange);

    res.status(200).json(ApiResponse.success(peakHours, 'Peak hours retrieved successfully'));
  });

  // Best sellers
  getBestSellers = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const dateRange: any = {};
    if (startDate) dateRange.startDate = new Date(startDate as string);
    if (endDate) dateRange.endDate = new Date(endDate as string);

    const bestSellers = await analyticsService.getBestSellers(
      storeId,
      dateRange,
      parseInt(limit as string) || 10
    );

    res.status(200).json(ApiResponse.success(bestSellers, 'Best sellers retrieved successfully'));
  });

  // Customer insights
  getCustomerInsights = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange: any = {};
    if (startDate) dateRange.startDate = new Date(startDate as string);
    if (endDate) dateRange.endDate = new Date(endDate as string);

    const insights = await analyticsService.getCustomerInsights(storeId, dateRange);

    res.status(200).json(
      ApiResponse.success(insights, 'Customer insights retrieved successfully')
    );
  });

  // Category performance
  getCategoryPerformance = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange: any = {};
    if (startDate) dateRange.startDate = new Date(startDate as string);
    if (endDate) dateRange.endDate = new Date(endDate as string);

    const performance = await analyticsService.getCategoryPerformance(storeId, dateRange);

    res.status(200).json(
      ApiResponse.success(performance, 'Category performance retrieved successfully')
    );
  });

  // Table performance
  getTablePerformance = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange: any = {};
    if (startDate) dateRange.startDate = new Date(startDate as string);
    if (endDate) dateRange.endDate = new Date(endDate as string);

    const performance = await analyticsService.getTablePerformance(storeId, dateRange);

    res.status(200).json(
      ApiResponse.success(performance, 'Table performance retrieved successfully')
    );
  });
}

export default new AnalyticsController();