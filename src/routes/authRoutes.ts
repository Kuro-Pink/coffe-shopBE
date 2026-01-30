import { Router } from 'express';
import authController from '../controllers/authController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, upload.single('avatar'), authController.updateMe);
router.patch('/change-password', protect, authController.changePassword);

export default router;
