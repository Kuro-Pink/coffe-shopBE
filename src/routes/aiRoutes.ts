import { Router } from 'express';
import {
  chatWithAI,
  recommendProducts,
  recommendCombo,
  suggestOrder,
  analyzeCustomer,
} from '../controllers/aiController';

const router = Router();

router.post('/chat', chatWithAI);
router.get('/recommend', recommendProducts);
router.get('/combo', recommendCombo);
router.post('/suggest-order', suggestOrder);
router.post('/customer-profile', analyzeCustomer);

export default router;
