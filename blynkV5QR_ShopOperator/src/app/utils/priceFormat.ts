/**
 * 베트남 동(VND) 형식으로 가격을 포맷팅하는 유틸리티 함수
 * 
 * 베트남 표준 형식:
 * - 천 단위 구분자: 쉼표(,)
 * - 통화 기호: ₫ (숫자 뒤에 표시)
 * - 예시: 380,000₫
 */
export function formatPriceVND(price: number): string {
  if (price === null || price === undefined || isNaN(price)) {
    return '0₫';
  }
  
  // 베트남 로케일 형식 사용 (천 단위 구분자: 쉼표, 소수점 제거)
  return `${Math.round(price).toLocaleString('vi-VN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  })}₫`;
}
