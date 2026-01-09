import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Bell, 
  Store, 
  DollarSign, 
  Activity, 
  Settings, 
  Check, 
  Clock, 
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Inbox
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose
} from '../ui/drawer';

type NotificationType = 'signup' | 'sale' | 'alert' | 'user' | 'info' | 'success' | 'warning';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority?: 'high' | 'medium' | 'low';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { 
    id: '1', 
    type: 'signup', 
    title: '새로운 식당 가입', 
    message: '새로운 식당 "버거 랩"이 가입 신청을 했습니다. 승인 검토가 필요합니다.', 
    time: '2분 전', 
    read: false,
    priority: 'high'
  },
  { 
    id: '2', 
    type: 'sale', 
    title: '정산 완료', 
    message: '"피자 헤븐"의 10월 정산이 성공적으로 완료되었습니다. (₩3,150,000)', 
    time: '1시간 전', 
    read: false,
    priority: 'medium'
  },
  { 
    id: '3', 
    type: 'alert', 
    title: '트래픽 경고', 
    message: '"스시 고" 식당의 주문 트래픽이 평소보다 300% 높습니다. 서버 상태를 확인하세요.', 
    time: '3시간 전', 
    read: false,
    priority: 'high'
  },
  { 
    id: '4', 
    type: 'user', 
    title: '시스템 설정 변경', 
    message: '관리자(Admin User)가 플랫폼 수수료율을 10%에서 12%로 업데이트했습니다.', 
    time: '5시간 전', 
    read: true,
    priority: 'medium'
  },
  { 
    id: '5', 
    type: 'signup', 
    title: '새로운 식당 가입', 
    message: '새로운 식당 "타코 피에스타"가 가입했습니다.', 
    time: '어제', 
    read: true,
    priority: 'low'
  },
  { 
    id: '6', 
    type: 'info', 
    title: '시스템 점검 예정', 
    message: '내일 오전 2시부터 4시까지 정기 시스템 점검이 있을 예정입니다.', 
    time: '어제', 
    read: true,
    priority: 'medium'
  },
  { 
    id: '7', 
    type: 'success', 
    title: '백업 완료', 
    message: '일일 데이터베이스 백업이 성공적으로 완료되었습니다.', 
    time: '2일 전', 
    read: true,
    priority: 'low'
  },
  { 
    id: '8', 
    type: 'warning', 
    title: '결제 실패', 
    message: '"파스타 하우스"의 자동 결제가 잔액 부족으로 실패했습니다.', 
    time: '3일 전', 
    read: true,
    priority: 'high'
  }
];

function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false);

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}

interface NotificationsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsView({ open, onOpenChange }: NotificationsViewProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('모든 알림을 읽음 처리했습니다.');
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('알림이 삭제되었습니다.');
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'signup': return <Store className="w-5 h-5 text-blue-500" />;
      case 'sale': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'alert': return <Activity className="w-5 h-5 text-orange-500" />;
      case 'user': return <Settings className="w-5 h-5 text-slate-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBackground = (type: NotificationType) => {
    switch (type) {
      case 'signup': return 'bg-blue-50 border-blue-100';
      case 'sale': return 'bg-green-50 border-green-100';
      case 'alert': return 'bg-orange-50 border-orange-100';
      case 'user': return 'bg-slate-50 border-slate-100';
      case 'info': return 'bg-blue-50/50 border-blue-100';
      case 'success': return 'bg-green-50/50 border-green-100';
      case 'warning': return 'bg-red-50 border-red-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'high') return n.priority === 'high';
    return true;
  });

  const NotificationList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-2 mb-2">
        <Tabs defaultValue="all" onValueChange={setFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="unread">미확인</TabsTrigger>
              <TabsTrigger value="high">중요</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>
      
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-3 pb-4">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground h-40">
              <Inbox className="w-10 h-10 mb-3 opacity-20" />
              <p>표시할 알림이 없습니다.</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`
                  relative flex gap-4 p-4 rounded-xl border transition-all duration-200
                  ${notification.read ? 'bg-white border-slate-100' : 'bg-white border-indigo-100 shadow-sm'}
                `}
              >
                {!notification.read && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full" />
                )}
                
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  ${getBackground(notification.type)}
                `}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between pr-4">
                    <p className={`text-sm font-semibold truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {notification.time}
                    </span>
                  </div>
                  <p className={`text-sm break-keep ${!notification.read ? 'text-slate-600' : 'text-slate-400'}`}>
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 pt-1">
                    {!notification.read && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        읽음 표시
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="pt-2 border-t mt-auto">
        <Button variant="outline" className="w-full" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
            <Check className="w-4 h-4 mr-2" />
            모든 알림 읽음 처리
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              알림 센터
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              최근 활동 및 시스템 알림을 확인하세요.
            </SheetDescription>
          </SheetHeader>
          <NotificationList />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] flex flex-col">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2">
            알림 센터
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>
            최근 활동 및 시스템 알림을 확인하세요.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 px-4 overflow-hidden flex flex-col">
            <NotificationList />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">닫기</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
