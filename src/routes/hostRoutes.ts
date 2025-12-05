import { Router } from 'express';
import hostController from '../controllers/hostController';
import { protect, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

// Protect all routes - only host can access
router.use(protect);
router.use(authorize('host'));

// ========== CATEGORIES ==========
router.get('/stores/:storeId/categories', hostController.getCategories);
router.post('/stores/:storeId/categories', hostController.createCategory);
router.get('/categories/:id', hostController.getCategoryById);
router.put('/categories/:id', hostController.updateCategory);
router.delete('/categories/:id', hostController.deleteCategory);

// ========== PRODUCTS ==========
router.get('/stores/:storeId/products', hostController.getProducts);
router.post('/stores/:storeId/products', upload.single('image'), hostController.createProduct);
router.get('/products/:id', hostController.getProductById);
router.put('/products/:id', upload.single('image'), hostController.updateProduct);
router.delete('/products/:id', hostController.deleteProduct);
router.patch('/products/:id/toggle-availability', hostController.toggleProductAvailability);

// ========== TABLES ========== 
router.get('/stores/:storeId/tables/stats', hostController.getTableStats);
router.get('/stores/:storeId/tables', hostController.getTables);
router.post('/stores/:storeId/tables', hostController.createTable);
router.get('/tables/:id', hostController.getTableById);
router.put('/tables/:id', hostController.updateTable);
router.delete('/tables/:id', hostController.deleteTable);
router.patch('/tables/:id/regenerate-qr', hostController.regenerateQRCode);

// ========== ORDERS ========== (NEW)
router.get('/stores/:storeId/orders/today', hostController.getTodayStats);
router.get('/stores/:storeId/orders/stats', hostController.getOrderStats);
router.get('/stores/:storeId/orders', hostController.getOrders);
router.get('/orders/:id', hostController.getOrderById);
router.patch('/orders/:id/status', hostController.updateOrderStatus);

export default router;