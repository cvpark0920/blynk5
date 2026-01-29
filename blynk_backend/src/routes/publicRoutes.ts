import { Router } from 'express';
import { getRestaurantPublic, getBanks, getQuickChipsPublic } from '../controllers/publicController';

const router = Router();

// Public routes (no authentication required)
// 서브도메인 기반인 경우 restaurantId 없이 호출 가능
// Express의 optional 파라미터는 제대로 작동하지 않을 수 있으므로 두 개의 라우트로 분리
router.get('/restaurant', getRestaurantPublic); // 서브도메인 기반
router.get('/restaurant/:restaurantId', getRestaurantPublic); // 기존 형식
router.get('/banks', getBanks);
router.get('/quick-chips', getQuickChipsPublic);

export default router;
