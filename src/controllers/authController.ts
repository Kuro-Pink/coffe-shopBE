import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import authService from '../services/authService';

class AuthController {
  register = catchAsync(async (req: Request, res: Response) => {
    const { user, token } = await authService.register(req.body);

    res.status(201).json(
      ApiResponse.success(
        { user, token },
        'User registered successfully',
        201
      )
    );
  });

  login = catchAsync(async (req: Request, res: Response) => {
    const { user, token } = await authService.login(req.body);

    res.status(200).json(
      ApiResponse.success(
        { user, token },
        'Login successful'
      )
    );
  });

  getMe = catchAsync(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user._id);

    res.status(200).json(
      ApiResponse.success(user, 'User profile retrieved successfully')
    );
  });
}

export default new AuthController();
