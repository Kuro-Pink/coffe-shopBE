import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import hostRoutes from './hostRoutes';
import publicRoutes from './publicRoutes';
import staffRoutes from './staffRoutes';

const router = Router();

console.log('✅ Main router loading...');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/host', hostRoutes);
router.use('/public', publicRoutes);
router.use('/staff', staffRoutes);

console.log('✅ All routes registered');

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;