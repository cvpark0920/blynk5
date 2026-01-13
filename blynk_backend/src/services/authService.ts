import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
  restaurantId?: string; // Optional: included for PIN login
}

export class AuthService {
  async createOrUpdateUser(
    email: string,
    name: string,
    _googleId?: string,
    avatarUrl?: string,
    appType?: string,
    restaurantId?: string
  ): Promise<AuthResult> {
    // 1. 슈퍼 관리자 체크
    if (email === 'cvpark0920@gmail.com') {
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatarUrl,
            role: UserRole.PLATFORM_ADMIN,
          },
        });
      } else {
        // 역할 및 프로필 정보 업데이트 (Google OAuth에서 받은 정보로 업데이트)
        user = await prisma.user.update({
          where: { email },
          data: { 
            role: UserRole.PLATFORM_ADMIN,
            name: name || user.name,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl, // Google에서 받은 경우 업데이트
          },
        });
      }

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    }

    // 2. 상점 대표 체크
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        owner: { email },
        status: 'active',
      },
      include: { owner: true },
    });

    if (restaurant) {
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatarUrl,
            role: UserRole.ADMIN,
          },
        });
      } else {
        // 역할 및 프로필 정보 업데이트 (Google OAuth에서 받은 정보로 업데이트)
        user = await prisma.user.update({
          where: { email },
          data: {
            name: name || user.name,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl, // Google에서 받은 경우 업데이트
            role: UserRole.ADMIN, // Restaurant owner always has ADMIN role
          },
        });
      }

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    }

    // 3. 일반 사용자 처리
    // shop 앱 로그인인 경우, 식당 owner나 staff가 아니면 에러 반환
    if (appType === 'shop') {
      // Check if user is staff member of the restaurant
      if (restaurantId) {
        const staff = await prisma.staff.findFirst({
          where: {
            email: email,
            restaurantId: restaurantId,
            status: 'ACTIVE',
          },
        });
        
        if (staff) {
          // Staff member - create user with ADMIN role and include staffId in token
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name,
                avatarUrl,
                role: UserRole.ADMIN,
              },
            });
          } else {
            // Staff member always has ADMIN role
            user = await prisma.user.update({
              where: { email },
              data: {
                name: name || user.name,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
                role: UserRole.ADMIN,
              },
            });
          }

          const payload: TokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            staffId: staff.id, // Include staffId for staff login
          };

          const accessToken = generateAccessToken(payload);
          const refreshToken = generateRefreshToken(payload);

          return {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
            },
            accessToken,
            refreshToken,
            restaurantId: staff.restaurantId,
          };
        }
      }
      
      // If shop app login but not owner or staff, reject
      throw new Error('식당 주인이나 직원만 로그인할 수 있습니다. 일반 고객은 고객 앱을 사용해주세요.');
    }

    // For admin app or customer app (not shop app), create CUSTOMER role user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl,
          role: UserRole.CUSTOMER,
        },
      });
    } else {
      // 프로필 정보 업데이트 (Google OAuth에서 받은 정보로 업데이트)
      user = await prisma.user.update({
        where: { email },
        data: {
          name: name || user.name,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl, // Google에서 받은 경우 업데이트
        },
      });
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async loginWithPin(staffId: string, pinCode: string): Promise<AuthResult> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { restaurant: true },
    });

    if (!staff || staff.status !== 'ACTIVE') {
      throw new Error('Invalid staff or inactive');
    }

    if (!staff.pinCodeHash) {
      throw new Error('PIN code not set');
    }

    const isValid = await bcrypt.compare(pinCode, staff.pinCodeHash);
    if (!isValid) {
      throw new Error('Invalid PIN code');
    }

    // Create or get user for staff (only if email exists)
    // For staff without email, create a temporary user with staff ID as email
    let user = null;
    const emailForUser = staff.email || `staff_${staff.id}@temp.local`;
    
    user = await prisma.user.findUnique({
      where: { email: emailForUser },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: emailForUser,
          role: UserRole.ADMIN,
        },
      });
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      staffId: staff.id, // Include staffId in token for PIN login
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
      restaurantId: staff.restaurantId, // Include restaurantId for PIN login
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const { verifyToken } = await import('../utils/jwt');
    const payload = verifyToken(refreshToken);

    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      staffId: payload.staffId, // Include staffId if present (for PIN login)
    });

    return { accessToken: newAccessToken };
  }
}

export const authService = new AuthService();
