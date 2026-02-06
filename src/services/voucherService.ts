import Voucher from '../models/Voucher';
import { ApiError } from '../utils/ApiError';

class VoucherService {
  async create(storeId: string, data: any) {
    if (data.code) {
      const existed = await Voucher.findOne({
        storeId,
        code: data.code.toUpperCase(),
      });

      if (existed) {
        throw new ApiError(400, 'Voucher code already exists in this store');
      }
    }

    return Voucher.create({
      ...data,
      code: data.code ? data.code.toUpperCase() : null,
      productIds: data.productIds || [],
      storeId,
    });
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
    if (data.code) {
      const existed = await Voucher.findOne({
        _id: { $ne: id },
        code: data.code.toUpperCase(),
      });

      if (existed) {
        throw new ApiError(400, 'Voucher code already exists');
      }
    }

    const v = await Voucher.findByIdAndUpdate(
      id,
      {
        ...data,
        code: data.code ? data.code.toUpperCase() : null,
        productIds: data.productIds || [],
      },
      { new: true },
    );

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

  async applyToOrder(code: string, storeId: string, total: number) {
    const voucher = await this.findValidCode(code, storeId);

    if (!voucher) {
      throw new ApiError(400, 'Voucher không hợp lệ');
    }

    if (voucher.minBillValue && total < voucher.minBillValue) {
      throw new ApiError(400, 'Đơn chưa đạt giá trị tối thiểu');
    }

    let discount = 0;

    if (voucher.type === 'percent') {
      discount = (total * voucher.value) / 100;

      if (voucher.maxDiscount) {
        discount = Math.min(discount, voucher.maxDiscount);
      }
    } else {
      discount = voucher.value;
    }

    const finalTotal = Math.max(total - discount, 0);

    return {
      voucherId: voucher._id,
      voucherName: voucher.code,
      discount,
      finalTotal,
    };
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
