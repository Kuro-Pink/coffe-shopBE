import { Router } from 'express';
import hostController from '../controllers/hostController';
import analyticsController from '../controllers/analyticsController';
import storeRequestController from '../controllers/storeRequestController';
import billController from '../controllers/billController';
import staffController from '../controllers/staffController';
import inventoryController from '../controllers/inventoryController';
import reportController from '../controllers/reportController';
import { protect, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(protect);
router.get('/stores/:storeId/orders', authorize('host', 'staff'), hostController.getOrders);
router.use(authorize('host')); // Only host can access

// ========== STORE REQUESTS ========== (NEW)
router.post(
  '/store-requests',
  upload.single('storeLogo'),
  storeRequestController.createStoreRequest,
);
router.get('/store-requests/my-requests', storeRequestController.getMyStoreRequests);

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
router.patch('/tables/:id/status', hostController.updateTableStatus);
router.delete('/tables/:id', hostController.deleteTable);
router.patch('/tables/:id/regenerate-qr', hostController.regenerateQRCode);

// ========== ORDERS ==========
router.get('/stores/:storeId/orders/today', hostController.getTodayStats);
router.get('/stores/:storeId/orders/stats', hostController.getOrderStats);
router.get('/orders/:id', hostController.getOrderById);
router.patch('/orders/:id/status', hostController.updateOrderStatus);
router.get('/tables/:tableId/unpaid-orders', hostController.getUnpaidOrdersByTable);

// ========== ANALYTICS ==========
router.get('/stores/:storeId/analytics/dashboard', analyticsController.getDashboardOverview);
router.get('/stores/:storeId/analytics/revenue-trends', analyticsController.getRevenueTrends);
router.get('/stores/:storeId/analytics/peak-hours', analyticsController.getPeakHours);
router.get('/stores/:storeId/analytics/best-sellers', analyticsController.getBestSellers);
router.get('/stores/:storeId/analytics/customers', analyticsController.getCustomerInsights);
router.get('/stores/:storeId/analytics/categories', analyticsController.getCategoryPerformance);
router.get('/stores/:storeId/analytics/tables', analyticsController.getTablePerformance);

// ========== BILLS ========== (NEW)
router.get('/stores/:storeId/bills', billController.getBills);
router.post('/stores/:storeId/bills', billController.createBill);
router.get('/bills/:id', billController.getBillById);
router.patch('/bills/:id/payment', billController.markBillAsPaid);

// ========== STAFF MANAGEMENT ========== (NEW)
router.get('/stores/:storeId/staff/stats', staffController.getStaffStats);
router.get('/stores/:storeId/staff', staffController.getStaff);
router.post('/stores/:storeId/staff', staffController.createStaff);
router.get('/staff/:id', staffController.getStaffById);
router.put('/staff/:id', staffController.updateStaff);
router.delete('/staff/:id', staffController.deleteStaff);
router.patch('/staff/:id/toggle-status', staffController.toggleStaffStatus);

// ========== INVENTORY MANAGEMENT ========== (NEW)

// Ingredients CRUD
router.get('/stores/:storeId/ingredients', inventoryController.getIngredients);
router.post('/stores/:storeId/ingredients', inventoryController.createIngredient);
router.get('/ingredients/:id', inventoryController.getIngredientById);
router.put('/ingredients/:id', inventoryController.updateIngredient);
router.delete('/ingredients/:id', inventoryController.deleteIngredient);

// Stock management
router.post('/ingredients/:id/adjust-stock', inventoryController.adjustStock);

// Product recipe
router.get('/products/:productId/recipe', inventoryController.getProductRecipe);
router.put('/products/:productId/recipe', inventoryController.setProductRecipe);
router.get('/products/:productId/availability', inventoryController.checkProductAvailability);

// Reports
router.get('/stores/:storeId/inventory/summary', inventoryController.getInventorySummary);
router.get('/stores/:storeId/inventory/transactions', inventoryController.getInventoryTransactions);
router.get('/stores/:storeId/inventory/usage-report', inventoryController.getIngredientUsageReport);

// ========== ADVANCED REPORTS ========== (NEW)
router.get(
  '/stores/:storeId/reports/staff-performance',
  reportController.getStaffPerformanceReport,
);
router.get('/stores/:storeId/reports/peak-hours', reportController.getPeakHoursReport);
router.get(
  '/stores/:storeId/reports/product-profitability',
  reportController.getProductProfitabilityReport,
);
router.get('/stores/:storeId/reports/sales-summary', reportController.getSalesSummary);
router.get('/stores/:storeId/reports/customer-insights', reportController.getCustomerInsights);
router.get('/stores/:storeId/reports/dashboard', reportController.getDashboardData);

export default router;
