import { Router } from 'express';
import publicController from '../controllers/publicController';
import hostController from '../controllers/hostController';
import voucherController from '../controllers/voucherController';

const router = Router();

console.log('✅ Public routes module loaded');

// Public routes - NO AUTHENTICATION REQUIRED

// Get menu by store
router.get('/stores/:storeId/menu', publicController.getMenu);

// Get table info
router.get('/tables/:tableId', publicController.getTableInfo);

// Create order
router.post('/orders', publicController.createOrder);

// Apply voucher
router.post('/apply-voucher', voucherController.applyVoucher);

export default router;
