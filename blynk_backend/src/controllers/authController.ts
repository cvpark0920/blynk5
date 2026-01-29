import { Request, Response, NextFunction, RequestHandler } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config';
import { authService } from '../services/authService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { isReservedSubdomain } from '../middleware/subdomainResolver';
import { prisma } from '../utils/prisma';
import { UserRole } from '@prisma/client';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import crypto from 'crypto';

const createStaffAuthResult = async (staffId: string) => {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff || staff.status !== 'ACTIVE') {
    throw createError('Invalid staff or inactive', 401);
  }

  const emailForUser = staff.email || `device_${staff.deviceId || staff.id}@device.local`;

  const user = await prisma.user.upsert({
    where: { email: emailForUser },
    update: { role: UserRole.ADMIN },
    create: {
      email: emailForUser,
      role: UserRole.ADMIN,
    },
  });

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    staffId: staff.id,
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    restaurantId: staff.restaurantId,
  };
};

// 서브도메인 기반 리다이렉트 URL 생성 함수
function generateRedirectUrl(
  subdomain: string | null | undefined,
  appType: string,
  restaurantId: string | undefined,
  path: string,
  tokens?: { accessToken: string; refreshToken: string },
  errorParams?: { error: string; errorMessage: string },
  requestHost?: string
): string {
  const frontendBaseUrl = config.frontend.baseUrl || 'http://localhost:3000';
  const isProd = config.nodeEnv === 'production';
  const isLocal = frontendBaseUrl.includes('localhost') || frontendBaseUrl.includes('127.0.0.1');
  
  logger.info('Generating redirect URL', {
    subdomain,
    appType,
    restaurantId,
    path,
    frontendBaseUrl,
    isLocal,
    hasTokens: !!tokens,
    hasError: !!errorParams,
  });
  
  let baseUrl: string;
  
  if (subdomain) {
    if (isProd) {
      baseUrl = `https://${subdomain}.qoodle.top`;
    } else if (isLocal) {
      const protocol = frontendBaseUrl.startsWith('https://') ? 'https' : 'http';
      const port = frontendBaseUrl.match(/:(\d+)/)?.[1];
      const portSuffix = port ? `:${port}` : '';
      baseUrl = `${protocol}://${subdomain}.localhost${portSuffix}`;
    } else {
      baseUrl = frontendBaseUrl;
    }
  } else {
    // 서브도메인이 없으면 기본 URL 사용
    baseUrl = frontendBaseUrl;
  }
  
  const params = new URLSearchParams();
  
  if (tokens) {
    params.append('accessToken', tokens.accessToken);
    params.append('refreshToken', tokens.refreshToken);
  }
  
  if (errorParams) {
    params.append('error', errorParams.error);
    params.append('errorMessage', errorParams.errorMessage);
  }
  
  const finalUrl = `${baseUrl}${path}?${params.toString()}`;
  logger.info('Generated redirect URL', { finalUrl, baseUrl, subdomain });
  
  return finalUrl;
}

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
  
  const appType = (req.query.appType as string) || 'admin';
  const restaurantId = req.query.restaurantId as string | undefined;
  const subdomainParam = req.query.subdomain as string | undefined;
  
  // 프론트엔드에서 전달된 state가 있으면 사용, 없으면 새로 생성
  let stateData: { appType: string; restaurantId?: string; subdomain?: string };
  
  if (req.query.state) {
    try {
      stateData = JSON.parse(Buffer.from(req.query.state as string, 'base64').toString());
    } catch (error) {
      stateData = { appType, restaurantId };
    }
  } else {
    stateData = { appType, restaurantId };
  }
  
  // 쿼리 파라미터에서 서브도메인 가져오기 (우선순위 1)
  if (subdomainParam && !stateData.subdomain) {
    stateData.subdomain = subdomainParam;
  }
  
  // Host 헤더에서 서브도메인 추출 (프론트엔드에서 전달되지 않은 경우)
  if (!stateData.subdomain) {
    const host = req.get('host') || '';
    const hostWithoutPort = host.split(':')[0];
    
    if (hostWithoutPort.includes('localhost')) {
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 2 && parts[0] !== 'localhost') {
        stateData.subdomain = parts[0];
      }
    } else {
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 3) {
        stateData.subdomain = parts[0];
      }
    }
    
    // Admin 앱의 경우 기본값 'admin'
    if (appType === 'admin' && !stateData.subdomain) {
      stateData.subdomain = 'admin';
    }
  }
  
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
  
  // 로그아웃 후 재로그인 시 계정 선택 화면을 강제로 표시
  // 프론트엔드에서 prompt 파라미터를 전달할 수 있도록 함
  const prompt = (req.query.prompt as string) || 'select_account';
  
  // Google OAuth URL을 직접 생성하여 prompt 파라미터를 확실하게 추가
  // passport.authenticate 대신 직접 리다이렉트하여 더 확실하게 제어
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(config.google.clientId)}&` +
    `redirect_uri=${encodeURIComponent(config.google.callbackURL)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('profile email')}&` +
    `state=${encodeURIComponent(state)}&` +
    `prompt=${encodeURIComponent(prompt)}&` +
    `access_type=offline`;
  
  logger.info('Google OAuth redirect', { 
    url: googleAuthUrl.replace(config.google.clientId, '***'),
    prompt,
    state: state.substring(0, 20) + '...'
  });
  
  return res.redirect(googleAuthUrl);
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

    // Get appType, restaurantId, subdomain from state parameter
    let appType = 'admin';
    let restaurantId: string | undefined;
    let subdomain: string | undefined;
    
    // 디버깅: 요청 정보 로그
    const host = req.get('host') || '';
    logger.info('Google OAuth callback received', {
      host,
      queryState: req.query.state,
      queryParams: Object.keys(req.query),
    });
    
    try {
      const state = req.query.state as string;
      if (state) {
        logger.info('Decoding state parameter', { stateLength: state.length });
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        logger.info('State decoded successfully', { decoded });
        appType = decoded.appType || 'admin';
        restaurantId = decoded.restaurantId;
        subdomain = decoded.subdomain;
      } else {
        logger.warn('No state parameter in callback');
      }
    } catch (error: any) {
      // Fallback to default
      logger.warn('Failed to decode state parameter', { 
        error: error?.message,
        state: req.query.state 
      });
    }
    
    logger.info('Extracted OAuth callback data', { appType, restaurantId, subdomain });
    
    // 서브도메인이 있으면 restaurantId 조회 (우선 실행)
    if (appType === 'shop' && subdomain && !restaurantId) {
      logger.info('Attempting to find restaurantId from subdomain', { subdomain });
      try {
        const restaurant = await prisma.restaurant.findUnique({
          where: { subdomain },
          select: { id: true },
        });
        if (restaurant) {
          restaurantId = restaurant.id;
          logger.info('Found restaurantId from subdomain', { subdomain, restaurantId });
        } else {
          logger.warn('Restaurant not found for subdomain', { subdomain });
        }
      } catch (error) {
        logger.error('Failed to fetch restaurant by subdomain', { error, subdomain });
      }
    }
    
    // 서브도메인이 없으면 Host 헤더에서 추출 시도
    if (!subdomain) {
      const hostWithoutPort = host.split(':')[0];
      logger.info('Attempting to extract subdomain from host', { host, hostWithoutPort });
      
      if (hostWithoutPort.includes('localhost')) {
        const parts = hostWithoutPort.split('.');
        if (parts.length >= 2 && parts[0] !== 'localhost') {
          subdomain = parts[0];
          logger.info('Extracted subdomain from localhost', { subdomain });
        }
      } else {
        const parts = hostWithoutPort.split('.');
        if (parts.length >= 3) {
          subdomain = parts[0];
          logger.info('Extracted subdomain from production', { subdomain });
        }
      }
      
      // Admin 앱의 경우 기본값 'admin'
      if (appType === 'admin' && !subdomain) {
        subdomain = 'admin';
        logger.info('Using default admin subdomain');
      }
      
      // Shop 앱의 경우 restaurantId로 서브도메인 조회 시도
      if (appType === 'shop' && restaurantId && !subdomain) {
        try {
          const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { subdomain: true },
          });
          if (restaurant?.subdomain) {
            subdomain = restaurant.subdomain;
            logger.info('Extracted subdomain from restaurant', { subdomain, restaurantId });
          }
        } catch (error) {
          logger.warn('Failed to fetch restaurant subdomain', { error, restaurantId });
        }
      }
    }
    
    logger.info('Final subdomain for redirect', { subdomain, appType, restaurantId });
    
    // Validate shop app login: user must be restaurant owner or active manager staff
    if (appType === 'shop') {
      if (!restaurantId) {
        return next(createError('식당 ID가 필요합니다.', 400));
      }

      const user = await prisma.user.findUnique({
        where: { id: result.user.id },
      });

      if (!user) {
        return next(createError('사용자를 찾을 수 없습니다.', 404));
      }

      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          ownerId: user.id,
          status: 'active',
        },
      });

      const restaurantByEmail = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          owner: {
            email: user.email,
          },
          status: 'active',
        },
      });

      const managerStaff = await prisma.staff.findFirst({
        where: {
          restaurantId,
          email: user.email,
          role: 'MANAGER',
          status: 'ACTIVE',
          isDevice: false,
        },
      });

      if (!restaurant && !restaurantByEmail && !managerStaff) {
        logger.warn(`Shop login denied: user ${user.email} is not owner or active manager of restaurant ${restaurantId}`);

        const errorMessage = '등록된 매니저 계정이 아닙니다.';
        const loginPath = subdomain && !isReservedSubdomain(subdomain)
          ? '/shop/login'
          : `/shop/restaurant/${restaurantId}/login`;

        const redirectUrl = generateRedirectUrl(
          subdomain,
          appType,
          restaurantId,
          loginPath,
          undefined,
          { error: 'unauthorized', errorMessage },
          host
        );
        logger.info('Redirecting to login with error', { redirectUrl, errorMessage, loginPath, subdomain });
        return res.redirect(redirectUrl);
      }
    }
    
    // 서브도메인 기반 리다이렉트 URL 생성
    if (appType === 'shop' && restaurantId) {
      const user = await prisma.user.findUnique({
        where: { id: result.user.id },
        select: { email: true, name: true, avatarUrl: true },
      });

      if (!user) {
        return next(createError('사용자를 찾을 수 없습니다.', 404));
      }

      const authResult = await authService.createOrUpdateUser(
        user.email,
        user.name || user.email.split('@')[0],
        undefined,
        user.avatarUrl || undefined,
        appType,
        restaurantId
      );

      const redirectUrl = generateRedirectUrl(
        subdomain,
        appType,
        restaurantId,
        `/shop`,
        { accessToken: authResult.accessToken, refreshToken: authResult.refreshToken },
        undefined,
        host
      );
      logger.info('Redirecting to shop app', { redirectUrl, subdomain, restaurantId });
      res.redirect(redirectUrl);
    } else {
      try {
        const user = await prisma.user.findUnique({
          where: { id: result.user.id },
          select: { email: true, name: true, avatarUrl: true },
        });

        if (!user) {
          return next(createError('사용자를 찾을 수 없습니다.', 404));
        }

        const authResult = await authService.createOrUpdateUser(
          user.email,
          user.name || user.email.split('@')[0],
          undefined,
          user.avatarUrl || undefined,
          appType
        );

        const redirectUrl = generateRedirectUrl(
          subdomain,
          appType,
          undefined,
          `/admin`,
          { accessToken: authResult.accessToken, refreshToken: authResult.refreshToken },
          undefined,
          host
        );
        logger.info('Redirecting to admin app', { redirectUrl, subdomain });
        res.redirect(redirectUrl);
      } catch (error: any) {
        const errorMessage = error?.message || '인증에 실패했습니다.';
        const redirectUrl = generateRedirectUrl(
          subdomain,
          appType,
          undefined,
          `/admin/login`,
          undefined,
          { error: 'unauthorized', errorMessage },
          host
        );
        logger.warn('Admin login denied', { errorMessage, redirectUrl });
        res.redirect(redirectUrl);
      }
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

export const redeemDeviceRegistrationCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, deviceId, label } = req.body;

    if (!code || !deviceId) {
      throw createError('Registration code and device ID are required', 400);
    }

    const registration = await prisma.deviceRegistrationCode.findUnique({
      where: { code: String(code).trim().toUpperCase() },
    });

    if (!registration) {
      throw createError('Invalid registration code', 400);
    }

    if (registration.usedAt) {
      throw createError('Registration code already used', 400);
    }

    if (registration.expiresAt < new Date()) {
      throw createError('Registration code expired', 400);
    }

    const restaurantId = registration.restaurantId;
    const deviceLabel = label ? String(label) : registration.label || null;

    const staff = await prisma.staff.findFirst({
      where: {
        id: registration.staffId,
        restaurantId,
        status: 'ACTIVE',
        isDevice: false,
      },
    });

    if (!staff) {
      throw createError('Staff not found or inactive', 404);
    }

    await prisma.deviceToken.updateMany({
      where: {
        restaurantId,
        deviceId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.deviceToken.create({
      data: {
        restaurantId,
        staffId: staff.id,
        deviceId,
        tokenHash,
        label: deviceLabel,
      },
    });

    await prisma.deviceRegistrationCode.update({
      where: { id: registration.id },
      data: {
        usedAt: new Date(),
        usedByDeviceId: deviceId,
      },
    });

    const authResult = await createStaffAuthResult(staff.id);

    res.json({
      success: true,
      data: {
        deviceToken: rawToken,
        ...authResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exchangeDeviceToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { deviceToken, deviceId } = req.body;

    if (!deviceToken || !deviceId) {
      throw createError('Device token and device ID are required', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(String(deviceToken)).digest('hex');

    const tokenRecord = await prisma.deviceToken.findFirst({
      where: {
        tokenHash,
        deviceId,
        revokedAt: null,
      },
    });

    if (!tokenRecord) {
      throw createError('Invalid device token', 401);
    }

    await prisma.deviceToken.update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    });

    const authResult = await createStaffAuthResult(tokenRecord.staffId);

    res.json({ success: true, data: authResult });
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

    // If this is a staff/device login (has staffId), include staff information
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

