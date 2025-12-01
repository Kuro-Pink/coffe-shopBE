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

export default router;
