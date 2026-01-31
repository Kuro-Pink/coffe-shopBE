import Store from '../models/Store';
import User from '../models/User';
import Order from '../models/Order'; // nếu có
import StoreRequest from '../models/StoreRequest'; // nếu có
import { ApiError } from '../utils/ApiError';

class DashboardService {
  async getDashboardStats() {
    const [
      totalStores,
      activeStores,
      inactiveStores,
      totalHosts,
      pendingStoreRequests,
      orderStats,
    ] = await Promise.all([
      Store.countDocuments(),
      Store.countDocuments({ isActive: true }),
      Store.countDocuments({ isActive: false }),
      User.countDocuments({ role: 'host' }),
      StoreRequest.countDocuments({ status: 'pending' }),

      // 🔥 Aggregate order
      Order.aggregate([
        {
          $match: {
            status: 'completed', // hoặc 'paid' tuỳ logic hệ thống bạn
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' }, // ⚠️ field tiền
          },
        },
      ]),
    ]);

    const totalOrders = orderStats[0]?.totalOrders || 0;
    const totalRevenue = orderStats[0]?.totalRevenue || 0;

    return {
      totalStores,
      activeStores,
      inactiveStores,
      totalHosts,
      pendingStoreRequests,
      totalOrders,
      totalRevenue,
    };
  }
  async getRevenueByRange(days: number) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate },
          status: 'completed', // nếu có
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return data.map((item) => ({
      date: item._id,
      revenue: item.totalRevenue,
      orders: item.totalOrders,
    }));
  }

  async getRecentActivities(limit = 5) {
    const recentStores = await Store.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name isActive createdAt');

    const recentHosts = await User.find({ role: 'host' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('email createdAt');

    return [
      ...recentStores.map((s) => ({
        type: 'store',
        message: s.isActive ? `Store ${s.name} đã được duyệt` : `Store ${s.name} bị khóa`,
        createdAt: s.createdAt,
      })),
      ...recentHosts.map((u) => ({
        type: 'host',
        message: `Host ${u.email} đăng ký`,
        createdAt: u.createdAt,
      })),
    ]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);
  }

  async getRevenueOverview() {
    const [revenueAgg] = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const totalStores = await Store.countDocuments({});

    return {
      totalRevenue: revenueAgg?.totalRevenue || 0,
      totalOrders: revenueAgg?.totalOrders || 0,
      totalStores,
      avgRevenuePerStore:
        totalStores > 0 ? Math.round((revenueAgg?.totalRevenue || 0) / totalStores) : 0,
    };
  }
  async getRevenueByStore() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$storeId',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          todayRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', startOfToday] },
                    { $lte: ['$createdAt', endOfToday] },
                  ],
                },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      {
        $project: {
          _id: 0,
          storeId: '$store._id',
          storeName: '$store.name',
          totalRevenue: 1,
          totalOrders: 1,
          todayRevenue: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  async getRevenueByStoreDetail(storeId: string, days: number) {
    const start = new Date();
    start.setDate(start.getDate() - days);

    const store = await Store.findById(storeId);
    if (!store) throw new ApiError(404, 'Store not found');

    const [summary] = await Order.aggregate([
      {
        $match: {
          storeId: store._id,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const chart = await Order.aggregate([
      {
        $match: {
          storeId: store._id,
          status: 'completed',
          createdAt: { $gte: start },
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
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: 1,
          orders: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    const topProducts = await Order.aggregate([
      {
        $match: {
          storeId: store._id,
          status: 'completed',
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $multiply: ['$items.quantity', '$items.price'],
            },
          },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ]);

    const totalRevenue = summary?.totalRevenue || 0;
    const totalOrders = summary?.totalOrders || 0;
    const avgRevenuePerDay = days > 0 ? Math.round(totalRevenue / days) : 0;

    return {
      storeId: store._id,
      storeName: store.name,
      totalRevenue,
      totalOrders,
      avgRevenuePerDay,
      revenueByDay: chart, // FE đang dùng
      topProducts, // 👈 THÊM CÁI NÀY
    };
  }
}

export default new DashboardService();
