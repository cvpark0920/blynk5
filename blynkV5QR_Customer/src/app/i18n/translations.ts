export type LangType = 'ko' | 'vn' | 'en';

export const translations = {
  // BlynkApp
  tabs: {
    event: { ko: '이벤트', vn: 'Sự kiện', en: 'Events' },
    menu: { ko: '메뉴', vn: 'Thực đơn', en: 'Menu' },
    bill: { ko: '계산서', vn: 'Hóa đơn', en: 'Bill' },
  },
  input: {
    placeholder: { ko: '메시지 입력...', vn: 'Nhập tin nhắn...', en: 'Type a message...' },
  },
  coachMark: {
    title: { ko: '여기서 주문을 시작하세요!', vn: 'Bắt đầu đặt món tại đây!', en: 'Start ordering here!' },
    subtitle: { ko: '터치하면 메뉴가 열립니다', vn: 'Chạm để mở thực đơn', en: 'Tap to open menu' },
  },

  // BillModal
  bill: {
    title: { ko: '계산서', vn: 'Hóa đơn', en: 'Bill' },
    paymentMethod: { ko: '결제 수단 선택', vn: 'Chọn phương thức thanh toán', en: 'Select Payment Method' },
    transfer: { ko: '계좌이체', vn: 'Chuyển khoản', en: 'Bank Transfer' },
    noOrders: { ko: '아직 주문 내역이 없습니다.', vn: 'Chưa có đơn hàng nào.', en: 'No orders yet.' },
    total: { ko: '총 합계', vn: 'Tổng tiền', en: 'Total' },
    pay: { ko: '계산하기', vn: 'Thanh toán', en: 'Pay' },
    selectPayment: { ko: '결제 방법을 선택해주세요', vn: 'Vui lòng chọn phương thức thanh toán', en: 'Please select payment method' },
    bankTransfer: { ko: '계좌이체', vn: 'Chuyển khoản ngân hàng', en: 'Bank Transfer' },
    cash: { ko: '현금', vn: 'Tiền mặt', en: 'Cash' },
    creditCard: { ko: '신용카드', vn: 'Thẻ tín dụng', en: 'Credit Card' },
    qrSaved: { ko: 'QR코드가 갤러리에 저장되었습니다.', vn: 'Mã QR đã được lưu vào thư viện.', en: 'QR code saved to gallery.' },
    qrDownload: { ko: 'QR코드 저장', vn: 'Tải mã QR', en: 'Download QR' },
    transferComplete: { ko: '송금 완료', vn: 'Chuyển khoản hoàn tất', en: 'Transfer Complete' },
    accountHolder: { ko: '예금주: Blynk (더나와)', vn: 'Chủ tài khoản: Blynk (더나와)', en: 'Account Holder: Blynk (더나와)' },
    bankName: { ko: '신한은행', vn: 'Ngân hàng Shinhan', en: 'Shinhan Bank' },
  },

  // ChatBubble
  chat: {
    translate: { ko: '번역하기', vn: 'Dịch', en: 'Translate' },
    orderDetails: { ko: '주문 내역', vn: 'Chi tiết đơn hàng', en: 'Order Details' },
    total: { ko: '총 합계', vn: 'Tổng tiền', en: 'Total' },
  },

  // QuickActions (추가 액션들)
  quickActions: {
    wifi: { ko: '와이파이', vn: 'Wi-Fi', en: 'Wi-Fi' },
    toilet: { ko: '화장실', vn: 'Nhà vệ sinh', en: 'Toilet' },
    tissue: { ko: '휴지', vn: 'Khăn giấy', en: 'Tissue' },
    bill: { ko: '계산서', vn: 'Hóa đơn', en: 'Bill' },
  },
};

// 헬퍼 함수: 언어에 따른 텍스트 가져오기
export const t = (key: keyof typeof translations, lang: LangType): string => {
  const translation = translations[key];
  if (typeof translation === 'object' && 'ko' in translation) {
    return translation[lang] || translation.ko;
  }
  return '';
};

// 중첩된 키를 위한 헬퍼 (예: 'bill.title')
export const getTranslation = (path: string, lang: LangType): string => {
  const keys = path.split('.');
  let value: any = translations;
  
  for (const key of keys) {
    value = value?.[key];
    if (!value) return '';
  }
  
  if (typeof value === 'object' && 'ko' in value) {
    return value[lang] || value.ko;
  }
  
  return '';
};
