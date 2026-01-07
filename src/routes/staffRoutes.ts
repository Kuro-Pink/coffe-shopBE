import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import hostController from '../controllers/hostController';

const router = Router();

router.use(protect);
router.use(authorize('staff')); // Only staff can access

// Staff can only:
// 1. View orders
// 2. Update order status (confirm/complete)

// Get orders (staff sees all orders in their store)
router.get('/store/:storeId/orders', hostController.getOrders);
router.get('/orders/:id', hostController.getOrderById);

// Update order status (with staff tracking)
router.patch('/orders/:id/status', hostController.updateOrderStatus);
export default router;