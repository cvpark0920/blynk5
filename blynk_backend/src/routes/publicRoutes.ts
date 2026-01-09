import { Router } from 'express';
import { getRestaurantPublic, getStaffListPublic, getBanks } from '../controllers/publicController';

const router = Router();

// Public routes (no authentication required)
router.get('/restaurant/:restaurantId', getRestaurantPublic);
router.get('/restaurant/:restaurantId/staff-list', getStaffListPublic);
router.get('/banks', getBanks);

export default router;
