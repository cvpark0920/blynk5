import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { restaurantService } from '../services/restaurantService';
import { categoryRegionService } from '../services/categoryRegionService';
import {
  getQuickChips,
  getQuickChipById,
  createQuickChip,
  updateQuickChip,
  deleteQuickChip,
  reorderQuickChips,
} from '../controllers/quickChipController';
import { uploadNotificationSound } from '../controllers/adminUploadController';
import multer from 'multer';
import { config } from '../config';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxSize },
});

// All admin routes require authentication and platform admin role
router.use(authenticate);
router.use(authorize('PLATFORM_ADMIN'));

router.get('/restaurants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await restaurantService.getRestaurants();
    res.json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
});

router.post('/restaurants', async (req, res, next) => {
  try {
    const restaurant = await restaurantService.createRestaurant(req.body);
    res.status(201).json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
});

router.get('/restaurants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { prisma } = await import('../utils/prisma');
    const { config } = await import('../config');
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            tables: true,
            staff: true,
          },
        },
      },
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, error: { message: 'Restaurant not found' } });
    }
    // Add shopManagerUrl to restaurant data
    const restaurantWithUrl = {
      ...restaurant,
      shopManagerUrl: `${config.frontend.shopUrl}/restaurant/${restaurant.id}/login`,
    };
    return res.json({ success: true, data: restaurantWithUrl });
  } catch (error) {
    return next(error);
  }
});

router.put('/restaurants/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant = await restaurantService.updateRestaurant(id, req.body);
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/restaurants/:id/notification-sound',
  upload.single('file'),
  uploadNotificationSound
);

router.delete('/restaurants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { prisma } = await import('../utils/prisma');
    await prisma.restaurant.delete({
      where: { id },
    });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/restaurants/:restaurantId/tables', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { tableService } = await import('../services/tableService');
    const tables = await tableService.getTablesByRestaurant(restaurantId);
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../utils/prisma');
    
    const [restaurantCount, orderCount, userCount] = await Promise.all([
      prisma.restaurant.count(),
      prisma.order.count(),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: {
        restaurantCount,
        orderCount,
        userCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Category routes
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoryRegionService.getCategories();
    return res.json({ success: true, data: categories });
  } catch (error) {
    return next(error);
  }
});

router.post('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await categoryRegionService.createCategory(req.body);
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    return next(error);
  }
});

router.put('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const category = await categoryRegionService.updateCategory(id, req.body);
    return res.json({ success: true, data: category });
  } catch (error) {
    return next(error);
  }
});

router.delete('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await categoryRegionService.deleteCategory(id);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// Region routes
router.get('/regions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await categoryRegionService.getRegions();
    return res.json({ success: true, data: regions });
  } catch (error) {
    return next(error);
  }
});

router.post('/regions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = await categoryRegionService.createRegion(req.body);
    return res.status(201).json({ success: true, data: region });
  } catch (error) {
    return next(error);
  }
});

router.put('/regions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const region = await categoryRegionService.updateRegion(id, req.body);
    return res.json({ success: true, data: region });
  } catch (error) {
    return next(error);
  }
});

router.delete('/regions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await categoryRegionService.deleteRegion(id);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// Quick Chip routes
router.get('/quick-chips', getQuickChips);
router.get('/quick-chips/:id', getQuickChipById);
router.post('/quick-chips', createQuickChip);
router.put('/quick-chips/:id', updateQuickChip);
router.delete('/quick-chips/:id', deleteQuickChip);
router.post('/quick-chips/reorder', reorderQuickChips);

export default router;
