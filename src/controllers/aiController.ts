import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import { chatAIReply, suggestOrderByPhone, analyzeCustomerByPhone } from '../services/aiService';
import { applyVoucherToProduct } from '../services/voucherPriceService';

const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

type ChatAction =
  | 'SHOW_RECOMMEND'
  | 'SHOW_DRINK'
  | 'SHOW_FOOD'
  | 'SHOW_SNACK'
  | 'SHOW_CAKE'
  | 'SHOW_COFFEE_PAIRING'
  | 'BEST_SELLER_DRINK'
  | 'MORNING_DRINK'
  | 'COLD_WEATHER'
  | 'LESS_ICE'
  | 'HOT_DRINK'
  | 'SMART_RECOMMEND'
  | 'SHOW_COFFEE'
  | 'SHOW_MILK_TEA'
  | 'SHOW_TEA'
  | 'SHOW_JUICE'
  | 'SHOW_SMOOTHIE'
  | 'SHOW_YOGURT'
  | 'SHOW_MATCHA'
  | 'SHOW_ICE_BLENDED';

const detectActionFromMessage = (message: string): ChatAction => {
  const msg = normalize(message);

  // ⭐ BÁN CHẠY (chỉ đồ uống)
  if (msg.includes('ban chay') || msg.includes('do uong')) return 'BEST_SELLER_DRINK';

  // 🌅 BUỔI SÁNG
  if (msg.includes('buoi sang') || msg.includes('sang som')) return 'MORNING_DRINK';

  // 🧊 ÍT đá
  if (
    msg.includes('troi lanh') ||
    msg.includes('lanh') ||
    msg.includes('it da') ||
    msg.includes('khong da')
  )
    return 'LESS_ICE';

  // 🔥 MÓN NÓNG
  if (msg.includes('nong')) return 'HOT_DRINK';

  if (msg.includes('goi y') || msg.includes('de xuat')) return 'SMART_RECOMMEND';

  if (msg.includes('ca phe') || msg.includes('coffee')) return 'SHOW_COFFEE';
  if (msg.includes('tra sua')) return 'SHOW_MILK_TEA';
  if (msg.includes('tra')) return 'SHOW_TEA';
  if (msg.includes('nuoc ep')) return 'SHOW_JUICE';
  if (msg.includes('sinh to')) return 'SHOW_SMOOTHIE';
  if (msg.includes('sua chua')) return 'SHOW_YOGURT';
  if (msg.includes('matcha')) return 'SHOW_MATCHA';
  if (msg.includes('da xay')) return 'SHOW_ICE_BLENDED';

  if (msg.includes('an vat')) return 'SHOW_SNACK';
  if (msg.includes('banh') || msg.includes('cake')) return 'SHOW_CAKE';
  if (msg.includes('an kem ca phe')) return 'SHOW_COFFEE_PAIRING';

  return 'SMART_RECOMMEND';
};

/**
 * POST /api/ai/chat
 * Chatbot AI tư vấn món
 */
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { storeId, message, action: clientAction } = req.body;

    if (!storeId || !message) {
      return res.status(400).json({ message: 'storeId và message là bắt buộc' });
    }

    const products = await Product.find({
      storeId,
      isAvailable: true,
    });

    if (products.length === 0) {
      return res.json({
        reply: 'Hiện tại quán chưa có món nào sẵn sàng phục vụ 😅',
        products: [],
      });
    }

    // 🔥 Detect action từ message
    const action = clientAction || detectActionFromMessage(message);

    const aiData = await chatAIReply(action, products);

    // Map lại sản phẩm thật
    const mappedProducts = (
      await Promise.all(
        (aiData.products || []).map(async (aiP: any) => {
          const real = products.find((p) => p.name === aiP.name);
          if (!real) return null;

          // 🔥 ÁP VOUCHER TẠI ĐÂY
          const priceData = await applyVoucherToProduct(real);

          return {
            productId: real._id,
            name: real.name,
            originalPrice: priceData.priceOriginal,
            price: priceData.priceFinal,
            finalPrice: priceData.priceFinal,
            discountAmount: priceData.discountAmount,
            image: real.image,
          };
        }),
      )
    ).filter(Boolean);

    // 🚨 Nếu user chọn nhóm mà quán KHÔNG CÓ MÓN
    if (mappedProducts.length === 0 && !aiData.action) {
      return res.json({
        reply: 'Món này hiện quán đang hết hoặc chưa có trong menu 😢 Bạn thử xem món khác nha!',
        products: [],
      });
    }

    res.json({
      reply: aiData.reply,
      products: mappedProducts,
      action: aiData.action || null, // 🆕 để FE biết bước tiếp theo
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/ai/cart-combo
 * AI gợi ý combo theo sản phẩm
 */
export const recommendCartCombo = async (req: Request, res: Response) => {
  const { storeId, productIds } = req.body;
  if (!storeId || !productIds?.length) {
    return res.json({ combos: [] });
  }
  const storeObjectId = new mongoose.Types.ObjectId(storeId);
  const productObjectIds = productIds.map((id: string) => new mongoose.Types.ObjectId(id));

  if (!productIds?.length) {
    return res.json({ combos: [] });
  }

  // lấy tất cả sản phẩm trong giỏ
  const products = await Product.find({
    _id: { $in: productObjectIds },
    storeId: storeObjectId,
  });

  // LẤY CATEGORY HOẶC TAG
  const categories = products.map((p) => p.categoryId);
  // tìm sản phẩm hay được gọi cùng
  const suggestions = await Order.aggregate([
    { $match: { storeId: storeObjectId } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  const cartObjectIds = productIds.map((id: string) => new Types.ObjectId(id));
  const productIdsSuggest = suggestions.map((s) => s._id);
  const suggestProducts = await Product.find({
    _id: {
      $in: productIdsSuggest,
      $nin: cartObjectIds, // 👈 LOẠI SẢN PHẨM ĐÃ CÓ TRONG GIỎ
    },
    storeId,
  });

  const combos = [];

  for (const p of suggestProducts.slice(0, 2)) {
    const priced = await applyVoucherToProduct(p);

    combos.push({
      productId: p._id,
      name: p.name,
      finalPrice: priced.priceFinal,
      originalPrice: priced.priceOriginal,
      discountAmount: priced.discountAmount,
      image: p.image,
      reason: 'Khách thường gọi kèm với các món trong giỏ',
      popularity: 10,
    });
  }

  return res.json({ combos });
};

export const suggestOrder = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp số điện thoại',
      });
    }

    const result = await suggestOrderByPhone(phone);

    return res.json(result);
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    res.status(500).json({
      message: 'Lỗi khi gợi ý món',
    });
  }
};

export const analyzeCustomer = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: 'Thiếu số điện thoại khách hàng',
      });
    }

    const profile = await analyzeCustomerByPhone(phone);

    return res.json(profile);
  } catch (error) {
    console.error('AI Customer Analyze Error:', error);
    res.status(500).json({
      message: 'Lỗi phân tích khách hàng',
    });
  }
};
