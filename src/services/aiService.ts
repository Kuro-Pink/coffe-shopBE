import OpenAI from 'openai';
import Order from '../models/Order';
// import { openai } from '../config/openai';
import { IProduct } from '../models/Product';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Chatbot tư vấn món
 */
export const chatAIReply = async (message: string, products: IProduct[]): Promise<string> => {
  const menuText = products
    .map((p) => `- ${p.name} (${p.price}đ): ${p.description || 'Không có mô tả'}`)
    .join('\n');

  const prompt = `
Bạn là nhân viên phục vụ quán cà phê.
Nhiệm vụ của bạn là tư vấn món cho khách.

MENU:
${menuText}

KHÁCH HỎI:
"${message}"

YÊU CẦU:
- Trả lời ngắn gọn, thân thiện
- Có thể gợi ý 1–2 món phù hợp
- Không bịa món ngoài menu
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
  });

  return completion.choices[0].message.content || '';
};

/**
 * AI giải thích lý do gợi ý món (ăn điểm hội đồng)
 */
export const getAIRecommendationExplain = async (
  products: { name: string; price: number }[],
): Promise<string> => {
  const prompt = `
Danh sách các món bán chạy nhất:
${products.map((p) => `- ${p.name} (${p.price}đ)`).join('\n')}

Hãy viết 1 câu ngắn (tối đa 2 dòng) giải thích vì sao các món này nên được gợi ý cho khách mới.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
  });

  return completion.choices[0].message.content || '';
};

/**
 * AI viết câu gợi ý combo (upsell)
 */
export const getAIComboSuggestText = async (
  baseProduct: string,
  comboProduct: string,
): Promise<string> => {
  const prompt = `
Bạn là nhân viên quán cà phê.
Khách đang gọi món: "${baseProduct}"
Hãy viết 1 câu ngắn, thân thiện để gợi ý thêm món "${comboProduct}".
Ví dụ: upsell nhẹ nhàng, không ép mua.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || '';
};

export const suggestOrderByPhone = async (phone: string) => {
  // 1. Lấy đơn gần nhất của khách
  const lastOrder = await Order.findOne({
    customerPhone: phone,
    status: { $ne: 'cancelled' },
  })
    .sort({ createdAt: -1 })
    .limit(1);

  if (!lastOrder) {
    return {
      hasHistory: false,
      message: 'Chào bạn 👋, đây là lần đầu bạn gọi món tại quán!',
    };
  }

  // 2. Chuẩn bị dữ liệu cho AI
  const itemsText = lastOrder.items
    .map((item) => `${item.name} (số lượng: ${item.quantity}, giá: ${item.price})`)
    .join(', ');

  const note = lastOrder.customerNote || 'Không có ghi chú đặc biệt';

  // 3. Prompt cho AI
  const prompt = `
Bạn là trợ lý AI của quán cà phê.
Dữ liệu khách hàng:
- Tên khách: ${lastOrder.customerName}
- Món đã gọi: ${itemsText}
- Ghi chú của khách: ${note}

Hãy tạo 1 câu gợi ý thân thiện, tự nhiên, xưng hô lịch sự (anh/chị),
gợi ý gọi lại món giống lần trước.
Không dài dòng, không quảng cáo.
`;

  // 4. Gọi OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return {
    hasHistory: true,
    message: completion.choices[0].message.content,
    applyData: {
      items: lastOrder.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      note: lastOrder.customerNote,
    },
  };
};
