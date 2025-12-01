import { Router } from 'express';
import adminController from '../controllers/adminController';
import { protect, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

// Protect all routes - only admin can access
router.use(protect);
router.use(authorize('admin'));

// Statistics
router.get('/stats', adminController.getStatistics);

// Store CRUD
router.get('/stores', adminController.getAllStores);
router.get('/stores/:id', adminController.getStoreById);
router.post('/stores', upload.single('logo'), adminController.createStore);
router.put('/stores/:id', upload.single('logo'), adminController.updateStore);
router.delete('/stores/:id', adminController.deleteStore);
router.patch('/stores/:id/toggle-status', adminController.toggleStoreStatus);

export default router;
