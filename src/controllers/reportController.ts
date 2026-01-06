import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import reportService from '../services/reportService';

class ReportController {
  // Staff performance
  getStaffPerformanceReport = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const report = await reportService.getStaffPerformanceReport(storeId, filter);

    res.status(200).json(
      ApiResponse.success(report, 'Staff performance report retrieved successfully')
    );
  });

  // Peak hours
  getPeakHoursReport = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const report = await reportService.getPeakHoursReport(storeId, filter);

    res.status(200).json(
      ApiResponse.success(report, 'Peak hours report retrieved successfully')
    );
  });

  // Product profitability
  getProductProfitabilityReport = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const report = await reportService.getProductProfitabilityReport(storeId, filter);

    res.status(200).json(
      ApiResponse.success(report, 'Product profitability report retrieved successfully')
    );
  });

  // Sales summary
  getSalesSummary = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { period, startDate, endDate } = req.query;

    if (!period || !['day', 'week', 'month'].includes(period as string)) {
      throw new ApiError(400, 'Period must be "day", "week", or "month"');
    }

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const report = await reportService.getSalesSummary(
      storeId,
      period as 'day' | 'week' | 'month',
      filter
    );

    res.status(200).json(
      ApiResponse.success(report, 'Sales summary retrieved successfully')
    );
  });

  // Customer insights
  getCustomerInsights = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const report = await reportService.getCustomerInsights(storeId, filter);

    res.status(200).json(
      ApiResponse.success(report, 'Customer insights retrieved successfully')
    );
  });

  // Dashboard data
  getDashboardData = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = await reportService.getDashboardData(storeId);

    res.status(200).json(
      ApiResponse.success(data, 'Dashboard data retrieved successfully')
    );
  });
}

export default new ReportController();