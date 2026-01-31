import User from '../models/User';
import Store from '../models/Store';
import Order from '../models/Order';
import { ApiError } from '../utils/ApiError';

class AdminHostService {
  async getHosts() {
    const hosts = await User.find({ role: 'host' }).lean();

    const hostIds = hosts.map((h) => h._id);

    const stores = await Store.aggregate([
      { $match: { ownerId: { $in: hostIds } } },
      {
        $group: {
          _id: '$ownerId',
          storeCount: { $sum: 1 },
        },
      },
    ]);

    const orders = await Order.aggregate([
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      { $match: { 'store.ownerId': { $in: hostIds }, status: 'completed' } },
      {
        $group: {
          _id: '$store.ownerId',
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    return hosts.map((host) => ({
      _id: host._id,
      email: host.email,
      name: host.name,
      isActive: host.isActive,
      createdAt: host.createdAt,
      storeCount: stores.find((s) => String(s._id) === String(host._id))?.storeCount || 0,
      totalRevenue: orders.find((o) => String(o._id) === String(host._id))?.totalRevenue || 0,
    }));
  }

  async getHostById(id: string) {
    const host = await User.findOne({ _id: id, role: 'host' });
    if (!host) throw new ApiError(404, 'Host not found');

    const stores = await Store.find({ ownerId: id });
    const revenue = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      { $match: { 'store.ownerId': host._id } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    return {
      _id: host._id,
      email: host.email,
      phone: host.phone,
      name: host.name,
      isActive: host.isActive,
      createdAt: host.createdAt,
      stores,
      totalRevenue: revenue[0]?.totalRevenue || 0,
    };
  }

  async lockHost(id: string) {
    const host = await User.findOneAndUpdate(
      { _id: id, role: 'host' },
      { isActive: false },
      { new: true },
    );
    if (!host) throw new ApiError(404, 'Host not found');
    return host;
  }

  async unlockHost(id: string) {
    const host = await User.findOneAndUpdate(
      { _id: id, role: 'host' },
      { isActive: true },
      { new: true },
    );
    if (!host) throw new ApiError(404, 'Host not found');
    return host;
  }
}

export default new AdminHostService();
