import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import hostRoutes from './hostRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/host', hostRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;