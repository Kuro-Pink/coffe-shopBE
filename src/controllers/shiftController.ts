import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import shiftService from '../services/shiftService';

class ShiftController {
  // ========================================
  // STAFF ENDPOINTS (Self-service)
  // ========================================

  // Get my current active shift
  getMyCurrentShift = catchAsync(async (req: Request, res: Response) => {
    const staffId = (req as any).user._id;
    const shift = await shiftService.getCurrentShift(staffId.toString());

    res
      .status(200)
      .json(ApiResponse.success(shift, shift ? 'Active shift found' : 'No active shift'));
  });

  // Check in (staff checks in themselves)
  checkIn = catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user;

    const shift = await shiftService.checkIn({
      staffId: user._id.toString(),
      storeId: user.storeId.toString(),
      location: req.body.location,
      notes: req.body.notes,
    });

    res.status(201).json(ApiResponse.success(shift, 'Checked in successfully', 201));
  });

  // Check out (staff checks out themselves)
  checkOut = catchAsync(async (req: Request, res: Response) => {
    const staffId = (req as any).user._id;

    const shift = await shiftService.checkOut({
      staffId: staffId.toString(),
      location: req.body.location,
      notes: req.body.notes,
    });

    res.status(200).json(ApiResponse.success(shift, 'Checked out successfully'));
  });

  // Get my shift history
  getMyShiftHistory = catchAsync(async (req: Request, res: Response) => {
    const staffId = (req as any).user._id;
    const { startDate, endDate, status } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);
    if (status) filter.status = status;

    const shifts = await shiftService.getShiftHistory(staffId.toString(), filter);

    res.status(200).json(ApiResponse.success(shifts, 'Shift history retrieved successfully'));
  });

  // Get my shift stats
  getMyShiftStats = catchAsync(async (req: Request, res: Response) => {
    const staffId = (req as any).user._id;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const stats = await shiftService.getStaffShiftStats(staffId.toString(), filter);

    res.status(200).json(ApiResponse.success(stats, 'Shift stats retrieved successfully'));
  });

  // ========================================
  // HOST ENDPOINTS (Management/Monitoring)
  // ========================================

  // Get all shifts for store
  getAllShifts = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate, status, staffId } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);
    if (status) filter.status = status;
    if (staffId) filter.staffId = staffId;

    const shifts = await shiftService.getAllShifts(storeId, filter);

    res.status(200).json(ApiResponse.success(shifts, 'Shifts retrieved successfully'));
  });

  // Get active shifts (who's working now)
  getActiveShifts = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;

    const shifts = await shiftService.getAllShifts(storeId, { status: 'active' });

    res.status(200).json(ApiResponse.success(shifts, 'Active shifts retrieved successfully'));
  });

  // Get shift report (detailed performance)
  getShiftReport = catchAsync(async (req: Request, res: Response) => {
    const { shiftId } = req.params;
    const report = await shiftService.getShiftReport(shiftId);

    res.status(200).json(ApiResponse.success(report, 'Shift report retrieved successfully'));
  });

  // Get shift summary stats
  getShiftSummaryStats = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const stats = await shiftService.getShiftSummaryStats(storeId, filter);

    res.status(200).json(ApiResponse.success(stats, 'Shift summary stats retrieved successfully'));
  });

  // Get specific staff's shift history (host views any staff)
  getStaffShiftHistory = catchAsync(async (req: Request, res: Response) => {
    const { staffId } = req.params;
    const { startDate, endDate, status } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);
    if (status) filter.status = status;

    const shifts = await shiftService.getShiftHistory(staffId, filter);

    res.status(200).json(ApiResponse.success(shifts, 'Staff shift history retrieved successfully'));
  });
}

export default new ShiftController();
