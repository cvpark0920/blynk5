import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TableGrid } from './components/staff/TableGrid';
import { OrderFeed } from './components/staff/OrderFeed';
import { ReportsDashboard } from './components/staff/ReportsDashboard';
import { SettingsPage } from './components/staff/SettingsPage';
import { BottomNav } from './components/staff/BottomNav';
import { Sidebar } from './components/staff/Sidebar';
import { StoreHeader } from './components/staff/StoreHeader';
import { LoginScreen } from './components/auth/LoginScreen';
import { useUnifiedAuth } from '../../../src/context/UnifiedAuthContext';
import { useLanguage } from './context/LanguageContext';
import { apiClient, getSSEUrl } from '../lib/api';
import { SSEClient, SSEEvent } from '../lib/sseClient';
import { toast } from 'sonner';
import { 
  Table, Order, MenuCategory, MenuItem
} from './data';
import { mapBackendTableToFrontend, mapBackendOrderToFrontend, mapBackendMenuItemToFrontend } from './utils/mappers';
import { BackendTable, BackendOrder, BackendMenuItem } from './types/api';

export function MainApp() {
  const { restaurantId: urlRestaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { 
    shopUser: currentUser, 
    shopStaffList: staffList, 
    setShopStaffList: setStaffList, 
    isShopAuthenticated: isAuthenticated, 
    shopUserRole: userRole, 
    shopRestaurantId: restaurantId, 
    setShopRestaurantId: setRestaurantId 
  } = useUnifiedAuth();
  const { language, t } = useLanguage();

  // Set restaurantId from URL
  useEffect(() => {
    if (urlRestaurantId && urlRestaurantId !== restaurantId) {
      setRestaurantId(urlRestaurantId);
    }
  }, [urlRestaurantId, restaurantId, setRestaurantId]);

  // Redirect to login if restaurantId is missing
  useEffect(() => {
    if (!urlRestaurantId) {
      navigate('/shop/restaurant/unknown/login', { replace: true });
    }
  }, [urlRestaurantId, navigate]);
  const [currentTab, setCurrentTab] = useState<'tables' | 'orders' | 'reports' | 'settings'>('tables');
  const [tableToOpen, setTableToOpen] = useState<number | null>(null);
  
  // State for data interaction
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  // SSE client ref
  const sseClientRef = useRef<SSEClient | null>(null);
  const chatNewHandlerRef = useRef<((tableId: number, sessionId: string) => void) | null>(null);
  const recentToastMessagesRef = useRef<Set<string>>(new Set());

  // Load tables, orders, and menu from API when restaurantId is available
  useEffect(() => {
    if (restaurantId && isAuthenticated) {
      loadTables();
      loadOrders();
      loadMenu();
    }
  }, [restaurantId, isAuthenticated, language]);

  // Helper function to check if token is expired or about to expire
  const isTokenExpiredOrExpiringSoon = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = exp - now;
      // Consider token expired if it expires in less than 1 minute
      return timeUntilExpiry < 60000;
    } catch {
      return true; // If we can't parse, assume expired
    }
  };

  // Helper function to connect SSE with token refresh if needed
  const connectSSE = async () => {
    if (!restaurantId || !isAuthenticated) {
      return;
    }

    let token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }

    // Check if token is expired or expiring soon, refresh if needed
    if (isTokenExpiredOrExpiringSoon(token)) {
      console.log('Token expired or expiring soon, refreshing...');
      const newToken = await apiClient.refreshAccessToken();
      if (newToken) {
        token = newToken;
      } else {
        console.error('Failed to refresh token for SSE connection');
        return;
      }
    }

    // Create SSE client
    const sseClient = new SSEClient({
      onMessage: (event: SSEEvent) => {
        handleSSEEvent(event);
      },
      onError: async (error) => {
        console.error('SSE connection error:', error);
        // If connection fails, try refreshing token and reconnecting
        const newToken = await apiClient.refreshAccessToken();
        if (newToken && sseClientRef.current) {
          console.log('Token refreshed, reconnecting SSE...');
          const sseUrl = getSSEUrl(`/api/sse/restaurant/${restaurantId}/staff`, newToken);
          sseClientRef.current.disconnect();
          sseClientRef.current.connect(sseUrl);
        }
      },
      onConnect: () => {
        console.log('SSE connected for restaurant:', restaurantId);
      },
      onDisconnect: () => {
        console.log('SSE disconnected');
      },
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
    });

    // Connect to SSE endpoint
    const sseUrl = getSSEUrl(`/api/sse/restaurant/${restaurantId}/staff`, token);
    sseClient.connect(sseUrl);

    sseClientRef.current = sseClient;
  };

  // Setup SSE connection for real-time updates
  useEffect(() => {
    connectSSE();

    // Listen for token refresh events to reconnect SSE
    const handleTokenRefresh = () => {
      if (sseClientRef.current && restaurantId) {
        const newToken = localStorage.getItem('accessToken');
        if (newToken) {
          console.log('Token refreshed, reconnecting SSE...');
          sseClientRef.current.disconnect();
          const sseUrl = getSSEUrl(`/api/sse/restaurant/${restaurantId}/staff`, newToken);
          sseClientRef.current.connect(sseUrl);
        }
      }
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);

    // Cleanup on unmount
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
        sseClientRef.current = null;
      }
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
    };
  }, [restaurantId, isAuthenticated]);

  // Handle SSE events
  const handleSSEEvent = (event: SSEEvent) => {
    switch (event.type) {
      case 'order:new':
        // Reload both tables and orders to get updated currentSessionId and new order
        loadTables();
        loadOrders();
        toast.success(t('msg.new_order') || '새 주문이 들어왔습니다.');
        break;

      case 'order:status-changed':
        // Update order status in local state
        if (event.orderId && event.status) {
          setOrders(prev => prev.map(order => 
            order.id === event.orderId 
              ? { ...order, status: event.status.toLowerCase() as Order['status'] }
              : order
          ));
        }
        break;

      case 'table:status-changed':
        // Reload tables to get updated table state
        loadTables();
        break;

      case 'payment:confirmed':
        // Reload orders and tables to reflect payment status
        loadOrders();
        loadTables();
        // Show toast notification
        const paymentTableNumber = event.tableNumber || '?';
        const paymentAmount = event.totalAmount || 0;
        const paymentMethod = event.paymentMethod || '';
        const amountFormatted = paymentAmount.toLocaleString('vi-VN');
        toast.success(
          t('msg.payment_confirmed') 
            ? `${t('msg.payment_confirmed')} - 테이블 ${paymentTableNumber} (${amountFormatted}₫)` 
            : `테이블 ${paymentTableNumber}에서 결제 완료 (${amountFormatted}₫)`
        );
        break;

      case 'chat:new':
        // Show notification for new chat message
        const tableNumber = event.tableNumber || event.tableId;
        const sessionId = event.sessionId;
        const messageText = event.message || '';
        const sender = (event.sender || 'user').toLowerCase(); // Normalize to lowercase
        
        console.log('SSE chat:new event received:', { tableNumber, sessionId, messageText, sender, event });
        
        // Only show toast for messages from customers (user), not from staff (staff)
        // Staff messages are already visible in the UI, no need for toast
        if (sender === 'user') {
          // Create a unique key for this toast to prevent duplicates
          const toastKey = `${sessionId}-${messageText}-${Date.now()}`;
          const recentKey = `${sessionId}-${messageText}`;
          
          // Check if we've shown this toast recently (within last 2 seconds)
          if (recentToastMessagesRef.current.has(recentKey)) {
            console.log('Toast already shown recently, skipping duplicate');
            return;
          }
          
          // Add to recent set
          recentToastMessagesRef.current.add(recentKey);
          
          // Check if it's a REQUEST type message
          const isRequest = event.messageType === 'REQUEST';
          
          let chatMessage: string;
          if (isRequest) {
            // Customer request with message content
            chatMessage = language === 'ko' 
              ? `테이블 ${tableNumber}에서 요청: ${messageText}`
              : language === 'vn'
              ? `Bàn ${tableNumber} yêu cầu: ${messageText}`
              : `Table ${tableNumber} request: ${messageText}`;
          } else {
            // Regular chat message
            chatMessage = language === 'ko' 
              ? `테이블 ${tableNumber}에서 새 메시지가 도착했습니다.`
              : language === 'vn'
              ? `Bàn ${tableNumber} có tin nhắn mới.`
              : `Table ${tableNumber} sent a new message.`;
          }
          toast.info(chatMessage);
          
          // Remove from recent set after 2 seconds
          setTimeout(() => {
            recentToastMessagesRef.current.delete(recentKey);
          }, 2000);
        }
        
        // Update request status for the specific table and reload chat messages
        // This will reload chat messages for the open table detail
        // Note: updateTableRequestStatus already handles reloading chat messages,
        // so we don't need to reload tables separately to avoid duplicate calls
        if (sessionId && chatNewHandlerRef.current) {
          chatNewHandlerRef.current(tableNumber, sessionId);
        }
        
        // Only reload tables if it's a customer message (to refresh request status)
        // But delay it slightly to avoid race condition with updateTableRequestStatus
        if (sender === 'user') {
          setTimeout(() => {
            loadTables();
          }, 100);
        }
        break;

      case 'connected':
        console.log('SSE connected at:', event.timestamp);
        break;

      default:
        console.log('Unknown SSE event type:', event.type);
    }
  };

  const loadTables = async () => {
    if (!restaurantId) return;
    
    setIsLoadingTables(true);
    try {
      const result = await apiClient.getTables(restaurantId);
      if (result.success && result.data) {
        const mappedTables = result.data.map((table: BackendTable) => mapBackendTableToFrontend(table));
        setTables(mappedTables);
      } else {
        console.error('Failed to load tables:', result.error);
        toast.error('테이블 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('Error loading tables:', error);
      toast.error('테이블 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadOrders = async () => {
    if (!restaurantId) return;
    
    setIsLoadingOrders(true);
    try {
      const result = await apiClient.getOrders(restaurantId);
      if (result.success && result.data) {
        const mappedOrders = result.data.map((order: BackendOrder) => mapBackendOrderToFrontend(order, language));
        setOrders(mappedOrders);
      } else {
        console.error('Failed to load orders:', result.error);
        toast.error('주문 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('Error loading orders:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadMenu = async () => {
    if (!restaurantId) return;
    
    try {
      const result = await apiClient.getMenu(restaurantId);
      if (result.success && result.data) {
        const loadedMenu: MenuItem[] = [];
        
        result.data.forEach((category) => {
          (category.menuItems || []).forEach((item: BackendMenuItem) => {
            loadedMenu.push(mapBackendMenuItemToFrontend(item, language));
          });
        });
        
        setMenu(loadedMenu);
      } else {
        console.error('Failed to load menu:', result.error);
      }
    } catch (error: unknown) {
      console.error('Error loading menu:', error);
    }
  };

  const activeOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'cooking').length;

  // Check if user can access reports (MANAGER and OWNER only)
  const canAccessReports = 
    (userRole && ['OWNER', 'MANAGER'].includes(userRole)) ||
    (currentUser?.role && ['owner', 'manager'].includes(currentUser.role.toLowerCase()));
  
  // Redirect to tables if user tries to access reports without permission
  React.useEffect(() => {
    if (currentTab === 'reports' && !canAccessReports) {
      setCurrentTab('tables');
    }
  }, [currentTab, canAccessReports]);

  // Show login screen if not authenticated (either no currentUser for PIN login or no userRole for Google login)
  if (!isAuthenticated || !urlRestaurantId) {
    return <LoginScreen />;
  }

  // If user is pending (PIN login), LoginScreen handles it inside
  if (currentUser && currentUser.status === 'pending') {
      return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden selection:bg-zinc-200">
      {/* Desktop Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} activeOrders={activeOrdersCount} />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
          <StoreHeader 
            activeOrders={activeOrdersCount} 
            onTableOpen={(tableNumber: number) => {
              // Switch to tables tab and set table to open
              setCurrentTab('tables');
              setTableToOpen(tableNumber);
            }}
          />
          
          <main className="flex-1 overflow-y-auto pb-24 md:pb-6 scrollbar-hide overscroll-y-contain">
            <div className="w-full h-full">
                {currentTab === 'tables' && (
                  <div className="max-w-7xl mx-auto w-full">
                    <TableGrid 
                      tables={tables} 
                      orders={orders} 
                      setTables={setTables} 
                      setOrders={setOrders}
                      onOrdersReload={loadOrders}
                      onTablesReload={loadTables}
                      menu={menu}
                      onChatNew={(handler) => {
                        // Store handler reference for SSE event
                        chatNewHandlerRef.current = handler;
                      }}
                      tableToOpen={tableToOpen}
                      onTableOpened={() => setTableToOpen(null)}
                    />
                  </div>
                )}
                {currentTab === 'orders' && (
                  <div className="max-w-7xl mx-auto w-full">
                    <OrderFeed 
                      orders={orders} 
                      setOrders={setOrders}
                      onOrdersReload={loadOrders}
                      menu={menu}
                    />
                  </div>
                )}
                {currentTab === 'reports' && (
                   <div className="max-w-7xl mx-auto w-full">
                    <ReportsDashboard />
                   </div>
                )}
                {currentTab === 'settings' && (
                   <SettingsPage 
                      menu={menu}
                      setMenu={setMenu}
                      categories={categories}
                      setCategories={setCategories}
                      staffList={staffList}
                      setStaffList={setStaffList}
                      tables={tables}
                      setTables={setTables}
                   />
                )}
            </div>
          </main>

          {/* Mobile Bottom Nav */}
          <div className="md:hidden">
              <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} activeOrders={activeOrdersCount} />
          </div>
      </div>
    </div>
  );
}
