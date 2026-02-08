import mongoose from 'mongoose';
import Voucher from '../models/Voucher';
import { IProduct } from '../models/Product';

export async function applyVoucherToProduct(product: IProduct) {
  const now = new Date();

  const voucher = await Voucher.findOne({
    storeId: new mongoose.Types.ObjectId(product.storeId),
    productIds: {
      $in: [new mongoose.Types.ObjectId(product._id)],
    },
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  let priceFinal = product.price;
  let discountAmount = 0;

  if (voucher) {
    if (voucher.type === 'percent') {
      discountAmount = (product.price * voucher.value) / 100;
    } else {
      discountAmount = voucher.value;
    }

    if (voucher.maxDiscount) {
      discountAmount = Math.min(discountAmount, voucher.maxDiscount);
    }

    priceFinal = Math.max(0, product.price - discountAmount);
  }

  return {
    ...product.toObject(),
    priceOriginal: product.price,
    priceFinal,
    discountAmount,
    hasDiscount: !!voucher,
    voucherId: voucher?._id || null,
  };
}
