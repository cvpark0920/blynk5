import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MessageSquare, ShoppingCart, UtensilsCrossed, BellRing } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type RequestType = 'chat' | 'order' | 'request';

interface CustomerRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: number | string;
  requestType: RequestType;
  message: string;
  onTableOpen?: (tableNumber: number, tab?: 'orders' | 'chat') => void;
}

export function CustomerRequestModal({
  open,
  onOpenChange,
  tableNumber,
  requestType,
  message,
  onTableOpen,
}: CustomerRequestModalProps) {
  const { t, language } = useLanguage();

  // 요청 타입에 따른 아이콘과 제목 설정
  const getRequestTypeInfo = () => {
    switch (requestType) {
      case 'order':
        return {
          icon: <ShoppingCart className="h-8 w-8 text-primary" />,
          title: t('modal.request.order') || (language === 'ko' ? '새 주문' : language === 'vn' ? 'Đơn hàng mới' : language === 'zh' ? '新订单' : 'New Order'),
        };
      case 'request':
        return {
          icon: <BellRing className="h-8 w-8 text-primary" />,
          title: t('modal.request.title') || (language === 'ko' ? '고객 요청' : language === 'vn' ? 'Yêu cầu khách hàng' : language === 'zh' ? '客户请求' : 'Customer Request'),
        };
      case 'chat':
      default:
        return {
          icon: <MessageSquare className="h-8 w-8 text-primary" />,
          title: t('modal.request.message') || (language === 'ko' ? '메시지' : language === 'vn' ? 'Tin nhắn' : language === 'zh' ? '消息' : 'Message'),
        };
    }
  };

  const { icon, title } = getRequestTypeInfo();
  const tableLabel = t('modal.request.table') 
    ? t('modal.request.table').replace('{number}', String(tableNumber))
    : language === 'ko' 
      ? `테이블 ${tableNumber}`
      : language === 'vn'
      ? `Bàn ${tableNumber}`
      : language === 'zh'
      ? `桌位 ${tableNumber}`
      : `Table ${tableNumber}`;

  const confirmLabel = t('modal.request.confirm') || (language === 'ko' ? '확인' : language === 'vn' ? 'Xác nhận' : language === 'zh' ? '确认' : 'Confirm');
  const viewTableLabel = t('modal.request.view_table') || (language === 'ko' ? '테이블 보기' : language === 'vn' ? 'Xem bàn' : language === 'zh' ? '查看桌位' : 'View Table');

  const handleTableOpen = () => {
    const numericTableNumber = typeof tableNumber === 'string' ? Number(tableNumber) : tableNumber;
    if (onTableOpen && numericTableNumber) {
      // 주문은 orders 탭, 채팅/요청은 chat 탭으로 이동
      const tab = requestType === 'order' ? 'orders' : 'chat';
      onTableOpen(numericTableNumber, tab);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => {
          // 배경 클릭으로 닫기 방지
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // ESC 키로 닫기 방지
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">{title}</DialogTitle>
        </DialogHeader>
        
        <Card className="border-0 shadow-none">
          <CardContent className="pt-0">
            <div className="flex flex-col items-center gap-4 text-center">
              {/* 아이콘 */}
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                {icon}
              </div>

              {/* 제목 */}
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{tableLabel}</p>
              </div>

              {/* 메시지 내용 */}
              <div className="w-full">
                <div className="rounded-lg bg-muted p-4 text-left">
                  <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full sm:w-auto"
            size="lg"
          >
            {confirmLabel}
          </Button>
          {onTableOpen && (
            <Button
              onClick={handleTableOpen}
              className="w-full sm:w-auto"
              size="lg"
            >
              {viewTableLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
