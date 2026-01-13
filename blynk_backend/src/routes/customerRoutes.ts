import { Router } from 'express';
import {
  getRestaurantByQrCode,
  getMenu,
  createSession,
  createOrder,
  getOrder,
  getSession,
  getBill,
  getTableByNumber,
  completePayment,
  getPaymentMethodsPublic,
  generateQRCodeForCustomer,
} from '../controllers/customerController';
import { sendMessage, getChatHistory } from '../controllers/chatController';

const router = Router();

router.get('/restaurant/:qrCode', getRestaurantByQrCode);
router.get('/menu/:restaurantId', getMenu);
router.get('/restaurant/:restaurantId/tables/:tableNumber', getTableByNumber);
router.get('/payment-methods/:restaurantId', getPaymentMethodsPublic);
router.post('/generate-qr', generateQRCodeForCustomer);
router.post('/session', createSession);
router.post('/orders', createOrder);
router.get('/orders/:orderId', getOrder);
router.get('/session/:sessionId', getSession);
router.get('/bill/:sessionId', getBill);
router.post('/payment/complete', completePayment);
router.post('/chat', sendMessage);
router.get('/chat/:sessionId', getChatHistory);

export default router;
