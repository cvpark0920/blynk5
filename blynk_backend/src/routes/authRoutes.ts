import { Router, RequestHandler } from 'express';
import {
  googleAuth,
  googleCallback,
  refreshToken,
  getMe,
  logout,
  loginWithPin,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/google', googleAuth as RequestHandler);
router.get('/google/callback', googleCallback);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/pin', loginWithPin);

export default router;
