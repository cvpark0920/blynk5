import { Router } from 'express';
import { connectSessionSSE, connectStaffSSE } from '../controllers/sseController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/session/:sessionId', connectSessionSSE);
// Note: authenticate middleware removed because EventSource doesn't support custom headers
// Authentication is handled inside connectStaffSSE using query param or cookie
router.get('/restaurant/:restaurantId/staff', connectStaffSSE);

export default router;
