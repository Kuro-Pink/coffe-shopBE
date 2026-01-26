import OpenAI from 'openai';
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
