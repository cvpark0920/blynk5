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

          const result = await authService.createOrUpdateUser(
            email,
            name,
            profile.id,
            avatarUrl
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

    const user = await prisma.user.findUnique({
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

    if (!user) {
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

    res.json({ 
      success: true, 
      data: {
        ...user,
        staff: staffData, // Include staff info if available
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
