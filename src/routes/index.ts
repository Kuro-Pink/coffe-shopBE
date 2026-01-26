import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import hostRoutes from './hostRoutes';
import publicRoutes from './publicRoutes';
import staffRoutes from './staffRoutes';
import aiRoutes from './aiRoutes';

const router = Router();

console.log('✅ Main router loading...');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/host', hostRoutes);
router.use('/public', publicRoutes);
router.use('/staff', staffRoutes);
router.use('/ai', aiRoutes);

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
