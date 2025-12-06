import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import Store from '../models/Store';
import { ApiError } from '../utils/ApiError';

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

class AnalyticsService {
  // Dashboard overview (for host)
  async getDashboardOverview(storeId: string): Promise<any> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // This month
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Last month
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Today stats
    const todayOrders = await Order.countDocuments({
      storeId: storeObjectId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const todayRevenue = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: 'completed',
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Yesterday stats
    const yesterdayOrders = await Order.countDocuments({
      storeId: storeObjectId,
      createdAt: { $gte: yesterday, $lt: today },
    });

    const yesterdayRevenue = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: 'completed',
          createdAt: { $gte: yesterday, $lt: today },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // This month stats
    const thisMonthOrders = await Order.countDocuments({
      storeId: storeObjectId,
      createdAt: { $gte: thisMonth, $lt: nextMonth },
    });

    const thisMonthRevenue = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: 'completed',
          createdAt: { $gte: thisMonth, $lt: nextMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Last month stats
    const lastMonthRevenue = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: 'completed',
          createdAt: { $gte: lastMonth, $lt: thisMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Pending orders
    const pendingOrders = await Order.countDocuments({
      storeId: storeObjectId,
      status: 'pending',
    });

    // Calculate growth rates
    const todayRevenueValue = todayRevenue[0]?.total || 0;
    const yesterdayRevenueValue = yesterdayRevenue[0]?.total || 0;
    const thisMonthRevenueValue = thisMonthRevenue[0]?.total || 0;
    const lastMonthRevenueValue = lastMonthRevenue[0]?.total || 0;

    const dailyGrowth =
      yesterdayRevenueValue > 0
        ? ((todayRevenueValue - yesterdayRevenueValue) / yesterdayRevenueValue) * 100
        : 0;

    const monthlyGrowth =
      lastMonthRevenueValue > 0
        ? ((thisMonthRevenueValue - lastMonthRevenueValue) / lastMonthRevenueValue) * 100
        : 0;

    return {
      today: {
        orders: todayOrders,
        revenue: todayRevenueValue,
        growth: dailyGrowth,
      },
      yesterday: {
        orders: yesterdayOrders,
        revenue: yesterdayRevenueValue,
      },
      thisMonth: {
        orders: thisMonthOrders,
        revenue: thisMonthRevenueValue,
        growth: monthlyGrowth,
      },
      lastMonth: {
        revenue: lastMonthRevenueValue,
      },
      pendingOrders,
    };
  }

  // Revenue trends (last N days)
  async getRevenueTrends(storeId: string, days: number = 7): Promise<any[]> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const trends = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
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

    // Fill missing dates with 0
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const found = trends.find((t) => t._id === dateStr);
      result.push({
        date: dateStr,
        revenue: found?.revenue || 0,
        orders: found?.orders || 0,
      });
    }

    return result;
  }

  // Peak hours analysis
  async getPeakHours(storeId: string, dateRange?: DateRange): Promise<any[]> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      match.createdAt = {};
      if (dateRange.startDate) match.createdAt.$gte = dateRange.startDate;
      if (dateRange.endDate) match.createdAt.$lte = dateRange.endDate;
    }

    const peakHours = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return peakHours.map((p) => ({
      hour: p._id,
      hourLabel: `${String(p._id).padStart(2, '0')}:00`,
      orders: p.orders,
      revenue: p.revenue,
    }));
  }

  // Best selling products
  async getBestSellers(storeId: string, dateRange?: DateRange, limit: number = 10): Promise<any[]> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      match.createdAt = {};
      if (dateRange.startDate) match.createdAt.$gte = dateRange.startDate;
      if (dateRange.endDate) match.createdAt.$lte = dateRange.endDate;
    }

    const bestSellers = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          averagePrice: { $avg: '$items.price' },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
    ]);

    return bestSellers;
  }

  // Customer insights (frequency, spending)
  async getCustomerInsights(storeId: string, dateRange?: DateRange): Promise<any> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      match.createdAt = {};
      if (dateRange.startDate) match.createdAt.$gte = dateRange.startDate;
      if (dateRange.endDate) match.createdAt.$lte = dateRange.endDate;
    }

    // Customer frequency
    const customerFrequency = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customerPhone',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 20 },
    ]);

    // Overall stats
    const totalCustomers = await Order.distinct('customerPhone', match).then((r) => r.length);

    const avgOrderValue = await Order.aggregate([
      { $match: match },
      { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
    ]);

    return {
      totalCustomers,
      averageOrderValue: avgOrderValue[0]?.avg || 0,
      topCustomers: customerFrequency,
    };
  }

  // Category performance
  async getCategoryPerformance(storeId: string, dateRange?: DateRange): Promise<any[]> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      match.createdAt = {};
      if (dateRange.startDate) match.createdAt.$gte = dateRange.startDate;
      if (dateRange.endDate) match.createdAt.$lte = dateRange.endDate;
    }

    // Get all products with categories
    const products = await Product.find({ storeId: storeObjectId })
      .populate('categoryId', 'name')
      .lean();

    const productCategoryMap = new Map();
    products.forEach((p: any) => {
      productCategoryMap.set(p._id.toString(), {
        categoryId: p.categoryId._id.toString(),
        categoryName: p.categoryId.name,
      });
    });

    // Get order items
    const orders = await Order.find(match).lean();

    const categoryStats = new Map();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productInfo = productCategoryMap.get(item.productId.toString());
        if (productInfo) {
          const key = productInfo.categoryId;
          const existing = categoryStats.get(key) || {
            categoryId: key,
            categoryName: productInfo.categoryName,
            totalQuantity: 0,
            totalRevenue: 0,
            ordersCount: 0,
          };

          existing.totalQuantity += item.quantity;
          existing.totalRevenue += item.price * item.quantity;
          existing.ordersCount += 1;

          categoryStats.set(key, existing);
        }
      });
    });

    return Array.from(categoryStats.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  // Table performance
  async getTablePerformance(storeId: string, dateRange?: DateRange): Promise<any[]> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      match.createdAt = {};
      if (dateRange.startDate) match.createdAt.$gte = dateRange.startDate;
      if (dateRange.endDate) match.createdAt.$lte = dateRange.endDate;
    }

    const tablePerformance = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$tableId',
          tableName: { $first: '$tableName' },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    return tablePerformance;
  }
}

export default new AnalyticsService();