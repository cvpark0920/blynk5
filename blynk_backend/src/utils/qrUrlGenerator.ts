/**
 * QR 코드 URL 생성 유틸리티
 * 서브도메인 기반 또는 기존 형식으로 URL 생성
 */

import { Restaurant } from '@prisma/client';

/**
 * 테이블 QR 코드 URL 생성
 * 서브도메인 방식으로만 생성 (서브도메인 필수)
 */
export function generateTableQRUrl(
  restaurant: Pick<Restaurant, 'id' | 'subdomain'>,
  tableNumber: number,
  frontendBaseUrl?: string
): string {
  // 서브도메인이 없으면 에러 발생
  const subdomain = restaurant.subdomain;
  if (!subdomain) {
    throw new Error(`Restaurant ${restaurant.id} does not have a subdomain configured. Subdomain is required for QR code generation.`);
  }
  
  const baseUrl = frontendBaseUrl || process.env.FRONTEND_BASE_URL || 'https://qoodle.top';
  const protocol = baseUrl.startsWith('https://') ? 'https' : 'http';
  const basePort = baseUrl.match(/:(\d+)/)?.[1];
  const portSuffix = basePort ? `:${basePort}` : '';
  
  // 서브도메인 기반 URL 생성
  // 프로덕션: https://shop_1.qoodle.top/customer/table/1
  // 개발: http://shop_1.localhost:3000/customer/table/1
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return `${protocol}://${subdomain}.localhost${portSuffix}/customer/table/${tableNumber}`;
  }
  return `https://${subdomain}.qoodle.top/customer/table/${tableNumber}`;
}

/**
 * Shop 앱 로그인 URL 생성
 */
export function generateShopLoginUrl(
  restaurant: Pick<Restaurant, 'id' | 'subdomain'>,
  frontendBaseUrl?: string
): string {
  const baseUrl = frontendBaseUrl || process.env.FRONTEND_BASE_URL || 'https://qoodle.top';
  const protocol = baseUrl.startsWith('https://') ? 'https' : 'http';
  const basePort = baseUrl.match(/:(\d+)/)?.[1];
  const portSuffix = basePort ? `:${basePort}` : '';
  
  const subdomain = restaurant.subdomain;
  if (subdomain) {
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      return `${protocol}://${subdomain}.localhost${portSuffix}/shop/login`;
    }
    return `https://${subdomain}.qoodle.top/shop/login`;
  }
  
  return `${baseUrl}/shop/restaurant/${restaurant.id}/login`;
}
