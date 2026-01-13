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

  // Toast Messages
  toast: {
    // Order Status
    orderReceived: { ko: '주문이 접수되었습니다.', vn: 'Đơn hàng đã được tiếp nhận.', en: 'Order has been received.' },
    cookingStarted: { ko: '주문이 조리 중입니다.', vn: 'Đơn hàng đang được chế biến.', en: 'Order is being prepared.' },
    paymentCompleted: { ko: '결제가 완료되었습니다.', vn: 'Thanh toán đã hoàn tất.', en: 'Payment has been completed.' },
    orderCancelled: { ko: '주문이 취소되었습니다.', vn: 'Đơn hàng đã bị hủy.', en: 'Order has been cancelled.' },
    tableReset: { ko: '테이블이 초기화되었습니다.', vn: 'Bàn đã được khởi tạo lại.', en: 'Table has been reset.' },
    
    // Errors
    menuLoadFailed: { ko: '메뉴를 불러오는데 실패했습니다.', vn: 'Không thể tải thực đơn.', en: 'Failed to load menu.' },
    networkError: { ko: '네트워크 연결을 확인해주세요.', vn: 'Vui lòng kiểm tra kết nối mạng.', en: 'Please check your network connection.' },
    messageSendFailed: { ko: '메시지 전송에 실패했습니다.', vn: 'Gửi tin nhắn thất bại.', en: 'Failed to send message.' },
    sessionInfoMissing: { ko: '세션 정보가 없습니다.', vn: 'Thiếu thông tin phiên.', en: 'Session information is missing.' },
    orderFailed: { ko: '주문에 실패했습니다.', vn: 'Đặt hàng thất bại.', en: 'Failed to place order.' },
    paymentFailed: { ko: '결제 완료 처리에 실패했습니다.', vn: 'Xử lý thanh toán thất bại.', en: 'Failed to complete payment.' },
    
    // Photo
    photoSent: { ko: '사진을 보냈습니다.', vn: 'Đã gửi ảnh', en: 'Photo sent' },
    
    // Bill Modal
    restaurantNotFound: { ko: '식당 정보를 찾을 수 없습니다.', vn: 'Không tìm thấy thông tin nhà hàng.', en: 'Restaurant information not found.' },
    bankTransferDisabled: { ko: '계좌이체가 활성화되지 않았습니다.', vn: 'Chuyển khoản chưa được kích hoạt.', en: 'Bank transfer is not enabled.' },
    accountInfoMissing: { ko: '계좌 정보가 설정되지 않았습니다.', vn: 'Thông tin tài khoản chưa được cấu hình.', en: 'Account information is not configured.' },
    qrGenerateFailed: { ko: 'QR 코드 생성에 실패했습니다.', vn: 'Không thể tạo mã QR.', en: 'Failed to generate QR code.' },
    qrCodeMissing: { ko: 'QR 코드가 없습니다.', vn: 'Không có mã QR.', en: 'No QR code available.' },
    qrDownloadFailed: { ko: 'QR 코드 다운로드에 실패했습니다.', vn: 'Không thể tải mã QR.', en: 'Failed to download QR code.' },
    imageSaved: { ko: '이미지가 갤러리에 저장되었습니다.', vn: 'Ảnh đã được lưu vào thư viện.', en: 'Image saved to gallery' },
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
