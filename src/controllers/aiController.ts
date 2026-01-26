import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import {
  chatAIReply,
  getAIRecommendationExplain,
  getAIComboSuggestText,
  suggestOrderByPhone,
} from '../services/aiService';

/**
 * POST /api/ai/chat
 * Chatbot AI tư vấn món
 */
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { storeId, message } = req.body;

    if (!storeId || !message) {
      return res.status(400).json({ message: 'storeId và message là bắt buộc' });
    }

    const products = await Product.find({
      storeId,
      isAvailable: true,
    }).select('name price description');

    if (products.length === 0) {
      return res.json({
        reply: 'Hiện tại quán chưa có món nào sẵn sàng phục vụ 😅',
      });
    }

    const reply = await chatAIReply(message, products);

    res.json({ reply });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/ai/recommend?storeId=xxx
 * AI gợi ý món bán chạy
 */
export const recommendProducts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: 'storeId là bắt buộc' });
    }

    const storeObjectId = new mongoose.Types.ObjectId(storeId as string);

    // 🔍 Phân tích lịch sử order thật
    const topProducts = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: { $in: ['confirmed', 'completed'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: '$product._id',
          name: '$product.name',
          price: '$product.price',
          totalQuantity: 1,
        },
      },
    ]);

    // 🧯 Fallback khi chưa có order
    if (topProducts.length === 0) {
      const fallbackProducts = await Product.find({
        storeId,
        isAvailable: true,
      })
        .limit(5)
        .select('name price');

      return res.json({
        recommend: fallbackProducts,
        aiExplain: 'Các món được gợi ý dựa trên menu hiện có của quán.',
      });
    }

    // 🤖 AI giải thích (để báo cáo)
    const aiExplain = await getAIRecommendationExplain(topProducts);

    res.json({
      recommend: topProducts,
      aiExplain,
    });
  } catch (error: any) {
    console.error('AI Recommend Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/ai/combo
 * AI gợi ý combo theo sản phẩm
 */
export const recommendCombo = async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.query;

    if (!storeId || !productId) {
      return res.status(400).json({ message: 'storeId và productId là bắt buộc' });
    }

    const storeObjectId = new mongoose.Types.ObjectId(storeId as string);
    const productObjectId = new mongoose.Types.ObjectId(productId as string);

    /**
     * 🔍 Tìm các sản phẩm hay đi cùng productId
     */
    const combos = await Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          status: { $in: ['confirmed', 'completed'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$_id',
          products: { $addToSet: '$items.productId' },
        },
      },
      {
        $match: {
          products: productObjectId,
        },
      },
      { $unwind: '$products' },
      {
        $match: {
          products: { $ne: productObjectId },
        },
      },
      {
        $group: {
          _id: '$products',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: '$product._id',
          name: '$product.name',
          price: '$product.price',
          count: 1,
        },
      },
    ]);

    if (combos.length === 0) {
      return res.json({
        combo: null,
        message: 'Chưa đủ dữ liệu để gợi ý combo',
      });
    }

    const baseProduct = await Product.findById(productId).select('name');

    const upsellText = await getAIComboSuggestText(baseProduct?.name || 'Món này', combos[0].name);

    res.json({
      baseProduct: baseProduct?.name,
      combo: combos[0],
      upsellText,
    });
  } catch (error: any) {
    console.error('AI Combo Error:', error);
    res.status(500).json({ error: error.message });
  }
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
