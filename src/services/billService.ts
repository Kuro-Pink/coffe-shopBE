import mongoose from 'mongoose';
import Bill, { IBill } from '../models/Bill';
import Order from '../models/Order';
import Table from '../models/Table';
import Store from '../models/Store';
import { ApiError } from '../utils/ApiError';

interface CreateBillData {
  storeId: string;
  tableId: string;
  orderIds: string[];
  paymentMethod: 'cash' | 'transfer';
  amountReceived?: number;
  discount?: number;
}

class BillService {
  // Generate bill number
  private generateBillNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BILL${timestamp}${random}`;
  }

  // Get bills by store
  async getBillsByStore(storeId: string): Promise<IBill[]> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const bills = await Bill.find({ storeId })
      .populate('tableId', 'tableNumber area')
      .sort({ createdAt: -1 });

    return bills;
  }

  // Get bill by ID
  async getBillById(billId: string): Promise<IBill> {
    const bill = await Bill.findById(billId)
      .populate('storeId', 'name address phone email')
      .populate('tableId', 'tableNumber area')
      .populate('orderIds');

    if (!bill) {
      throw new ApiError(404, 'Bill not found');
    }

    return bill;
  }

  // Create bill (combine multiple orders)
  async createBill(data: CreateBillData): Promise<IBill> {
    // Validate
    if (!data.orderIds || data.orderIds.length === 0) {
      throw new ApiError(400, 'Bill must include at least one order');
    }

    // Get all orders
    const orders = await Order.find({
      _id: { $in: data.orderIds },
      storeId: data.storeId,
      status: 'completed',
      isPaid: false,
    });

    if (orders.length === 0) {
      throw new ApiError(400, 'No valid orders found to create bill');
    }

    if (orders.length !== data.orderIds.length) {
      throw new ApiError(400, 'Some orders are invalid or already paid');
    }

    // Verify all orders are from same table
    const tableIds = [...new Set(orders.map(o => o.tableId.toString()))];
    if (tableIds.length > 1) {
      throw new ApiError(400, 'All orders must be from the same table');
    }

    // Get table info
    const table = await Table.findById(data.tableId);
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }

    // Combine all items
    const allItems: any[] = [];
    let subtotal = 0;

    orders.forEach(order => {
      order.items.forEach(item => {
        const existingItem = allItems.find(
          i => i.productId.toString() === item.productId.toString()
        );
        
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          allItems.push({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          });
        }
        
        subtotal += item.price * item.quantity;
      });
    });

    // Calculate total
    const discount = data.discount || 0;
    const totalAmount = subtotal - discount;

    // Calculate change (for cash payment)
    let changeAmount = 0;
    if (data.paymentMethod === 'cash' && data.amountReceived) {
      changeAmount = Math.max(0, data.amountReceived - totalAmount);
    }

    // Get session time
    const sessionStartTime = table.currentSession?.startTime || new Date();
    const sessionEndTime = new Date();

    // Generate bill number
    let billNumber = this.generateBillNumber();
    let existingBill = await Bill.findOne({ billNumber });
    while (existingBill) {
      billNumber = this.generateBillNumber();
      existingBill = await Bill.findOne({ billNumber });
    }

    // Create bill
    const bill = await Bill.create({
      billNumber,
      storeId: data.storeId,
      tableId: data.tableId,
      tableName: table.tableNumber,
      tableArea: table.area,
      customerName: orders[0].customerName,
      customerPhone: orders[0].customerPhone,
      orderIds: data.orderIds,
      items: allItems,
      subtotal,
      discount,
      totalAmount,
      paymentMethod: data.paymentMethod,
      amountReceived: data.amountReceived,
      changeAmount,
      sessionStartTime,
      sessionEndTime,
      isPaid: true,
      paidAt: new Date(),
    });

    // Mark orders as paid
    await Order.updateMany(
      { _id: { $in: data.orderIds } },
      { 
        $set: { 
          isPaid: true,
          paymentMethod: data.paymentMethod,
        } 
      }
    );

    // ✅ Update table status to "needs_cleaning"
    table.status = 'needs_cleaning';
    await table.save();

    // ✅ Emit socket event
    const io = (global as any).io;
    if (io) {
      io.to(data.storeId).emit('bill_created', bill);
      io.to(data.storeId).emit('table_updated', {
        tableId: table._id,
        status: table.status,
        currentSession: table.currentSession,
      });
    }

    return bill;
  }

  // Mark bill as paid (if created unpaid)
  async markBillAsPaid(
    billId: string, 
    paymentData: {
      paymentMethod: 'cash' | 'transfer';
      amountReceived?: number;
    }
  ): Promise<IBill> {
    const bill = await Bill.findById(billId);
    if (!bill) {
      throw new ApiError(404, 'Bill not found');
    }

    if (bill.isPaid) {
      throw new ApiError(400, 'Bill is already paid');
    }

    bill.isPaid = true;
    bill.paidAt = new Date();
    bill.paymentMethod = paymentData.paymentMethod;

    if (paymentData.paymentMethod === 'cash' && paymentData.amountReceived) {
      bill.amountReceived = paymentData.amountReceived;
      bill.changeAmount = Math.max(0, paymentData.amountReceived - bill.totalAmount);
    }

    await bill.save();

    return bill;
  }
}

export default new BillService();