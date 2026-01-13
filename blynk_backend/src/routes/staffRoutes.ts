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
  setStaffPin,
  setPosPin,
  getMyRestaurant,
  createStaff,
  updateStaff,
  deleteStaff,
  getPaymentMethods,
  updatePaymentMethods,
  generateQRCode,
  getSalesReport,
  getSalesHistory,
} from '../controllers/staffController';
import { sendMessage, getChatHistory } from '../controllers/chatController';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../controllers/notificationController';

const router = Router();

// All staff routes require authentication
router.use(authenticate);
// Note: authorize middleware removed - each controller handles its own authorization
// PIN-logged-in staff have staffId in token, so they can access endpoints
// Controllers check for OWNER/MANAGER staff roles or restaurant ownership

router.get('/my-restaurant', getMyRestaurant);
router.get('/payment-methods', getPaymentMethods);
router.put('/payment-methods', updatePaymentMethods);
router.post('/generate-qr', generateQRCode);
router.get('/reports/sales', getSalesReport);
router.get('/reports/sales-history', getSalesHistory);
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
router.get('/chat/:sessionId', getChatHistory);

// Notification routes
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount); // Put before dynamic routes
router.post('/notifications/:id/read', markNotificationRead);
router.post('/notifications/mark-all-read', markAllNotificationsRead);

// Staff management routes
router.get('/restaurant/:restaurantId/staff-list', getStaffList);
router.post('/restaurant/:restaurantId/staff', createStaff);
router.put('/restaurant/:restaurantId/staff/:staffId', updateStaff);
router.delete('/restaurant/:restaurantId/staff/:staffId', deleteStaff);
router.post('/restaurant/:restaurantId/staff/:staffId/pin', setStaffPin);
router.post('/restaurant/:restaurantId/pos-pin', setPosPin);

export default router;
