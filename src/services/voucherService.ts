import Voucher from '../models/Voucher';
import { ApiError } from '../utils/ApiError';

class VoucherService {
  async create(storeId: string, data: any) {
    const existed = await Voucher.findOne({
      storeId,
      code: data.code?.toUpperCase(),
    });

    if (existed) {
      throw new ApiError(400, 'Voucher code already exists in this store');
    }

    return Voucher.create({ ...data, storeId });
  }

  async getByStore(storeId: string) {
    return Voucher.find({ storeId }).sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const v = await Voucher.findById(id);
    if (!v) throw new ApiError(404, 'Voucher not found');
    return v;
  }

  async update(id: string, data: any) {
    const v = await Voucher.findByIdAndUpdate(id, data, { new: true });
    if (!v) throw new ApiError(404, 'Voucher not found');
    return v;
  }

  async delete(id: string) {
    const v = await Voucher.findByIdAndDelete(id);
    if (!v) throw new ApiError(404, 'Voucher not found');
  }

  async toggle(id: string) {
    const voucher = await Voucher.findById(id);
    if (!voucher) throw new ApiError(404, 'Voucher not found');

    voucher.isActive = !voucher.isActive;
    await voucher.save();

    return voucher;
  }

  async getVoucherById(id: string) {
    return Voucher.findById(id).populate('productIds');
  }

  async setProducts(voucherId: string, productIds: string[]) {
    return Voucher.findByIdAndUpdate(voucherId, { $set: { productIds } }, { new: true });
  }

  async findValidCode(code: string, storeId: string) {
    const now = new Date();
    return Voucher.findOne({
      code: code.toUpperCase(),
      storeId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
  }
}

export default new VoucherService();
