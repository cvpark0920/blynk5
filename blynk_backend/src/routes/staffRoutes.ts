import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getTables,
  updateTableStatus,
  resetTable,
  createTable,
  updateTable,
  deleteTable,
  updateTableGuestCount,
  getOrders,
  updateOrderStatus,
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory,
  updateCategory,
  deleteCategory,
  getWaitingList,
  addToWaitingList,
  updateWaitingListStatus,
  getStaffList,
  getMyRestaurant,
  createStaff,
  updateStaff,
  deleteStaff,
  createDeviceRegistrationCode,
  getDeviceTokens,
  revokeDeviceToken,
  getPaymentMethods,
  updatePaymentMethods,
  generateQRCode,
  getSalesReport,
  getSalesHistory,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  getNotificationPreferences,
  updateNotificationPreferences,
  uploadSplashImage,
  deleteSplashImage,
  uploadPromotionImage,
} from '../controllers/staffController';
import { sendMessage, getChatHistory, getChatReadStatus, markChatRead } from '../controllers/chatController';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../controllers/notificationController';
import {
  getQuickChipTemplates,
  getRestaurantQuickChips,
  createRestaurantQuickChip,
  updateRestaurantQuickChip,
  deleteRestaurantQuickChip,
  reorderRestaurantQuickChips,
} from '../controllers/staffQuickChipController';
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../controllers/promotionController';
import multer from 'multer';
import { config } from '../config';

const router = Router();

// Multer 설정 (이미지 업로드용)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxSize },
});

// All staff routes require authentication
router.use(authenticate);
// Note: authorize middleware removed - each controller handles its own authorization
// Staff/device tokens include staffId in token, so they can access endpoints
// Controllers check for OWNER/MANAGER staff roles or restaurant ownership

router.get('/my-restaurant', getMyRestaurant);
router.get('/payment-methods', getPaymentMethods);
router.put('/payment-methods', updatePaymentMethods);
router.post('/generate-qr', generateQRCode);
router.get('/reports/sales', getSalesReport);
router.get('/reports/sales-history', getSalesHistory);
router.get('/push/vapid-public-key', getVapidPublicKey);
router.post('/push/subscribe', subscribePush);
router.post('/push/unsubscribe', unsubscribePush);
router.get('/tables', getTables);
router.post('/tables', createTable);
router.put('/tables/:tableId', updateTableStatus);
router.put('/tables/:tableId/reset', resetTable);
router.put('/tables/:tableId/info', updateTable);
router.put('/tables/:tableId/guests', updateTableGuestCount);
router.delete('/tables/:tableId', deleteTable);
router.get('/orders', getOrders);
router.put('/orders/:orderId/status', updateOrderStatus);
router.get('/menu', getMenu);
router.post('/menu', createMenuItem);
router.put('/menu/:itemId', updateMenuItem);
router.delete('/menu/:itemId', deleteMenuItem);
router.post('/menu/categories', createCategory);
router.put('/menu/categories/:categoryId', updateCategory);
router.delete('/menu/categories/:categoryId', deleteCategory);
router.get('/waiting-list', getWaitingList);
router.post('/waiting-list', addToWaitingList);
router.put('/waiting-list/:id', updateWaitingListStatus);
router.post('/chat', sendMessage);
router.get('/chat/read-status', getChatReadStatus);
router.post('/chat/:sessionId/read', markChatRead);
router.get('/chat/:sessionId', getChatHistory);
router.get('/notification-preferences', getNotificationPreferences);
router.put('/notification-preferences', updateNotificationPreferences);

// Notification routes
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount); // Put before dynamic routes
router.post('/notifications/:id/read', markNotificationRead);
router.post('/notifications/mark-all-read', markAllNotificationsRead);

// Quick Chip routes (OWNER/MANAGER only, checked in controller)
router.get('/quick-chips/templates', getQuickChipTemplates);
router.get('/quick-chips', getRestaurantQuickChips);
router.post('/quick-chips', createRestaurantQuickChip);
router.put('/quick-chips/:id', updateRestaurantQuickChip);
router.delete('/quick-chips/:id', deleteRestaurantQuickChip);
router.post('/quick-chips/reorder', reorderRestaurantQuickChips);

// Staff management routes
router.get('/restaurant/:restaurantId/staff-list', getStaffList);
router.post('/restaurant/:restaurantId/staff', createStaff);
router.put('/restaurant/:restaurantId/staff/:staffId', updateStaff);
router.delete('/restaurant/:restaurantId/staff/:staffId', deleteStaff);
router.post('/restaurant/:restaurantId/device-registration-codes', createDeviceRegistrationCode);
router.get('/restaurant/:restaurantId/device-tokens', getDeviceTokens);
router.post('/restaurant/:restaurantId/device-tokens/:deviceTokenId/revoke', revokeDeviceToken);

// Promotion routes (OWNER/MANAGER only, checked in controller)
router.get('/restaurant/:restaurantId/promotions', getPromotions);
router.post('/restaurant/:restaurantId/promotions', createPromotion);
router.put('/restaurant/:restaurantId/promotions/:promotionId', updatePromotion);
router.delete('/restaurant/:restaurantId/promotions/:promotionId', deletePromotion);

// Splash image routes (OWNER/MANAGER only, checked in controller)
router.post('/restaurant/:restaurantId/splash-image', upload.single('image'), uploadSplashImage);
router.delete('/restaurant/:restaurantId/splash-image', deleteSplashImage);

// Promotion image routes (OWNER/MANAGER only, checked in controller)
router.post('/restaurant/:restaurantId/promotion-image', upload.single('image'), uploadPromotionImage);

export default router;
