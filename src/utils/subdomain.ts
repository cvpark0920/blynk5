/**
 * 서브도메인 유틸리티 함수
 * 브라우저 환경에서 서브도메인을 추출하는 함수들
 */

/**
 * 현재 호스트에서 서브도메인 추출
 * 예: shop_1.qoodle.top → shop_1
 *     shop_1.localhost:3000 → shop_1
 */
export function getSubdomainFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  
  const host = window.location.host;
  const hostWithoutPort = host.split(':')[0];
  
  // localhost인 경우 (개발 환경)
  if (hostWithoutPort.includes('localhost')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0]; // shop_1.localhost → shop_1
    }
    return null;
  }
  
  // 프로덕션 환경: qoodle.top 도메인
  const parts = hostWithoutPort.split('.');
  if (parts.length >= 3) {
    // shop_1.qoodle.top → shop_1
    return parts[0];
  }
  
  return null;
}

/**
 * 쿼리 파라미터에서 서브도메인 가져오기 (개발 환경용)
 */
export function getSubdomainFromQuery(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('subdomain');
}

/**
 * 환경 변수에서 서브도메인 가져오기 (개발 환경용)
 */
export function getSubdomainFromEnv(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Vite 환경 변수는 import.meta.env로 접근
  const envSubdomain = import.meta.env.VITE_DEV_SUBDOMAIN;
  return envSubdomain || null;
}

/**
 * 서브도메인 가져오기 (우선순위: 쿼리 파라미터 > 환경 변수 > Host 헤더)
 */
export function getSubdomain(): string | null {
  // 개발 환경: 쿼리 파라미터 우선
  const querySubdomain = getSubdomainFromQuery();
  if (querySubdomain) return querySubdomain;
  
  // 개발 환경: 환경 변수
  const envSubdomain = getSubdomainFromEnv();
  if (envSubdomain) return envSubdomain;
  
  // Host 헤더에서 추출
  return getSubdomainFromHost();
}

/**
 * 예약된 서브도메인 체크
 * admin은 실제 서브도메인으로 사용되므로 제외
 */
export function isReservedSubdomain(subdomain: string | null): boolean {
  if (!subdomain) return false;
  
  const reserved = ['qr', 'www', 'api', 'mail', 'ftp', 'localhost'];
  return reserved.includes(subdomain.toLowerCase());
}
