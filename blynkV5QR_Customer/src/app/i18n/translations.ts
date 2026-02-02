export type LangType = 'ko' | 'vn' | 'en' | 'zh' | 'ru';

export const translations = {
  // BlynkApp
  tabs: {
    event: { ko: '이벤트', vn: 'Sự kiện', en: 'Events', zh: '活动', ru: 'События' },
    menu: { ko: '메뉴', vn: 'Thực đơn', en: 'Menu', zh: '菜单', ru: 'Меню' },
    bill: { ko: '계산서', vn: 'Hóa đơn', en: 'Bill', zh: '账单', ru: 'Счет' },
  },
  input: {
    placeholder: { ko: '메시지 입력...', vn: 'Nhập tin nhắn...', en: 'Type a message...', zh: '输入消息...', ru: 'Введите сообщение...' },
  },
  coachMark: {
    title: { ko: '여기서 주문을 시작하세요!', vn: 'Bắt đầu đặt món tại đây!', en: 'Start ordering here!', zh: '在这里开始点餐！', ru: 'Начните заказ здесь!' },
    subtitle: { ko: '터치하면 메뉴가 열립니다', vn: 'Chạm để mở thực đơn', en: 'Tap to open menu', zh: '点击打开菜单', ru: 'Нажмите, чтобы открыть меню' },
  },

  // BillModal
  bill: {
    title: { ko: '계산서', vn: 'Hóa đơn', en: 'Bill', zh: '账单', ru: 'Счет' },
    paymentMethod: { ko: '결제 수단 선택', vn: 'Chọn phương thức thanh toán', en: 'Select Payment Method', zh: '选择支付方式', ru: 'Выберите способ оплаты' },
    transfer: { ko: '계좌이체', vn: 'Chuyển khoản', en: 'Bank Transfer', zh: '银行转账', ru: 'Банковский перевод' },
    noOrders: { ko: '아직 주문 내역이 없습니다.', vn: 'Chưa có đơn hàng nào.', en: 'No orders yet.', zh: '暂无订单。', ru: 'Заказов пока нет.' },
    total: { ko: '총 합계', vn: 'Tổng tiền', en: 'Total', zh: '合计', ru: 'Итого' },
    pay: { ko: '계산하기', vn: 'Thanh toán', en: 'Pay', zh: '结账', ru: 'Оплатить' },
    selectPayment: { ko: '결제 방법을 선택해주세요', vn: 'Vui lòng chọn phương thức thanh toán', en: 'Please select payment method', zh: '请选择支付方式', ru: 'Пожалуйста, выберите способ оплаты' },
    bankTransfer: { ko: '계좌이체', vn: 'Chuyển khoản ngân hàng', en: 'Bank Transfer', zh: '银行转账', ru: 'Банковский перевод' },
    cash: { ko: '현금', vn: 'Tiền mặt', en: 'Cash', zh: '现金', ru: 'Наличные' },
    creditCard: { ko: '신용카드', vn: 'Thẻ tín dụng', en: 'Credit Card', zh: '信用卡', ru: 'Кредитная карта' },
    qrSaved: { ko: 'QR코드가 갤러리에 저장되었습니다.', vn: 'Mã QR đã được lưu vào thư viện.', en: 'QR code saved to gallery.', zh: '二维码已保存到相册。', ru: 'QR-код сохранен в галерею.' },
    qrDownload: { ko: 'QR코드 저장', vn: 'Tải mã QR', en: 'Download QR', zh: '保存二维码', ru: 'Сохранить QR-код' },
    transferComplete: { ko: '송금 완료', vn: 'Chuyển khoản hoàn tất', en: 'Transfer Complete', zh: '转账完成', ru: 'Перевод завершен' },
    accountHolder: { ko: '예금주: Qoodle', vn: 'Chủ tài khoản: Qoodle', en: 'Account Holder: Qoodle', zh: '户主：Qoodle', ru: 'Владелец счета: Qoodle' },
    bankName: { ko: '신한은행', vn: 'Ngân hàng Shinhan', en: 'Shinhan Bank', zh: '新韩银行', ru: 'Банк Shinhan' },
    qrGenerating: { ko: 'QR 코드 생성 중...', vn: 'Đang tạo mã QR...', en: 'Generating QR code...', zh: '正在生成二维码...', ru: 'Генерация QR-кода...' },
    tableLabel: { ko: '테이블 {n}', vn: 'Bàn {n}', en: 'Table {n}', zh: '桌位 {n}', ru: 'Стол {n}' },
    accountHolderLabel: { ko: '예금주', vn: 'Chủ tài khoản', en: 'Account Holder', zh: '户主', ru: 'Владелец счета' },
    transferAmount: { ko: '입금 금액', vn: 'Số tiền cần chuyển', en: 'Transfer Amount', zh: '转账金额', ru: 'Сумма перевода' },
  },

  // ChatBubble
  chat: {
    translate: { ko: '번역하기', vn: 'Dịch', en: 'Translate', zh: '翻译', ru: 'Перевести' },
    orderDetails: { ko: '주문 내역', vn: 'Chi tiết đơn hàng', en: 'Order Details', zh: '订单详情', ru: 'Детали заказа' },
    total: { ko: '총 합계', vn: 'Tổng tiền', en: 'Total', zh: '合计', ru: 'Итого' },
  },

  // QuickActions
  quickActions: {
    wifi: { ko: '와이파이', vn: 'Wi-Fi', en: 'Wi-Fi', zh: 'Wi-Fi', ru: 'Wi-Fi' },
    toilet: { ko: '화장실', vn: 'Nhà vệ sinh', en: 'Toilet', zh: '洗手间', ru: 'Туалет' },
    tissue: { ko: '휴지', vn: 'Khăn giấy', en: 'Tissue', zh: '纸巾', ru: 'Салфетки' },
    bill: { ko: '계산서', vn: 'Hóa đơn', en: 'Bill', zh: '账单', ru: 'Счет' },
  },

  // Toast Messages
  toast: {
    orderReceived: { ko: '주문이 접수되었습니다.', vn: 'Đơn hàng đã được tiếp nhận.', en: 'Order has been received.', zh: '订单已接收。', ru: 'Заказ получен.' },
    cookingStarted: { ko: '주문이 조리 중입니다.', vn: 'Đơn hàng đang được chế biến.', en: 'Order is being prepared.', zh: '正在准备订单。', ru: 'Заказ готовится.' },
    paymentCompleted: { ko: '결제가 완료되었습니다.', vn: 'Thanh toán đã hoàn tất.', en: 'Payment has been completed.', zh: '支付已完成。', ru: 'Оплата завершена.' },
    orderCancelled: { ko: '주문이 취소되었습니다.', vn: 'Đơn hàng đã bị hủy.', en: 'Order has been cancelled.', zh: '订单已取消。', ru: 'Заказ отменен.' },
    tableReset: { ko: '테이블이 초기화되었습니다.', vn: 'Bàn đã được khởi tạo lại.', en: 'Table has been reset.', zh: '桌位已重置。', ru: 'Стол сброшен.' },
    menuLoadFailed: { ko: '메뉴를 불러오는데 실패했습니다.', vn: 'Không thể tải thực đơn.', en: 'Failed to load menu.', zh: '加载菜单失败。', ru: 'Не удалось загрузить меню.' },
    networkError: { ko: '네트워크 연결을 확인해주세요.', vn: 'Vui lòng kiểm tra kết nối mạng.', en: 'Please check your network connection.', zh: '请检查网络连接。', ru: 'Пожалуйста, проверьте подключение к сети.' },
    messageSendFailed: { ko: '메시지 전송에 실패했습니다.', vn: 'Gửi tin nhắn thất bại.', en: 'Failed to send message.', zh: '发送消息失败。', ru: 'Не удалось отправить сообщение.' },
    sessionInfoMissing: { ko: '세션 정보가 없습니다.', vn: 'Thiếu thông tin phiên.', en: 'Session information is missing.', zh: '缺少会话信息。', ru: 'Отсутствует информация о сессии.' },
    orderFailed: { ko: '주문에 실패했습니다.', vn: 'Đặt hàng thất bại.', en: 'Failed to place order.', zh: '下单失败。', ru: 'Не удалось разместить заказ.' },
    paymentFailed: { ko: '결제 완료 처리에 실패했습니다.', vn: 'Xử lý thanh toán thất bại.', en: 'Failed to complete payment.', zh: '完成支付失败。', ru: 'Не удалось завершить оплату.' },
    photoSent: { ko: '사진을 보냈습니다.', vn: 'Đã gửi ảnh', en: 'Photo sent', zh: '已发送图片', ru: 'Фото отправлено' },
    restaurantNotFound: { ko: '식당 정보를 찾을 수 없습니다.', vn: 'Không tìm thấy thông tin nhà hàng.', en: 'Restaurant information not found.', zh: '未找到餐厅信息。', ru: 'Информация о ресторане не найдена.' },
    bankTransferDisabled: { ko: '계좌이체가 활성화되지 않았습니다.', vn: 'Chuyển khoản chưa được kích hoạt.', en: 'Bank transfer is not enabled.', zh: '未启用银行转账。', ru: 'Банковский перевод не включен.' },
    accountInfoMissing: { ko: '계좌 정보가 설정되지 않았습니다.', vn: 'Thông tin tài khoản chưa được cấu hình.', en: 'Account information is not configured.', zh: '未配置账户信息。', ru: 'Информация об учетной записи не настроена.' },
    qrGenerateFailed: { ko: 'QR 코드 생성에 실패했습니다.', vn: 'Không thể tạo mã QR.', en: 'Failed to generate QR code.', zh: '生成二维码失败。', ru: 'Не удалось создать QR-код.' },
    qrCodeMissing: { ko: 'QR 코드가 없습니다.', vn: 'Không có mã QR.', en: 'No QR code available.', zh: '暂无二维码。', ru: 'QR-код недоступен.' },
    qrDownloadFailed: { ko: 'QR 코드 다운로드에 실패했습니다.', vn: 'Không thể tải mã QR.', en: 'Failed to download QR code.', zh: '下载二维码失败。', ru: 'Не удалось загрузить QR-код.' },
    imageSaved: { ko: '이미지가 갤러리에 저장되었습니다.', vn: 'Ảnh đã được lưu vào thư viện.', en: 'Image saved to gallery', zh: '图片已保存到相册', ru: 'Изображение сохранено в галерею' },
    qrLoadFailed: { ko: 'QR 코드를 불러올 수 없습니다.', vn: 'Không thể tải mã QR.', en: 'Unable to load QR code.', zh: '无法加载二维码。', ru: 'Не удалось загрузить QR-код.' },
  },

  // Error page & session errors
  error: {
    title: { ko: '오류가 발생했습니다', vn: 'Đã xảy ra lỗi', en: 'An error occurred', zh: '发生错误', ru: 'Произошла ошибка' },
    message: { ko: '잠시 후 다시 시도해주세요.', vn: 'Vui lòng thử lại sau.', en: 'Please try again later.', zh: '请稍后重试。', ru: 'Пожалуйста, попробуйте позже.' },
    retry: { ko: '다시 시도', vn: 'Thử lại', en: 'Retry', zh: '重试', ru: 'Повторить' },
    sessionLoadFailed: { ko: '세션을 불러올 수 없습니다', vn: 'Không thể tải phiên', en: 'Failed to load session', zh: '无法加载会话', ru: 'Не удалось загрузить сессию' },
    noSession: { ko: '세션이 없습니다', vn: 'Không có phiên', en: 'No session', zh: '无会话', ru: 'Нет сессии' },
    cannotCreateSession: { ko: '세션을 생성할 수 없습니다.', vn: 'Không thể tạo phiên.', en: 'Cannot create session.', zh: '无法创建会话。', ru: 'Не удалось создать сессию.' },
  },

  // Common
  common: {
    loading: { ko: '로딩 중...', vn: 'Đang tải...', en: 'Loading...', zh: '加载中...', ru: 'Загрузка...' },
    goBack: { ko: '돌아가기', vn: 'Quay lại', en: 'Go Back', zh: '返回', ru: 'Назад' },
  },

  // App (outside LanguageProvider)
  app: {
    invalidTableNumber: { ko: '잘못된 테이블 번호입니다', vn: 'Số bàn không hợp lệ', en: 'Invalid table number', zh: '桌位号无效', ru: 'Неверный номер стола' },
    useCorrectQR: { ko: '올바른 QR 코드로 접근해주세요.', vn: 'Vui lòng quét mã QR đúng.', en: 'Please scan the correct QR code.', zh: '请扫描正确的二维码。', ru: 'Пожалуйста, отсканируйте правильный QR-код.' },
    loading: { ko: '로딩 중...', vn: 'Đang tải...', en: 'Loading...', zh: '加载中...', ru: 'Загрузка...' },
    invalidLink: { ko: '잘못된 링크입니다', vn: 'Liên kết không hợp lệ', en: 'Invalid link', zh: '链接无效', ru: 'Неверная ссылка' },
  },
};

// 브라우저 언어로 LangType 추정 (LanguageProvider 밖에서 사용)
export const getLangFromNavigator = (): LangType => {
  const browserLang = (typeof navigator !== 'undefined' ? navigator.language : '').toLowerCase();
  if (browserLang.includes('ko')) return 'ko';
  if (browserLang.includes('vi')) return 'vn';
  if (browserLang.includes('zh')) return 'zh';
  if (browserLang.includes('ru')) return 'ru';
  return 'en';
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
