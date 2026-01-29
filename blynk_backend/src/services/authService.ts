import { UserRole } from '@prisma/client';
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
  restaurantId?: string; // Optional: included for shop staff/device login
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

    // 3. 관리자 앱 로그인 처리
    if (appType === 'admin') {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      const isAdminUser =
        existingUser?.role === UserRole.ADMIN || existingUser?.role === UserRole.PLATFORM_ADMIN;

      const ownedRestaurant = await prisma.restaurant.findFirst({
        where: {
          status: 'active',
          OR: [
            { owner: { email } },
            ...(existingUser ? [{ ownerId: existingUser.id }] : []),
          ],
        },
        select: { id: true },
      });

      const staff = await prisma.staff.findFirst({
        where: {
          email,
          role: { in: ['OWNER', 'MANAGER'] },
          status: 'ACTIVE',
          isDevice: false,
        },
      });

      if (!isAdminUser && !staff && !ownedRestaurant) {
        throw new Error('관리자 권한이 없습니다.');
      }

      const nextRole = existingUser?.role === UserRole.PLATFORM_ADMIN
        ? UserRole.PLATFORM_ADMIN
        : UserRole.ADMIN;

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: name || undefined,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
          role: nextRole,
        },
        create: {
          email,
          name,
          avatarUrl,
          role: nextRole,
        },
      });

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        staffId: staff?.id,
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
        restaurantId: staff?.restaurantId ?? ownedRestaurant?.id ?? undefined,
      };
    }

    // 4. 일반 사용자 처리
    // shop 앱 로그인인 경우, 등록된 매니저 직원만 허용
    if (appType === 'shop') {
      if (!restaurantId) {
        throw new Error('식당 정보를 확인할 수 없습니다. 다시 시도해주세요.');
      }

      const staff = await prisma.staff.findFirst({
        where: {
          restaurantId,
          email,
          role: 'MANAGER',
          status: 'ACTIVE',
          isDevice: false,
        },
      });

      if (!staff) {
        throw new Error('등록된 매니저 계정이 아닙니다. 대표에게 문의해주세요.');
      }

      const staffRecord = await prisma.staff.update({
        where: { id: staff.id },
        data: {
          name: name || staff.name,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : staff.avatarUrl,
          status: 'ACTIVE',
        },
      });

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
        staffId: staffRecord.id,
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
        restaurantId: staffRecord.restaurantId,
      };
    }

    // For customer app (not shop/admin), create CUSTOMER role user
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

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const { verifyToken } = await import('../utils/jwt');
    const payload = verifyToken(refreshToken);

    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      staffId: payload.staffId,
    });

    return { accessToken: newAccessToken };
  }
}

export const authService = new AuthService();
