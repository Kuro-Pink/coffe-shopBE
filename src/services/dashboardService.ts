import Store from '../models/Store';
import User from '../models/User';
import Order from '../models/Order'; // nếu có
import StoreRequest from '../models/StoreRequest'; // nếu có

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
}

export default new DashboardService();
