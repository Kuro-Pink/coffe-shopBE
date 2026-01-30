import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import authService from '../services/authService';

class AuthController {
  register = catchAsync(async (req: Request, res: Response) => {
    const { user, token } = await authService.register(req.body);

    res.status(201).json(ApiResponse.success({ user, token }, 'User registered successfully', 201));
  });

  login = catchAsync(async (req: Request, res: Response) => {
    const { user, token } = await authService.login(req.body);

    res.status(200).json(ApiResponse.success({ user, token }, 'Login successful'));
  });

  getMe = catchAsync(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user._id);

    res.status(200).json(ApiResponse.success(user, 'User profile retrieved successfully'));
  });

  updateMe = catchAsync(async (req: Request, res: Response) => {
    const user = await authService.updateMe(req.user._id, {
      name: req.body.name,
      phone: req.body.phone,
      avatar: req.file, // ✅ từ multer
    });

    res.status(200).json(ApiResponse.success(user, 'Profile updated successfully'));
  });

  changePassword = catchAsync(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user._id, currentPassword, newPassword);

    res.json(ApiResponse.success(null, 'Đổi mật khẩu thành công'));
  });
}

export default new AuthController();
