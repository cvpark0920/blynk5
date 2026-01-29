import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken } from '../utils/jwt';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    staffId?: string; // Optional: for staff/device login
  };
}

export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Authentication required', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    (req as AuthRequest).user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      staffId: payload.staffId,
    };

    next();
  } catch (error) {
    next(createError('Invalid or expired token', 401));
  }
};

export const authorize = (...roles: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(createError('Authentication required', 401));
    }

    // For cvpark0920@gmail.com, always grant PLATFORM_ADMIN access
    if (authReq.user.email === 'cvpark0920@gmail.com') {
      // Update user role in database if needed
      const { prisma } = await import('../utils/prisma');
      const user = await prisma.user.findUnique({
        where: { email: authReq.user.email },
      });
      
      if (user && user.role !== 'PLATFORM_ADMIN') {
        await prisma.user.update({
          where: { email: authReq.user.email },
          data: { role: 'PLATFORM_ADMIN' },
        });
      }
      
      // Update request user role
      authReq.user.role = 'PLATFORM_ADMIN';
    }

    if (!roles.includes(authReq.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

// Check if user is owner or manager of a restaurant
export const checkRestaurantAccess = async (
  userId: string,
  restaurantId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; isManager: boolean }> => {
  const { prisma } = await import('../utils/prisma');
  
  // Check if user is PLATFORM_ADMIN (has access to all restaurants)
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    return { hasAccess: false, isOwner: false, isManager: false };
  }
  
  if (user.role === 'PLATFORM_ADMIN') {
    return { hasAccess: true, isOwner: false, isManager: false };
  }
  
  // Check if user is restaurant owner
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      owner: true,
      staff: {
        where: {
          email: user?.email,
          status: 'ACTIVE',
        },
      },
    },
  });
  
  if (!restaurant) {
    return { hasAccess: false, isOwner: false, isManager: false };
  }
  
  const isOwner = restaurant.ownerId === userId;
  const staffMember = restaurant.staff.find((s) => s.email === user?.email);
  const isManager = staffMember?.role === 'OWNER' || staffMember?.role === 'MANAGER';
  
  return {
    hasAccess: isOwner || isManager,
    isOwner,
    isManager,
  };
};

// Check if role can access reports (MANAGER and OWNER only)
export const canAccessReports = (role: string): boolean => {
  return role === 'MANAGER' || role === 'OWNER' || role === 'PLATFORM_ADMIN' || role === 'ADMIN';
};

// Check if role can manage staff (MANAGER and OWNER only)
export const canManageStaff = (role: string): boolean => {
  return role === 'MANAGER' || role === 'OWNER' || role === 'PLATFORM_ADMIN' || role === 'ADMIN';
};
