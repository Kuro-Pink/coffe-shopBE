import mongoose from 'mongoose';
import Order from '../models/Order';
import User from '../models/User';
import Product from '../models/Product';
import ProductIngredient from '../models/ProductIngredient';
import Ingredient from '../models/Ingredient';
import Store from '../models/Store';
import { ApiError } from '../utils/ApiError';

interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

class ReportService {
  // ========== 1. STAFF PERFORMANCE REPORT ==========
  async getStaffPerformanceReport(storeId: string, filter: DateRangeFilter = {}): Promise<any[]> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Verify store
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    // Build match query
    const match: any = {
      storeId: storeObjectId,
      status: { $in: ['confirmed', 'completed'] },
    };

    if (filter.startDate || filter.endDate) {
      match.createdAt = {};
      if (filter.startDate) match.createdAt.$gte = filter.startDate;
      if (filter.endDate) match.createdAt.$lte = filter.endDate;
    }

    // Aggregate orders by staff (confirmedBy)
    const staffPerformance = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$confirmedBy',
          ordersProcessed: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          firstOrder: { $min: '$confirmedAt' },
          lastOrder: { $max: '$confirmedAt' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff',
        },
      },
      { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          staffId: '$_id',
          staffName: '$staff.name',
          staffType: '$staff.staffType',
          ordersProcessed: 1,
          totalRevenue: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 0] },
          firstOrder: 1,
          lastOrder: 1,
        },
      },
      { $sort: { ordersProcessed: -1 } },
    ]);

    // Calculate additional metrics
    const enriched = staffPerformance.map((item) => {
      const hoursWorked = item.firstOrder && item.lastOrder
        ? Math.round((item.lastOrder - item.firstOrder) / (1000 * 60 * 60) * 10) / 10
        : 0;

      const ordersPerHour = hoursWorked > 0
        ? Math.round((item.ordersProcessed / hoursWorked) * 10) / 10
        : 0;

      return {
        ...item,
        hoursWorked,
        ordersPerHour,
      };
    });

    return enriched;
  }

  // ========== 2. PEAK HOURS DEEP DIVE ==========
  async getPeakHoursReport(storeId: string, filter: DateRangeFilter = {}): Promise<any> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: { $in: ['confirmed', 'completed'] },
    };

    if (filter.startDate || filter.endDate) {
      match.createdAt = {};
      if (filter.startDate) match.createdAt.$gte = filter.startDate;
      if (filter.endDate) match.createdAt.$lte = filter.endDate;
    }

    // Orders by hour
    const ordersByHour = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Orders by day of week
    const ordersByDayOfWeek = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' }, // 1=Sunday, 7=Saturday
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Map day numbers to names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const ordersByDayMapped = ordersByDayOfWeek.map((item) => ({
      dayOfWeek: item._id,
      dayName: dayNames[item._id - 1],
      orders: item.orders,
      revenue: item.revenue,
    }));

    // Find peak hour
    const peakHour = ordersByHour.reduce(
      (max, item) => (item.orders > max.orders ? item : max),
      { _id: 0, orders: 0 }
    );

    // Find peak day
    const peakDay = ordersByDayMapped.reduce(
      (max, item) => (item.orders > max.orders ? item : max),
        ordersByDayMapped[0]
    );

    return {
      ordersByHour: ordersByHour.map((item) => ({
        hour: item._id,
        hourLabel: `${String(item._id).padStart(2, '0')}:00`,
        orders: item.orders,
        revenue: item.revenue,
        avgOrderValue: Math.round(item.avgOrderValue),
      })),
      ordersByDayOfWeek: ordersByDayMapped,
      peakHour: {
        hour: peakHour._id,
        hourLabel: `${String(peakHour._id).padStart(2, '0')}:00`,
        orders: peakHour.orders,
      },
      peakDay: {
        dayName: peakDay.dayName,
        orders: peakDay.orders,
      },
    };
  }

  // ========== 3. PRODUCT PROFITABILITY REPORT ==========
  async getProductProfitabilityReport(storeId: string, filter: DateRangeFilter = {}): Promise<any[]> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
    };

    if (filter.startDate || filter.endDate) {
      match.completedAt = {};
      if (filter.startDate) match.completedAt.$gte = filter.startDate;
      if (filter.endDate) match.completedAt.$lte = filter.endDate;
    }

    // Get product sales
    const productSales = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.name' },
          quantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          avgPrice: { $avg: '$items.price' },
        },
      },
    ]);

    // Calculate cost for each product
    const profitability = await Promise.all(
      productSales.map(async (item) => {
        // Get product recipe
        const recipe = await ProductIngredient.find({
          productId: item._id,
        }).populate('ingredientId');

        // Calculate cost per unit
        let costPerUnit = 0;
        for (const recipeItem of recipe) {
          const ingredient = recipeItem.ingredientId as any;
          costPerUnit += recipeItem.amount * (ingredient.cost || 0);
        }

        const totalCost = costPerUnit * item.quantitySold;
        const profit = item.totalRevenue - totalCost;
        const profitMargin = item.totalRevenue > 0
          ? ((profit / item.totalRevenue) * 100)
          : 0;

        return {
          productId: item._id,
          productName: item.productName,
          quantitySold: item.quantitySold,
          totalRevenue: item.totalRevenue,
          totalCost: Math.round(totalCost),
          profit: Math.round(profit),
          profitMargin: Math.round(profitMargin * 10) / 10,
          avgPrice: Math.round(item.avgPrice),
          costPerUnit: Math.round(costPerUnit),
        };
      })
    );

    // Sort by profit (highest first)
    profitability.sort((a, b) => b.profit - a.profit);

    return profitability;
  }

  // ========== 4. DAILY/WEEKLY/MONTHLY SUMMARY ==========
  async getSalesSummary(
    storeId: string,
    period: 'day' | 'week' | 'month',
    filter: DateRangeFilter = {}
  ): Promise<any> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Default date range if not provided
    const endDate = filter.endDate || new Date();
    const startDate = filter.startDate || (() => {
      const date = new Date(endDate);
      if (period === 'day') date.setDate(date.getDate() - 7); // Last 7 days
      if (period === 'week') date.setDate(date.getDate() - 28); // Last 4 weeks
      if (period === 'month') date.setMonth(date.getMonth() - 6); // Last 6 months
      return date;
    })();

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    };

    // Group format based on period
    let groupFormat: any;
    if (period === 'day') {
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } };
    } else if (period === 'week') {
      groupFormat = {
        $concat: [
          { $toString: { $year: '$completedAt' } },
          '-W',
          { $toString: { $week: '$completedAt' } },
        ],
      };
    } else {
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$completedAt' } };
    }

    const salesSummary = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupFormat,
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return salesSummary.map((item) => ({
      period: item._id,
      orders: item.orders,
      revenue: item.revenue,
      avgOrderValue: Math.round(item.avgOrderValue),
    }));
  }

  // ========== 5. CUSTOMER INSIGHTS ==========
  async getCustomerInsights(storeId: string, filter: DateRangeFilter = {}): Promise<any> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const match: any = {
      storeId: storeObjectId,
      status: 'completed',
    };

    if (filter.startDate || filter.endDate) {
      match.completedAt = {};
      if (filter.startDate) match.completedAt.$gte = filter.startDate;
      if (filter.endDate) match.completedAt.$lte = filter.endDate;
    }

    // Total unique customers
    const uniqueCustomers = await Order.distinct('customerPhone', match);
    const totalCustomers = uniqueCustomers.length;

    // Customer frequency
    const customerFrequency = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customerPhone',
          visitCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          firstVisit: { $min: '$completedAt' },
          lastVisit: { $max: '$completedAt' },
        },
      },
    ]);

    // Segment customers
    const newCustomers = customerFrequency.filter((c) => c.visitCount === 1).length;
    const returningCustomers = customerFrequency.filter((c) => c.visitCount > 1).length;
    const loyalCustomers = customerFrequency.filter((c) => c.visitCount >= 5).length;

    // Top customers
    const topCustomers = customerFrequency
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((item) => ({
        customerPhone: item._id,
        visitCount: item.visitCount,
        totalSpent: item.totalSpent,
        avgOrderValue: Math.round(item.avgOrderValue),
        firstVisit: item.firstVisit,
        lastVisit: item.lastVisit,
      }));

    // Calculate retention rate (customers who came back)
    const retentionRate = totalCustomers > 0
      ? ((returningCustomers / totalCustomers) * 100)
      : 0;

    // Average visits per customer
    const avgVisitsPerCustomer = totalCustomers > 0
      ? (customerFrequency.reduce((sum, c) => sum + c.visitCount, 0) / totalCustomers)
      : 0;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      loyalCustomers,
      retentionRate: Math.round(retentionRate * 10) / 10,
      avgVisitsPerCustomer: Math.round(avgVisitsPerCustomer * 10) / 10,
      topCustomers,
      customerSegmentation: {
        new: newCustomers,
        returning: returningCustomers,
        loyal: loyalCustomers,
      },
    };
  }

  // ========== 6. COMPREHENSIVE DASHBOARD DATA ==========
  async getDashboardData(storeId: string): Promise<any> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    // Parallel queries for better performance
    const [
      todayOrders,
      yesterdayOrders,
      last7DaysOrders,
      last30DaysOrders,
      pendingOrders,
      lowStockCount,
      activeStaff,
    ] = await Promise.all([
      // Today
      Order.countDocuments({
        storeId: storeObjectId,
        createdAt: { $gte: today },
      }),
      // Yesterday
      Order.countDocuments({
        storeId: storeObjectId,
        createdAt: { $gte: yesterday, $lt: today },
      }),
      // Last 7 days
      Order.aggregate([
        {
          $match: {
            storeId: storeObjectId,
            status: 'completed',
            completedAt: { $gte: last7Days },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      // Last 30 days
      Order.aggregate([
        {
          $match: {
            storeId: storeObjectId,
            status: 'completed',
            completedAt: { $gte: last30Days },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      // Pending orders
      Order.countDocuments({
        storeId: storeObjectId,
        status: 'pending',
      }),
      // Low stock count
      await Ingredient.countDocuments({
        storeId: storeObjectId,
        $expr: { $lte: ['$quantity', '$minQuantity'] },
      }),
      // Active staff
      User.countDocuments({
        storeId: storeObjectId,
        role: 'staff',
        isActive: true,
      }),
    ]);

    return {
      today: {
        orders: todayOrders,
      },
      yesterday: {
        orders: yesterdayOrders,
      },
      last7Days: {
        orders: last7DaysOrders[0]?.orders || 0,
        revenue: last7DaysOrders[0]?.revenue || 0,
      },
      last30Days: {
        orders: last30DaysOrders[0]?.orders || 0,
        revenue: last30DaysOrders[0]?.revenue || 0,
      },
      alerts: {
        pendingOrders,
        lowStockIngredients: lowStockCount,
      },
      resources: {
        activeStaff,
      },
    };
  }
}

export default new ReportService();