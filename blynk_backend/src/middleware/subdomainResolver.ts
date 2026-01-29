import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Host 헤더에서 서브도메인 추출
 * 예: shop_1.qoodle.top → shop_1
 *     shop_1.localhost:3000 → shop_1
 */
function extractSubdomain(host: string): string | null {
  if (!host) return null;
  
  // 포트 제거
  const hostWithoutPort = host.split(':')[0];
  
  // localhost인 경우 (개발 환경)
  // shop_1.localhost 또는 shop_1.localhost:3000 형식
  if (hostWithoutPort.includes('localhost')) {
    const parts = hostWithoutPort.split('.');
    // shop_1.localhost → ['shop_1', 'localhost']
    // localhost → ['localhost']
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[parts.length - 1] === 'localhost') {
      return parts[0]; // shop_1.localhost → shop_1
    }
    return null;
  }
  
  // 프로덕션 환경: qoodle.top 도메인
  // shop_1.qoodle.top 형식
  const parts = hostWithoutPort.split('.');
  if (parts.length >= 3) {
    // shop_1.qoodle.top → shop_1
    return parts[0];
  }
  
  return null;
}

/**
 * 예약된 서브도메인 체크
 * 예약된 서브도메인은 식당 서브도메인으로 사용할 수 없음
 */
export function isReservedSubdomain(subdomain: string | null): boolean {
  if (!subdomain) return false;
  
  const reserved = ['admin', 'qr', 'www', 'api', 'mail', 'ftp', 'localhost'];
  return reserved.includes(subdomain.toLowerCase());
}

/**
 * 서브도메인 리졸버 미들웨어
 * 요청의 Host 헤더에서 서브도메인을 추출하고 식당 정보를 req에 추가
 */
export const resolveSubdomain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 개발 환경: 쿼리 파라미터로 서브도메인 전달 가능
    const querySubdomain = req.query.subdomain as string | undefined;
    const envSubdomain = process.env.DEV_SUBDOMAIN;
    const host = req.get('host') || '';
    const path = req.path;
    
    // 모든 요청에 대해 로그 출력 (디버깅용)
    logger.info('Subdomain resolver called', { host, path, method: req.method });
    
    let subdomain: string | null = null;
    
    // 우선순위: 쿼리 파라미터 > 환경 변수 > Host 헤더
    if (querySubdomain) {
      subdomain = querySubdomain;
      logger.info('Subdomain from query param', { subdomain, host, path });
    } else if (envSubdomain && process.env.NODE_ENV === 'development') {
      subdomain = envSubdomain;
      logger.info('Subdomain from env var', { subdomain, host, path });
    } else {
      subdomain = extractSubdomain(host);
      if (subdomain) {
        logger.info('Subdomain extracted from host', { subdomain, host, path });
      } else {
        logger.info('No subdomain extracted', { host, path });
      }
    }
    
    // 서브도메인이 없거나 예약된 경우는 다음 미들웨어로 진행
    if (!subdomain) {
      logger.info('No subdomain extracted', { host, path: req.path });
      return next();
    }
    
    if (isReservedSubdomain(subdomain)) {
      logger.info('Reserved subdomain, skipping resolution', { subdomain, host, path: req.path });
      return next();
    }
    
    // 데이터베이스에서 식당 조회
    const restaurant = await prisma.restaurant.findUnique({
      where: { subdomain },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    
    if (restaurant) {
      req.subdomain = subdomain;
      req.restaurantId = restaurant.id;
      req.restaurant = restaurant;
      
      logger.info('Subdomain resolved', {
        subdomain,
        restaurantId: restaurant.id,
        restaurantName: restaurant.nameKo,
        host: req.get('host'),
      });
    } else if (subdomain && !isReservedSubdomain(subdomain)) {
      logger.warn('Restaurant not found for subdomain', { 
        subdomain,
        host: req.get('host'),
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error resolving subdomain', { error });
    // 에러가 발생해도 다음 미들웨어로 진행 (서브도메인이 없는 경우로 처리)
    next();
  }
};
