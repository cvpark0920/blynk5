import { Request, Response, NextFunction, RequestHandler } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config';
import { authService } from '../services/authService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Configure Google OAuth Strategy (only if credentials are provided)
if (config.google.clientId && config.google.clientSecret && 
    config.google.clientId.trim() !== '' && config.google.clientSecret.trim() !== '') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || '';
          const avatarUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found'), undefined);
          }

          logger.info(`Google OAuth login: email=${email}, name=${name}, avatarUrl=${avatarUrl ? 'present' : 'missing'}`);

          // Get appType and restaurantId from state parameter (passed from googleAuth)
          let appType: string | undefined;
          let restaurantId: string | undefined;
          try {
            // Note: state is passed through passport, we need to get it from the request
            // For now, we'll pass it through a different mechanism or check in callback
            // This is a limitation - passport doesn't easily pass state to the verify callback
            // We'll handle validation in the callback instead
          } catch (error) {
            // Ignore
          }

          const result = await authService.createOrUpdateUser(
            email,
            name,
            profile.id,
            avatarUrl,
            appType,
            restaurantId
          );

          return done(null, result);
        } catch (error: any) {
          logger.error('Google OAuth error', { 
            error: error?.message || String(error),
            stack: error?.stack 
          });
          return done(error, undefined);
        }
      }
    )
  );
  logger.info('Google OAuth strategy configured');
} else {
  logger.warn('Google OAuth credentials not provided. Google OAuth will be disabled.');
}

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export const googleAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!config.google.clientId || !config.google.clientSecret || 
      config.google.clientId.trim() === '' || config.google.clientSecret.trim() === '') {
    return next(createError('Google OAuth is not configured', 503));
  }
  
  // Store appType and restaurantId in state parameter for callback
  const appType = (req.query.appType as string) || 'admin';
  const restaurantId = req.query.restaurantId as string | undefined;
  const state = Buffer.from(JSON.stringify({ appType, restaurantId })).toString('base64');
  
  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state,
  })(req, res, next);
};

export const googleCallback: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!config.google.clientId || !config.google.clientSecret || 
      config.google.clientId.trim() === '' || config.google.clientSecret.trim() === '') {
    return next(createError('Google OAuth is not configured', 503));
  }
  
  return passport.authenticate('google', async (err: Error, result: any) => {
    if (err) {
      return next(createError(err.message, 401));
    }

    if (!result) {
      return next(createError('Authentication failed', 401));
    }

    // Get appType and restaurantId from state parameter
    let appType = 'admin';
    let restaurantId: string | undefined;
    try {
      const state = req.query.state as string;
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        appType = decoded.appType || 'admin';
        restaurantId = decoded.restaurantId;
      }
    } catch (error) {
      // Fallback to default
      logger.warn('Failed to decode state parameter, using default appType');
    }
    
    // Validate shop app login: user must be restaurant owner or staff
    if (appType === 'shop') {
      if (!restaurantId) {
        return next(createError('식당 ID가 필요합니다.', 400));
      }
      
      // Check if user is restaurant owner or staff
      const user = await prisma.user.findUnique({
        where: { id: result.user.id },
      });
      
      if (!user) {
        return next(createError('사용자를 찾을 수 없습니다.', 404));
      }
      
      // Check if user is restaurant owner
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          ownerId: user.id,
          status: 'active',
        },
      });
      
      // Check if user is staff member
      const staff = await prisma.staff.findFirst({
        where: {
          email: user.email,
          restaurantId: restaurantId,
          status: 'ACTIVE',
        },
      });
      
      if (!restaurant && !staff) {
        // Also check by email in case ownerId is not set correctly
        const restaurantByEmail = await prisma.restaurant.findFirst({
          where: {
            id: restaurantId,
            owner: {
              email: user.email,
            },
            status: 'active',
          },
        });
        
        if (!restaurantByEmail && !staff) {
          logger.warn(`Shop login denied: user ${user.email} is not owner or staff of restaurant ${restaurantId}`);
          return next(createError('식당 주인이나 직원만 로그인할 수 있습니다.', 403));
        }
      }
    }
    
    // Use single port base URL
    const baseUrl = config.frontend.baseUrl || 'http://localhost:5173';
    
    // Redirect to frontend with tokens
    // For shop app, redirect to restaurant-specific URL
    if (appType === 'shop' && restaurantId) {
      res.redirect(
        `${baseUrl}/shop/restaurant/${restaurantId}/dashboard?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`
      );
    } else {
      // For admin app, redirect to admin path
      res.redirect(
        `${baseUrl}/admin?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`
      );
    }
  })(req, res, next);
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError('Refresh token required', 400);
    }

    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    // Try to find user by ID first
    let user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    // If user not found by ID, try to find by email (fallback)
    if (!user && authReq.user.email) {
      logger.warn(`User not found by ID ${authReq.user.userId}, trying email ${authReq.user.email}`);
      user = await prisma.user.findUnique({
        where: { email: authReq.user.email },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });
    }

    if (!user) {
      logger.error(`User not found: userId=${authReq.user.userId}, email=${authReq.user.email}`);
      throw createError('User not found', 404);
    }

    // If this is a PIN login (has staffId), include staff information
    let staffData = null;
    if (authReq.user.staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: authReq.user.staffId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          phone: true,
          restaurantId: true,
        },
      });
      if (staff) {
        staffData = {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          avatarUrl: staff.avatarUrl,
          phone: staff.phone,
          restaurantId: staff.restaurantId,
        };
      }
    }

    // Check if user is a restaurant owner (for Google login)
    // Only ADMIN role can be restaurant owner
    let ownerRestaurantId = null;
    if (user.role === 'ADMIN' && !staffData) {
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          ownerId: user.id,
          status: 'active',
        },
        select: {
          id: true,
        },
      });
      if (restaurant) {
        ownerRestaurantId = restaurant.id;
        logger.info(`Found owner restaurant for user ${user.email}: ${ownerRestaurantId}`);
      } else {
        // Also check by email in case ownerId is not set correctly
        const restaurantByEmail = await prisma.restaurant.findFirst({
          where: {
            owner: {
              email: user.email,
            },
            status: 'active',
          },
          select: {
            id: true,
          },
        });
        if (restaurantByEmail) {
          ownerRestaurantId = restaurantByEmail.id;
          logger.info(`Found owner restaurant by email for user ${user.email}: ${ownerRestaurantId}`);
        }
      }
    }

    res.json({ 
      success: true, 
      data: {
        ...user,
        staff: staffData, // Include staff info if available
        ownerRestaurantId: ownerRestaurantId, // Include restaurant ID if user is owner
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // In a real app, you might want to blacklist the token in Redis
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const loginWithPin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId, pinCode } = req.body;

    if (!staffId || !pinCode) {
      throw createError('Staff ID and PIN code required', 400);
    }

    const result = await authService.loginWithPin(staffId, pinCode);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
