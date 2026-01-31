import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import adminHostService from '../services/adminHostService';

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
    const data = await adminHostService.lockHost(req.params.id);
    res.status(200).json(ApiResponse.success(data, 'Host locked'));
  });

  unlockHost = catchAsync(async (req: Request, res: Response) => {
    const data = await adminHostService.unlockHost(req.params.id);
    res.status(200).json(ApiResponse.success(data, 'Host unlocked'));
  });
}

export default new AdminHostController();
