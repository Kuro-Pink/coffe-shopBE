import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import publicService from '../services/publicService';

class PublicController {
  // Get menu (public - no auth)
  getMenu = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const menu = await publicService.getMenu(storeId);

    res.status(200).json(
      ApiResponse.success(menu, 'Menu retrieved successfully')
    );
  });

  // Get table info (public - no auth)
  getTableInfo = catchAsync(async (req: Request, res: Response) => {
    const { tableId } = req.params;
    const table = await publicService.getTableInfo(tableId);

    res.status(200).json(
      ApiResponse.success(table, 'Table info retrieved successfully')
    );
  });

  // Create order (public - no auth)
  createOrder = catchAsync(async (req: Request, res: Response) => {
    const order = await publicService.createOrder(req.body);

    res.status(201).json(
      ApiResponse.success(
        {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          message: 'Đặt hàng thành công! Món ăn sẽ có sau ~10 phút. Cảm ơn quý khách!',
        },
        'Order created successfully',
        201
      )
    );
  });
}

export default new PublicController();