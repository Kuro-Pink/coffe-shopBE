import { Router } from 'express';
import adminController from '../controllers/adminController';
import storeRequestController from '../controllers/storeRequestController';
import adminHostController from '../controllers/adminHostController';
import { protect, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

// Protect all routes - only admin can access
router.use(protect);
router.use(authorize('admin'));

// ========== Dashboard ==========
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/dashboard/revenue', adminController.getRevenueChart);
router.get('/dashboard/activities', adminController.getRecentActivities);

// ========== HOST MANAGEMENT ==========
router.get('/hosts', adminHostController.getHosts);
router.get('/hosts/:id', adminHostController.getHostById);
router.patch('/hosts/:id/lock', adminHostController.lockHost);
router.patch('/hosts/:id/unlock', adminHostController.unlockHost);

// Statistics
router.get('/stats', adminController.getStatistics);

// ========== STORE REQUESTS ========== (NEW)
router.get('/store-requests/stats', storeRequestController.getStatistics);
router.get('/store-requests', storeRequestController.getAllStoreRequests);
router.get('/store-requests/:id', storeRequestController.getStoreRequestById);
router.post('/store-requests/:id/approve', storeRequestController.approveStoreRequest);
router.post('/store-requests/:id/reject', storeRequestController.rejectStoreRequest);
router.delete('/store-requests/:id', storeRequestController.deleteStoreRequest);

// Store CRUD
router.get('/stores', adminController.getAllStores);
router.get('/stores/:id', adminController.getStoreById);
router.post('/stores', upload.single('logo'), adminController.createStore);
router.put('/stores/:id', upload.single('logo'), adminController.updateStore);
router.delete('/stores/:id', adminController.deleteStore);
router.patch('/stores/:id/toggle-status', adminController.toggleStoreStatus);

export default router;
