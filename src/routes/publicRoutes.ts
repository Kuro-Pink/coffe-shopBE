import { Router } from 'express';
import publicController from '../controllers/publicController';

const router = Router();

console.log('✅ Public routes module loaded');

// Public routes - NO AUTHENTICATION REQUIRED

// Get menu by store
router.get('/stores/:storeId/menu', publicController.getMenu);

// Get table info
router.get('/tables/:tableId', publicController.getTableInfo);

// Create order
router.post('/orders', publicController.createOrder);

console.log('✅ Public routes registered');

export default router;