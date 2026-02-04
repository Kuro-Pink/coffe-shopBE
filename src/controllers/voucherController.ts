import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import voucherService from '../services/voucherService';
import { ApiError } from '../utils/ApiError';
class VoucherController {
  create = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const v = await voucherService.create(storeId, req.body);
    res.json(ApiResponse.success(v));
  });

  list = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const v = await voucherService.getByStore(storeId);
    res.json(ApiResponse.success(v));
  });

  update = catchAsync(async (req: Request, res: Response) => {
    const v = await voucherService.update(req.params.id, req.body);
    res.json(ApiResponse.success(v));
  });

  delete = catchAsync(async (req: Request, res: Response) => {
    await voucherService.delete(req.params.id);
    res.json(ApiResponse.success(null));
  });

  getDetail = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const voucher = await voucherService.getVoucherById(id);

    if (!voucher) {
      throw new ApiError(404, 'Voucher not found');
    }

    res.json(ApiResponse.success(voucher));
  });

  setProducts = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { productIds } = req.body;

    const v = await voucherService.setProducts(id, productIds);

    res.json(ApiResponse.success(v));
  });

  toggle = catchAsync(async (req: Request, res: Response) => {
    const v = await voucherService.toggle(req.params.id);
    res.json(ApiResponse.success(v));
  });
}

export default new VoucherController();
