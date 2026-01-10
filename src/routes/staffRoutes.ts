import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import hostController from '../controllers/hostController';
import billController from '../controllers/billController';

const router = Router();

router.use(protect);
router.use(authorize('staff')); // Only staff can access

// ========== TABLES ==========
router.get('/stores/:storeId/tables/stats', hostController.getTableStats);
router.get('/stores/:storeId/tables', hostController.getTables);
router.get('/tables/:id', hostController.getTableById);
router.patch('/tables/:id/status', hostController.updateTableStatus);
router.patch('/tables/:id/regenerate-qr', hostController.regenerateQRCode);

// ========== ORDERS ==========
router.get('/stores/:storeId/orders/stats', hostController.getOrderStats);
router.get('/stores/:storeId/orders', hostController.getOrders);
router.get('/orders/:id', hostController.getOrderById);
router.patch('/orders/:id/status', hostController.updateOrderStatus);
router.get('/tables/:tableId/unpaid-orders', hostController.getUnpaidOrdersByTable);

// ========== BILLS ========== (NEW)
router.get('/stores/:storeId/bills', billController.getBills);
router.post('/stores/:storeId/bills', billController.createBill);
router.get('/bills/:id', billController.getBillById);
router.patch('/bills/:id/payment', billController.markBillAsPaid);

export default router;
