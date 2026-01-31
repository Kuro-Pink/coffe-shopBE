import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from './../utils/ApiError';
import storeRequestService from '../services/storeRequestService';
import activityLogService from '../services/activityLogService';

class StoreRequestController {
  // Create store request (Host)
  createStoreRequest = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;

    const data = {
      ...req.body,
      userId,
      storeLogo: req.file,
    };

    const request = await storeRequestService.createStoreRequest(data);

    res
      .status(201)
      .json(
        ApiResponse.success(
          request,
          'Store request submitted successfully. Please wait for admin approval.',
          201,
        ),
      );
  });

  // Get my store requests (Host)
  getMyStoreRequests = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;

    const requests = await storeRequestService.getMyStoreRequests(userId);

    res.status(200).json(ApiResponse.success(requests, 'Store requests retrieved successfully'));
  });

  // Get all store requests (Admin)
  getAllStoreRequests = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.query;

    const filter: any = {};
    if (status) filter.status = status;

    const requests = await storeRequestService.getAllStoreRequests(filter);

    res.status(200).json(ApiResponse.success(requests, 'Store requests retrieved successfully'));
  });

  // Get store request by ID (Admin)
  getStoreRequestById = catchAsync(async (req: Request, res: Response) => {
    const request = await storeRequestService.getStoreRequestById(req.params.id);

    res.status(200).json(ApiResponse.success(request, 'Store request retrieved successfully'));
  });

  // Approve store request (Admin)
  approveStoreRequest = catchAsync(async (req: Request, res: Response) => {
    const adminId = (req as any).user._id;

    const request = await storeRequestService.approveStoreRequest(req.params.id, adminId);
    await activityLogService.createLog(
      'store',
      `Store ${request.storeName} đã được duyệt`,
      req.user._id,
    );

    res.status(200).json(ApiResponse.success(request, 'Store request approved successfully'));
  });

  // Reject store request (Admin)
  rejectStoreRequest = catchAsync(async (req: Request, res: Response) => {
    const adminId = (req as any).user._id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      throw new ApiError(400, 'Rejection reason is required');
    }

    const request = await storeRequestService.rejectStoreRequest(
      req.params.id,
      adminId,
      rejectionReason,
    );
    await activityLogService.createLog(
      'store',
      `Store ${request.storeName} bị từ chối`,
      req.user._id,
    );

    res.status(200).json(ApiResponse.success(request, 'Store request rejected successfully'));
  });

  // Delete store request (Admin)
  deleteStoreRequest = catchAsync(async (req: Request, res: Response) => {
    await storeRequestService.deleteStoreRequest(req.params.id);

    res.status(200).json(ApiResponse.success(null, 'Store request deleted successfully'));
  });

  // Get statistics (Admin)
  getStatistics = catchAsync(async (req: Request, res: Response) => {
    const stats = await storeRequestService.getStatistics();

    res.status(200).json(ApiResponse.success(stats, 'Statistics retrieved successfully'));
  });
}

export default new StoreRequestController();
