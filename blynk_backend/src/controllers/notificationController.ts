import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    // Get restaurant ID from user's owned restaurant or staff membership
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurantId: string | null = null;

    // Check if user is restaurant owner
    if (user.ownedRestaurants.length > 0) {
      restaurantId = user.ownedRestaurants[0].id;
    } else {
      // Check if user is staff member (PIN login first, then email)
      if (authReq.user.staffId) {
        // PIN login: find by staffId
        const staff = await prisma.staff.findUnique({
          where: { id: authReq.user.staffId },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!restaurantId && user.email) {
        const staff = await prisma.staff.findFirst({
          where: {
            email: user.email,
            status: 'ACTIVE',
          },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
    }

    if (!restaurantId) {
      throw createError('Restaurant not found for this user', 404);
    }

    const notifications = await notificationService.getNotifications(restaurantId, limit);

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;
    const { id } = req.params;

    // Get restaurant ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurantId: string | null = null;

    if (user.ownedRestaurants.length > 0) {
      restaurantId = user.ownedRestaurants[0].id;
    } else {
      // Check if user is staff member (PIN login first, then email)
      if (authReq.user.staffId) {
        // PIN login: find by staffId
        const staff = await prisma.staff.findUnique({
          where: { id: authReq.user.staffId },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!restaurantId && user.email) {
        const staff = await prisma.staff.findFirst({
          where: {
            email: user.email,
            status: 'ACTIVE',
          },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
    }

    if (!restaurantId) {
      throw createError('Restaurant not found for this user', 404);
    }

    await notificationService.markAsRead(id, restaurantId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;

    // Get restaurant ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurantId: string | null = null;

    if (user.ownedRestaurants.length > 0) {
      restaurantId = user.ownedRestaurants[0].id;
    } else {
      // Check if user is staff member (PIN login first, then email)
      if (authReq.user.staffId) {
        // PIN login: find by staffId
        const staff = await prisma.staff.findUnique({
          where: { id: authReq.user.staffId },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!restaurantId && user.email) {
        const staff = await prisma.staff.findFirst({
          where: {
            email: user.email,
            status: 'ACTIVE',
          },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
    }

    if (!restaurantId) {
      throw createError('Restaurant not found for this user', 404);
    }

    await notificationService.markAllAsRead(restaurantId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const userId = authReq.user.userId;

    // Get restaurant ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedRestaurants: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let restaurantId: string | null = null;

    if (user.ownedRestaurants.length > 0) {
      restaurantId = user.ownedRestaurants[0].id;
    } else {
      // Check if user is staff member (PIN login first, then email)
      if (authReq.user.staffId) {
        // PIN login: find by staffId
        const staff = await prisma.staff.findUnique({
          where: { id: authReq.user.staffId },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
      
      // If not found by staffId, check by email (for Google login staff)
      if (!restaurantId && user.email) {
        const staff = await prisma.staff.findFirst({
          where: {
            email: user.email,
            status: 'ACTIVE',
          },
        });
        if (staff) {
          restaurantId = staff.restaurantId;
        }
      }
    }

    if (!restaurantId) {
      throw createError('Restaurant not found for this user', 404);
    }

    const count = await notificationService.getUnreadCount(restaurantId);

    res.json({ success: true, data: count });
  } catch (error) {
    next(error);
  }
};
