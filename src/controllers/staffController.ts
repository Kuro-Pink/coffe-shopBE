import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import staffService from '../services/staffService';

class StaffController {
  // Get all staff
  getStaff = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const staff = await staffService.getStaffByStore(storeId);

    res.status(200).json(
      ApiResponse.success(staff, 'Staff retrieved successfully')
    );
  });

  // Get staff by ID
  getStaffById = catchAsync(async (req: Request, res: Response) => {
    const staff = await staffService.getStaffById(req.params.id);

    res.status(200).json(
      ApiResponse.success(staff, 'Staff retrieved successfully')
    );
  });

  // Create staff
  createStaff = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = {
      ...req.body,
      storeId,
    };

    const staff = await staffService.createStaff(data);

    res.status(201).json(
      ApiResponse.success(staff, 'Staff created successfully', 201)
    );
  });

  // Update staff
  updateStaff = catchAsync(async (req: Request, res: Response) => {
    const staff = await staffService.updateStaff(req.params.id, req.body);

    res.status(200).json(
      ApiResponse.success(staff, 'Staff updated successfully')
    );
  });

  // Delete staff
  deleteStaff = catchAsync(async (req: Request, res: Response) => {
    await staffService.deleteStaff(req.params.id);

    res.status(200).json(
      ApiResponse.success(null, 'Staff deleted successfully')
    );
  });

  // Toggle staff status
  toggleStaffStatus = catchAsync(async (req: Request, res: Response) => {
    const staff = await staffService.toggleStaffStatus(req.params.id);

    res.status(200).json(
      ApiResponse.success(staff, 'Staff status updated successfully')
    );
  });

  // Get staff statistics
  getStaffStats = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const stats = await staffService.getStaffStats(storeId);

    res.status(200).json(
      ApiResponse.success(stats, 'Staff statistics retrieved successfully')
    );
  });
}

export default new StaffController();