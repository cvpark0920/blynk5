import React, { useState, useEffect } from 'react';
import { Bell, Globe, LogOut, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage, Language } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { useIsMobile } from "../ui/use-mobile";
import { apiClient } from '../../../lib/api';
import { BackendNotification } from '../../types/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer"
import { ScrollArea } from "../ui/scroll-area"

type NotificationTab = 'all' | 'unread' | 'orders' | 'requests' | 'chat' | 'payment' | 'other';

function NotificationList({ onRefresh, onTableOpen }: { onRefresh?: () => void; onTableOpen?: (tableNumber: number) => void }) {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>('unread');

  // Helper function to format time
  const formatTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) {
      return t('notification.just_now');
    }
    if (diffMins < 60) {
      return t('notification.time_ago').replace('{minutes}', diffMins.toString());
    }
    if (diffHours < 24) {
      return t('notification.hour_ago').replace('{hours}', diffHours.toString());
    }
    return created.toLocaleDateString();
  };

  // Get notification title based on language
  const getTitle = (notification: BackendNotification) => {
    if (language === 'ko') return notification.titleKo || '';
    if (language === 'vn') return notification.titleVn || '';
    return notification.titleEn || '';
  };

  // Get notification description based on language
  const getDescription = (notification: BackendNotification) => {
    if (language === 'ko') return notification.descriptionKo || '';
    if (language === 'vn') return notification.descriptionVn || '';
    return notification.descriptionEn || '';
  };

  // Get notification type for icon
  const getNotificationType = (type: BackendNotification['type']) => {
    switch (type) {
      case 'ORDER_NEW':
      case 'ORDER_STATUS_CHANGED':
        return 'order';
      case 'CUSTOMER_REQUEST':
        return 'alert';
      case 'PAYMENT_CONFIRMED':
        return 'success';
      case 'CHAT_NEW':
      case 'SHIFT_ALERT':
      case 'WATER_REQUEST': // Keep for backward compatibility
      default:
        return 'info';
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const [notificationsRes, countRes] = await Promise.all([
        apiClient.getNotifications(50),
        apiClient.getUnreadNotificationCount(),
      ]);

      if (notificationsRes.success && notificationsRes.data) {
        setNotifications(notificationsRes.data);
      }

      if (countRes.success && countRes.data !== undefined) {
        setUnreadCount(countRes.data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('알림을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await apiClient.markNotificationRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('알림 읽음 처리에 실패했습니다.');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAllRead(true);
      const response = await apiClient.markAllNotificationsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('모든 알림 읽음 처리에 실패했습니다.');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.isRead;
    if (activeTab === 'orders') return notification.type === 'ORDER_NEW' || notification.type === 'ORDER_STATUS_CHANGED';
    if (activeTab === 'requests') return notification.type === 'CUSTOMER_REQUEST' || notification.type === 'WATER_REQUEST';
    if (activeTab === 'chat') return notification.type === 'CHAT_NEW';
    if (activeTab === 'payment') return notification.type === 'PAYMENT_CONFIRMED';
    if (activeTab === 'other') return notification.type === 'SHIFT_ALERT';
    return true;
  });

  // Handle notification click
  const handleNotificationClick = (notification: BackendNotification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // If it's a customer request, open the table sheet
    if ((notification.type === 'CUSTOMER_REQUEST' || notification.type === 'WATER_REQUEST') && onTableOpen) {
      const tableNumber = notification.metadata?.tableNumber;
      if (tableNumber) {
        onTableOpen(tableNumber);
      }
    }
  };

  // Get tab counts
  const tabCounts = {
    all: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    orders: notifications.filter(n => n.type === 'ORDER_NEW' || n.type === 'ORDER_STATUS_CHANGED').length,
    requests: notifications.filter(n => n.type === 'CUSTOMER_REQUEST' || n.type === 'WATER_REQUEST').length,
    chat: notifications.filter(n => n.type === 'CHAT_NEW').length,
    payment: notifications.filter(n => n.type === 'PAYMENT_CONFIRMED').length,
    other: notifications.filter(n => n.type === 'SHIFT_ALERT').length,
  };

  const tabs: { id: NotificationTab; label: string; count: number }[] = [
    { id: 'all', label: t('notification.tab.all') || '전체', count: tabCounts.all },
    { id: 'unread', label: t('notification.tab.unread') || '읽지 않음', count: tabCounts.unread },
    { id: 'orders', label: t('notification.tab.orders') || '주문', count: tabCounts.orders },
    { id: 'requests', label: t('notification.tab.requests') || '요청', count: tabCounts.requests },
    { id: 'chat', label: t('notification.tab.chat') || '채팅', count: tabCounts.chat },
    { id: 'payment', label: t('notification.tab.payment') || '결제', count: tabCounts.payment },
    { id: 'other', label: t('notification.tab.other') || '기타', count: tabCounts.other },
  ];

  return (
    <div className="flex flex-col h-full">
       {/* Tabs */}
       <div className="px-4 pt-3 pb-2 border-b border-zinc-100/80 bg-white/50 backdrop-blur-sm">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
       </div>

       {/* Header with mark all read */}
       {tabCounts.unread > 0 && (
         <div className="px-4 py-2.5 border-b border-zinc-100/80 flex items-center justify-end bg-white/50 backdrop-blur-sm">
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-50 transition-colors"
            >
              {t('notification.mark_all_read')}
            </button>
         </div>
       )}

       {/* Notifications List */}
       <ScrollArea className="flex-1">
          <div className="flex flex-col">
             {isLoading ? (
               <div className="p-12 text-center">
                  <p className="text-sm text-zinc-400">로딩 중...</p>
               </div>
             ) : filteredNotifications.length === 0 ? (
               <div className="p-12 text-center">
                  <p className="text-sm text-zinc-400">{t('notification.no_more')}</p>
               </div>
             ) : (
               filteredNotifications.map((notification) => {
                 const type = getNotificationType(notification.type);
                 const title = getTitle(notification);
                 const desc = getDescription(notification);
                 const time = formatTime(notification.createdAt);

                 return (
                   <div
                     key={notification.id}
                     onClick={() => handleNotificationClick(notification)}
                     className={`group px-4 py-3 border-b border-zinc-100/50 hover:bg-zinc-50/80 transition-all duration-150 flex gap-3 cursor-pointer ${
                       !notification.isRead ? 'bg-indigo-50/20 border-l-2 border-l-indigo-500' : 'bg-white'
                     }`}
                   >
                     <div
                       className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                         type === 'order'
                           ? 'bg-emerald-50 text-emerald-600'
                           : type === 'alert'
                           ? 'bg-amber-50 text-amber-600'
                           : type === 'success'
                           ? 'bg-blue-50 text-blue-600'
                           : 'bg-zinc-50 text-zinc-500'
                       }`}
                     >
                       {type === 'order' && <ShoppingBag size={16} />}
                       {type === 'alert' && <AlertCircle size={16} />}
                       {type === 'success' && <CheckCircle2 size={16} />}
                       {type === 'info' && <Bell size={16} />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start gap-2 mb-1">
                         <p
                           className={`text-sm font-semibold leading-tight ${
                             !notification.isRead ? 'text-zinc-900' : 'text-zinc-600'
                           }`}
                         >
                           {title}
                         </p>
                         <span className="text-xs text-zinc-400 tabular-nums whitespace-nowrap shrink-0">{time}</span>
                       </div>
                       <p className={`text-sm leading-relaxed ${
                         !notification.isRead ? 'text-zinc-700' : 'text-zinc-500'
                       }`}>
                         {desc}
                       </p>
                     </div>
                     {!notification.isRead && (
                       <div className="shrink-0 self-start mt-1.5">
                         <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                       </div>
                     )}
                   </div>
                 );
               })
             )}
          </div>
       </ScrollArea>
    </div>
  );
}

export function StoreHeader({
  activeOrders,
  onTableOpen,
  isSoundEnabled,
  onToggleSound,
  isSoundToggling,
}: {
  activeOrders: number;
  onTableOpen?: (tableNumber: number) => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  isSoundToggling?: boolean;
}) {
  const { language, setLanguage, t } = useLanguage();
  const { shopUser: currentUser, logoutShop: logout, shopOwnerInfo: ownerInfo, shopUserRole: userRole, isShopAuthenticated } = useUnifiedAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load unread notification count
  const loadUnreadCount = async () => {
    if (!isShopAuthenticated) {
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const response = await apiClient.getUnreadNotificationCount();
      if (response.success && response.data !== undefined) {
        setUnreadNotificationCount(response.data);
      }
    } catch (error) {
      console.error('Failed to load unread notification count:', error);
    }
  };

  // Refresh notifications
  const handleRefreshNotifications = () => {
    setRefreshKey(prev => prev + 1);
    loadUnreadCount();
  };

  useEffect(() => {
    if (!isShopAuthenticated) {
      return;
    }
    loadUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isShopAuthenticated]);

  // Refresh when notification modal opens
  useEffect(() => {
    if (open) {
      handleRefreshNotifications();
    }
  }, [open]);

  // Use ownerInfo for Google login, currentUser for PIN login
  const displayUser = currentUser || (ownerInfo && userRole === 'OWNER' ? {
    name: ownerInfo.name,
    email: ownerInfo.email,
    avatarUrl: ownerInfo.avatarUrl,
    role: 'owner'
  } : null);

  // Reset avatar error when avatarUrl changes
  React.useEffect(() => {
    setAvatarError(false);
  }, [displayUser?.avatarUrl]);

  return (
    <header className="bg-zinc-50/80 backdrop-blur-md px-5 py-4 flex items-center justify-between sticky top-0 z-50">
      <div>
         <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
                <div className="w-9 h-9 rounded-full bg-white shadow-sm border border-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 overflow-hidden">
                    {displayUser?.avatarUrl && !avatarError ? (
                        <img 
                            src={displayUser.avatarUrl} 
                            alt={displayUser.name} 
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                            loading="lazy"
                        />
                    ) : (
                        displayUser?.name?.charAt(0).toUpperCase() || 'U'
                    )}
                </div>
                <div className="text-left min-w-0 max-w-[140px] sm:max-w-[200px]">
                    <p className="text-sm font-bold text-zinc-900 leading-none truncate">{displayUser?.name || 'User'}</p>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide mt-0.5 truncate">{displayUser?.role || userRole?.toLowerCase() || 'user'}</p>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl p-1 shadow-xl shadow-zinc-200/50 border-zinc-100">
                <div className="px-2 py-1.5 md:hidden">
                    <p className="text-sm font-bold text-zinc-900">{displayUser?.name || 'User'}</p>
                    <p className="text-xs text-zinc-400 capitalize">{displayUser?.role || userRole?.toLowerCase() || 'user'}</p>
                </div>
                <DropdownMenuItem onClick={logout} className="text-rose-500 focus:text-rose-600 focus:bg-rose-50 rounded-lg cursor-pointer">
                    <LogOut size={16} className="mr-2" />
                    <span>{t('auth.logout')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
      
      <div className="flex items-center gap-3">
        <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
          <SelectTrigger className="w-auto h-8 gap-1 border-0 bg-white/50 hover:bg-white shadow-sm rounded-full px-3 text-xs font-semibold text-zinc-600 transition-all focus:ring-0">
             <div className="flex items-center gap-1.5">
                <Globe size={12} className="text-zinc-400"/>
                <span>{language.toUpperCase()}</span>
             </div>
          </SelectTrigger>
          <SelectContent align="end" className="min-w-[120px] rounded-xl border-zinc-100 shadow-xl shadow-zinc-200/50">
            <SelectItem value="ko" className="text-xs font-medium py-2">🇰🇷 한국어</SelectItem>
            <SelectItem value="en" className="text-xs font-medium py-2">🇺🇸 English</SelectItem>
            <SelectItem value="vn" className="text-xs font-medium py-2">🇻🇳 Tiếng Việt</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={onToggleSound}
          disabled={isSoundToggling}
          className="w-auto h-8 gap-1 border-0 bg-white/50 hover:bg-white shadow-sm rounded-full px-3 text-xs font-semibold text-zinc-600 transition-all focus:ring-0 inline-flex items-center disabled:opacity-60"
        >
          <Bell size={12} className={isSoundEnabled ? 'text-emerald-500' : 'text-zinc-400'} />
          <span className="hidden sm:inline">{isSoundEnabled ? '알림 ON' : '알림 OFF'}</span>
          <span
            className={`ml-1 inline-flex h-2 w-2 rounded-full ${
              isSoundEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
            }`}
          />
        </button>

        {isMobile ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <button 
                onClick={() => setOpen(true)}
                className="relative p-2.5 bg-white rounded-full shadow-sm text-zinc-400 hover:text-zinc-900 hover:shadow-md transition-all active:scale-95 outline-none"
              >
                <Bell size={18} />
                {(activeOrders > 0 || unreadNotificationCount > 0) && (
                  <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
            </DrawerTrigger>
            <DrawerContent className="h-[90vh] rounded-t-[32px]">
              <DrawerHeader className="text-left pt-6 px-6">
                <DrawerTitle className="text-xl font-bold text-zinc-900">{t('notification.title')}</DrawerTitle>
              </DrawerHeader>
              <div className="px-2 flex-1 overflow-hidden pb-8">
                 <NotificationList key={refreshKey} onRefresh={handleRefreshNotifications} onTableOpen={onTableOpen} />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button 
                onClick={() => setOpen(true)}
                className="relative p-2.5 bg-white rounded-full shadow-sm text-zinc-400 hover:text-zinc-900 hover:shadow-md transition-all active:scale-95 outline-none"
              >
                <Bell size={18} />
                {(activeOrders > 0 || unreadNotificationCount > 0) && (
                  <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[450px] p-0 border-l border-zinc-100 shadow-2xl">
              <SheetHeader className="p-6 border-b border-zinc-100">
                <SheetTitle className="text-lg font-bold text-zinc-900">{t('notification.title')}</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-80px)]">
                 <NotificationList key={refreshKey} onRefresh={handleRefreshNotifications} onTableOpen={onTableOpen} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
}