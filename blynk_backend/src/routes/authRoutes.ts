import { Router, RequestHandler } from 'express';
import {
  googleAuth,
  googleCallback,
  refreshToken,
  getMe,
  logout,
  redeemDeviceRegistrationCode,
  exchangeDeviceToken,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/google', googleAuth as RequestHandler);
router.get('/google/callback', googleCallback);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/device/redeem', redeemDeviceRegistrationCode);
router.post('/device/token', exchangeDeviceToken);

export default router;
