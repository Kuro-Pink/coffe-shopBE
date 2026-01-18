import { Router } from 'express';
import shiftController from '../controllers/shiftController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Protect all routes - only staff can access
router.use(protect);
router.use(authorize('staff'));

// ========== MY SHIFTS (Staff self-service) ==========
router.get('/my-shift/current', shiftController.getMyCurrentShift);
router.post('/my-shift/check-in', shiftController.checkIn);
router.post('/my-shift/check-out', shiftController.checkOut);
router.get('/my-shifts', shiftController.getMyShiftHistory);
router.get('/my-shifts/stats', shiftController.getMyShiftStats);

export default router;
