import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import adminHostService from '../services/adminHostService';
import activityLogService from '../services/activityLogService';

class AdminHostController {
  getHosts = catchAsync(async (req: Request, res: Response) => {
    const data = await adminHostService.getHosts();
    res.status(200).json(ApiResponse.success(data));
  });

  getHostById = catchAsync(async (req: Request, res: Response) => {
    const data = await adminHostService.getHostById(req.params.id);
    res.status(200).json(ApiResponse.success(data));
  });

  lockHost = catchAsync(async (req: Request, res: Response) => {
    const host = await adminHostService.lockHost(req.params.id);

    // ✅ GHI ACTIVITY LOG
    await activityLogService.createLog(
      'host',
      `Host ${host.email} bị khóa`,
      (req as any).user._id, // admin đang thao tác
    );

    res.status(200).json(ApiResponse.success(host, 'Host locked'));
  });

  unlockHost = catchAsync(async (req: Request, res: Response) => {
    const host = await adminHostService.unlockHost(req.params.id);

    // ✅ GHI ACTIVITY LOG
    await activityLogService.createLog(
      'host',
      `Host ${host.email} được mở khóa`,
      (req as any).user._id,
    );

    res.status(200).json(ApiResponse.success(host, 'Host unlocked'));
  });
}

export default new AdminHostController();
