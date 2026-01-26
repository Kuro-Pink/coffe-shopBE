import { Router } from 'express';
import { chatWithAI, recommendProducts } from '../controllers/aiController';

const router = Router();

/**
 * @route   POST /api/ai/chat
 * @desc    Chatbot AI tư vấn món cho khách
 * @body    { storeId, message }
 */
router.post('/chat', chatWithAI);

/**
 * @route   GET /api/ai/recommend
 * @desc    AI gợi ý món bán chạy theo store
 * @query   storeId
 */
router.get('/recommend', recommendProducts);

export default router;
