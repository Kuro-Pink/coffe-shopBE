import { Router } from 'express';
import {
  chatWithAI,
  recommendCombo,
  recommendCartCombo,
  suggestOrder,
  analyzeCustomer,
} from '../controllers/aiController';

const router = Router();

router.post('/chat', chatWithAI);
router.post('/cart-combo', recommendCartCombo);
router.post('/suggest-order', suggestOrder);
router.post('/customer-profile', analyzeCustomer);

export default router;
