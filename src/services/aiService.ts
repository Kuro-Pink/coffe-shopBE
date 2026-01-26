import Order from '../models/Order';
import openai from '../config/openai';
import { IProduct } from '../models/Product';

/**
 * Chatbot tư vấn món
 */
export const chatAIReply = async (message: string, products: any[]) => {
  const prompt = `
Bạn là trợ lý gọi món cho quán cafe.

Khách nói: "${message}"

Danh sách menu:
${products.map((p) => `- ${p.name} (${p.price}đ)`).join('\n')}

Nếu khách muốn gợi ý món, hãy chọn tối đa 3 món phù hợp và trả về JSON đúng format:

{
  "reply": "câu trả lời tự nhiên cho khách",
  "products": [
    { "name": "...", "price": 0 }
  ]
}

Nếu không cần gợi ý món thì trả về:

{
  "reply": "câu trả lời",
  "products": []
}

CHỈ TRẢ VỀ JSON. KHÔNG VIẾT THÊM TEXT NGOÀI JSON.
`;

  const aiRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const text = aiRes.choices[0].message.content || '{}';

  try {
    return JSON.parse(text);
  } catch {
    return { reply: text, products: [] };
  }
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

export const analyzeCustomerByPhone = async (phone: string) => {
  const orders = await Order.find({
    customerPhone: phone,
    status: { $ne: 'cancelled' },
  }).sort({ createdAt: -1 });

  if (orders.length === 0) {
    return {
      type: 'new',
      totalOrders: 0,
      totalSpent: 0,
      description: 'Khách hàng mới, chưa có lịch sử gọi món.',
    };
  }

  // Tổng số đơn & tổng tiền
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Món hay gọi
  const itemMap: Record<string, number> = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      itemMap[item.name] = (itemMap[item.name] || 0) + item.quantity;
    });
  });

  const favoriteItems = Object.entries(itemMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((i) => i[0])
    .join(', ');

  // Gán loại khách (logic)
  let customerType = 'regular';
  if (totalOrders === 1) customerType = 'new';
  else if (totalOrders >= 5) customerType = 'loyal';
  if (totalOrders >= 8 || totalSpent >= 500000) customerType = 'vip';

  // Prompt AI để diễn giải
  const prompt = `
Bạn là AI phân tích hành vi khách hàng cho quán cà phê.

Thông tin:
- Số đơn: ${totalOrders}
- Tổng chi tiêu: ${totalSpent} VNĐ
- Món hay gọi: ${favoriteItems}

Hãy viết 1 đoạn mô tả ngắn (1–2 câu) về khách hàng này,
xưng hô lịch sự, dễ hiểu cho nhân viên quán.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
  });

  return {
    type: customerType,
    totalOrders,
    totalSpent,
    favoriteItems,
    description: completion.choices[0].message.content,
  };
};
