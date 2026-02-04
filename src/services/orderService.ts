import mongoose from 'mongoose';
import Order, { IOrder } from '../models/Order';
import Store from '../models/Store';
import Voucher from '../models/Voucher';
import { ApiError } from '../utils/ApiError';
import inventoryService from './inventoryService';
import { emitOrderStatusUpdate } from '../utils/socket';
import activityLogService from '../services/activityLogService';

interface GetOrdersFilter {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

class OrderService {
  // Get orders by store
  async getOrdersByStore(storeId: string, filter: GetOrdersFilter = {}): Promise<IOrder[]> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const query: any = { storeId };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        query.createdAt.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.createdAt.$lte = filter.endDate;
      }
    }

    const orders = await Order.find(query)
      .populate('tableId', 'tableNumber area')
      .sort({ createdAt: -1 });

    return orders;
  }

  // Get order by ID
  async getOrderById(orderId: string): Promise<IOrder> {
    const order = await Order.findById(orderId)
      .populate('storeId', 'name address phone')
      .populate('tableId', 'tableNumber area');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    return order;
  }

  // Update order status
  async updateOrderStatus(
    orderId: string,
    status: 'completed' | 'cancelled',
    staffId?: string,
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new ApiError(400, `Cannot update order with status: ${order.status}`);
    }

    // ========== AUTO DEDUCT STOCK WHEN CONFIRMED ==========
    if (order.status === 'pending') {
      try {
        await inventoryService.deductStockForOrder(orderId, staffId || 'system');
        console.log(`✅ Stock deducted for order ${order.orderNumber}`);
      } catch (error: any) {
        // If insufficient stock, throw error and don't confirm order
        throw new ApiError(400, error.message);
      }

      order.confirmedBy = staffId as any;
      order.confirmedAt = new Date();
    }
    // ======================================================

    if (staffId) {
      if (status === 'completed') {
        order.completedBy = staffId as any;
        order.paidBy = staffId as any;
        order.completedAt = new Date();
      }
    }

    order.status = status;
    await order.save();

    // ✅ ACTIVITY LOG: ORDER COMPLETED
    if (status === 'completed') {
      await activityLogService.createLog(
        'order',
        `Đơn hàng ${order.orderNumber} hoàn tất – ${order.totalAmount.toLocaleString()}₫`,
        staffId,
      );
    }

    emitOrderStatusUpdate(order.storeId.toString(), order);

    return order;
  }

  // Get unpaid orders by table for current session
  async getUnpaidOrdersBySession(
    tableId: string,
    session: {
      startTime: Date;
      customerPhone?: string;
      customerName?: string;
    },
  ) {
    return Order.find({
      tableId,
      status: 'completed',
      isPaid: false,
    }).sort({ createdAt: 1 });
  }

  // Get order statistics
  async getOrderStats(
    storeId: string,
    filter: { startDate?: Date; endDate?: Date } = {},
  ): Promise<any> {
    // ✅ FIX: Convert storeId to ObjectId
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const query: any = { storeId: storeObjectId };

    // Apply date filter
    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        query.createdAt.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.createdAt.$lte = filter.endDate;
      }
    }

    console.log('📊 Query:', JSON.stringify(query, null, 2));

    // Total orders
    const totalOrders = await Order.countDocuments(query);
    console.log('📊 Total orders:', totalOrders);

    // Orders by status
    const ordersByStatusArray = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    console.log('📊 Orders by status array:', ordersByStatusArray);

    // Convert array to object with default values
    const ordersByStatus: any = {
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    ordersByStatusArray.forEach((item) => {
      ordersByStatus[item._id] = item.count;
    });

    // Total revenue (only completed orders)
    const revenueResult = await Order.aggregate([
      { $match: { ...query, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    console.log('💰 Total revenue:', totalRevenue);

    // Top products
    const topProducts = await Order.aggregate([
      { $match: { ...query, status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);
    console.log('🏆 Top products:', topProducts.length);

    // Revenue by day
    let dateRangeStart: Date;
    if (filter.startDate) {
      dateRangeStart = filter.startDate;
    } else {
      dateRangeStart = new Date();
      dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    }

    const revenueByDay = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId, // ✅ Use ObjectId here too
          status: 'completed',
          createdAt: {
            $gte: dateRangeStart,
            ...(filter.endDate && { $lte: filter.endDate }),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    console.log('📅 Revenue by day:', revenueByDay.length);

    return {
      totalOrders,
      ordersByStatus,
      totalRevenue,
      topProducts,
      revenueByDay,
    };
  }

  // Get today's stats
  async getTodayStats(storeId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📅 Today range:', { today, tomorrow });

    return this.getOrderStats(storeId, {
      startDate: today,
      endDate: tomorrow,
    });
  }

  // ================= PREVIEW PAYMENT (ĐÃ FIX) =================
  async previewPayment(orderIds: string[], code?: string) {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new ApiError(400, 'orderIds is required');
    }

    const orders = await Order.find({
      _id: { $in: orderIds },
    }).populate('items.productId');

    if (!orders || orders.length === 0) {
      throw new ApiError(404, 'Orders not found');
    }

    let subtotal = 0;
    let autoDiscount = 0;
    let manualDiscount = 0;

    // ===== COLLECT PRODUCT IDS =====
    const productIds: string[] = [];

    for (const order of orders) {
      for (const item of order.items) {
        const product = item.productId as any;
        const price = product.price * item.quantity;

        subtotal += price;
        productIds.push(product._id.toString());
      }
    }

    // ===== QUERY VOUCHERS 1 LẦN =====
    const vouchers = await Voucher.find({
      productIds: { $in: productIds },
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    // ===== APPLY AUTO VOUCHER =====
    for (const order of orders) {
      for (const item of order.items) {
        const product = item.productId as any;
        const price = product.price * item.quantity;

        const matched = vouchers.filter((v) =>
          (v.productIds ?? []).some((id: any) => id.toString() === product._id.toString()),
        );

        for (const voucher of matched) {
          autoDiscount +=
            voucher.type === 'percent' ? price * (voucher.value / 100) : voucher.value;
        }
      }
    }

    // ===== MANUAL VOUCHER =====
    if (code) {
      const voucher = await Voucher.findOne({
        code: code.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (!voucher) throw new ApiError(400, 'Invalid voucher');

      manualDiscount =
        voucher.type === 'percent' ? subtotal * (voucher.value / 100) : voucher.value;
    }

    // ===== FINAL =====
    const finalAmount = Math.max(0, subtotal - autoDiscount - manualDiscount);

    return {
      subtotal,
      autoDiscount,
      manualDiscount,
      finalAmount,
    };
  }
}

export default new OrderService();
