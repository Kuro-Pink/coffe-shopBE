import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import billService from '../services/billService';

class BillController {
  // Get bills by store
  getBills = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const bills = await billService.getBillsByStore(storeId);

    res.status(200).json(
      ApiResponse.success(bills, 'Bills retrieved successfully')
    );
  });

  // Get bill by ID
  getBillById = catchAsync(async (req: Request, res: Response) => {
    const bill = await billService.getBillById(req.params.id);

    res.status(200).json(
      ApiResponse.success(bill, 'Bill retrieved successfully')
    );
  });

  // Create bill
  createBill = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = { ...req.body, storeId };

    const bill = await billService.createBill(data);

    res.status(201).json(
      ApiResponse.success(bill, 'Bill created successfully', 201)
    );
  });

  // Mark bill as paid
  markBillAsPaid = catchAsync(async (req: Request, res: Response) => {
    const { paymentMethod, amountReceived } = req.body;

    if (!['cash', 'transfer'].includes(paymentMethod)) {
      throw new ApiError(400, 'Invalid payment method');
    }

    const bill = await billService.markBillAsPaid(req.params.id, {
      paymentMethod,
      amountReceived,
    });

    res.status(200).json(
      ApiResponse.success(bill, 'Bill marked as paid successfully')
    );
  });
}

export default new BillController();