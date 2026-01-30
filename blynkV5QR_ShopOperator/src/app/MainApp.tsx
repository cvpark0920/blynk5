import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TableGrid } from './components/staff/TableGrid';
import { OrderFeed } from './components/staff/OrderFeed';
import { ReportsDashboard } from './components/staff/ReportsDashboard';
import { SettingsPage } from './components/staff/SettingsPage';
import { BottomNav } from './components/staff/BottomNav';
import { Sidebar } from './components/staff/Sidebar';
import { StoreHeader } from './components/staff/StoreHeader';
import { LoginScreen } from './components/auth/LoginScreen';
import { CustomerRequestModal } from './components/staff/CustomerRequestModal';
import { useUnifiedAuth } from '../../../src/context/UnifiedAuthContext';
import { useLanguage } from './context/LanguageContext';
import { apiClient, getSSEUrl } from '../lib/api';
import { SSEClient, SSEEvent } from '../lib/sseClient';
import { toast } from 'sonner';
import { 
  Table, Order, MenuCategory, MenuItem
} from './data';
import { mapBackendTableToFrontend, mapBackendOrderToFrontend, mapBackendMenuItemToFrontend } from './utils/mappers';
import { BackendTable, BackendOrder, BackendMenuItem, BackendChatMessage } from './types/api';

import { getSubdomain } from '../../../src/utils/subdomain';
import {
  getExistingSubscription,
  isPushSupported as checkPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from './utils/pushNotifications';

export function MainApp() {
  const debugEnabled =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && window.localStorage.getItem('shop_debug') === '1');
  const debugLog = (...args: unknown[]) => {
    if (debugEnabled) {
      console.log(...args);
    }
  };
  // 서브도메인에서 restaurantId 가져오기
  const subdomain = getSubdomain();
  
  // 하위 호환성: 기존 URL 형식도 지원
  const legacyPathMatch = window.location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
  const legacyRestaurantId = legacyPathMatch ? legacyPathMatch[1] : null;
  
  // Navigate function using window.location
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
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

  // 서브도메인 기반인 경우 restaurantId는 이미 설정되어 있음
  // 기존 URL 형식인 경우에만 설정
  useEffect(() => {
    if (legacyRestaurantId && legacyRestaurantId !== restaurantId && !subdomain) {
      setRestaurantId(legacyRestaurantId);
    }
  }, [legacyRestaurantId, restaurantId, subdomain, setRestaurantId]);

  // Redirect to login if restaurantId is missing
  useEffect(() => {
    if (!restaurantId && !legacyRestaurantId) {
      const loginPath = subdomain ? '/shop/login' : '/shop/restaurant/unknown/login';
      navigate(loginPath, { replace: true });
    }
  }, [restaurantId, legacyRestaurantId, subdomain, navigate]);
  const [currentTab, setCurrentTab] = useState<'tables' | 'orders' | 'reports' | 'settings'>('tables');
  const [tableToOpen, setTableToOpen] = useState<number | null>(null);
  const [initialActiveTab, setInitialActiveTab] = useState<'orders' | 'chat'>('orders');
  
  // State for data interaction
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [notificationSoundUrl, setNotificationSoundUrl] = useState<string | null>(null);
  const [resolvedNotificationSoundUrl, setResolvedNotificationSoundUrl] = useState<string | null>(null);
  const [isSoundUnlocked, setIsSoundUnlocked] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isDisablingPush, setIsDisablingPush] = useState(false);
  const [isSseConnected, setIsSseConnected] = useState(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const requestAlertLastIdRef = useRef<Map<string, string>>(new Map());
  const requestAlertInFlightRef = useRef(false);
  const lastChatEventAtRef = useRef<number>(0);
  const soundUnlockToastShownRef = useRef(false);
  const [showSoundUnlockPrompt, setShowSoundUnlockPrompt] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isSoundUnlockedRef = useRef(false);
  const isSoundEnabledRef = useRef(true);
  
  // SSE client ref
  const sseClientRef = useRef<SSEClient | null>(null);
  const chatNewHandlerRef = useRef<((tableId: number, sessionId: string, sender?: string, messageType?: string) => void) | null>(null);
  const chatReadHandlerRef = useRef<((sessionId: string, lastReadMessageId: string) => Promise<void>) | null>(null);
  const recentToastMessagesRef = useRef<Set<string>>(new Set());
  
  // Customer request modal state
  const [customerRequestModalOpen, setCustomerRequestModalOpen] = useState(false);
  const [customerRequestData, setCustomerRequestData] = useState<{
    tableNumber: number | string;
    requestType: 'chat' | 'order' | 'request';
    message: string;
  } | null>(null);
  const recentModalRequestsRef = useRef<Set<string>>(new Set());

  // Load tables, orders, and menu from API when restaurantId is available
  useEffect(() => {
    if (restaurantId && isAuthenticated) {
      loadTables();
      loadMenu();
    }
  }, [restaurantId, isAuthenticated, language]);

  useEffect(() => {
    setIsPushSupported(checkPushSupported());
  }, []);

  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    const loadNotificationPreferences = async () => {
      if (!restaurantId || !isAuthenticated) return;
      try {
        const result = await apiClient.getNotificationPreferences(restaurantId);
        if (result.success && result.data) {
          setIsSoundEnabled(result.data.soundEnabled !== false);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };
    loadNotificationPreferences();
  }, [restaurantId, isAuthenticated]);

  useEffect(() => {
    const loadRestaurantSettings = async () => {
      if (!restaurantId || !isAuthenticated) return;
      try {
        const result = await apiClient.getMyRestaurant(restaurantId);
        if (result.success && result.data) {
          const settings = (result.data as any).settings || {};
          setNotificationSoundUrl(settings.notificationSoundUrl || null);
        }
      } catch (error) {
        console.error('Failed to load restaurant settings:', error);
      }
    };
    loadRestaurantSettings();
  }, [restaurantId, isAuthenticated]);

  useEffect(() => {
    if (notificationSoundUrl) {
      let resolvedUrl = notificationSoundUrl;
      try {
        const parsed = new URL(notificationSoundUrl, window.location.origin);
        if (window.location.protocol === 'https:') {
          parsed.protocol = 'https:';
          if (parsed.hostname.endsWith('.localhost') && parsed.port === '3000') {
            parsed.port = '';
          }
        }
        resolvedUrl = parsed.toString();
      } catch {
        // Keep original URL if it cannot be parsed.
      }
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = resolvedUrl;
      audio.load();
      audio.addEventListener('error', () => {
        console.error('Notification sound load failed:', {
          resolvedUrl,
          networkState: audio.networkState,
          readyState: audio.readyState,
        });
      });
      notificationAudioRef.current = audio;
      console.info('[SSE] audio element ready', { resolvedUrl });
      setResolvedNotificationSoundUrl(resolvedUrl);
      setIsSoundUnlocked(false);
      isSoundUnlockedRef.current = false;
    } else {
      notificationAudioRef.current = null;
      setResolvedNotificationSoundUrl(null);
      setIsSoundUnlocked(false);
      isSoundUnlockedRef.current = false;
    }
  }, [notificationSoundUrl]);

  useEffect(() => {
    const checkPushStatus = async () => {
      if (!checkPushSupported() || !isAuthenticated) {
        setIsPushEnabled(false);
        return;
      }
      try {
        const subscription = await getExistingSubscription();
        setIsPushEnabled(!!subscription);
      } catch (error) {
        console.error('Failed to check push subscription:', error);
        setIsPushEnabled(false);
      }
    };
    checkPushStatus();
  }, [isAuthenticated, restaurantId]);

  // Load orders after tables are loaded to filter by active sessions
  useEffect(() => {
    if (restaurantId && isAuthenticated && tables.length > 0) {
      loadOrders();
    }
  }, [restaurantId, isAuthenticated, tables.length]); // Reload orders when tables change

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

  // Helper function to create SSE client with common handlers
  const createSSEClient = (token: string): SSEClient => {
    return new SSEClient({
      onMessage: (event: SSEEvent) => {
        handleSSEEvent(event);
      },
      onError: async (error) => {
        console.error('[SSE] connection error:', error);
        setIsSseConnected(false);
        
        // Check if this is likely a 401 error (token expired)
        const eventSource = error.target as EventSource;
        const isUnauthorized = eventSource?.readyState === EventSource.CLOSED;
        
        if (isUnauthorized && restaurantId && isAuthenticated) {
          // Wait a bit before reconnecting to avoid rapid reconnection attempts
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to reconnect with token refresh
          try {
            console.info('[SSE] Token likely expired, attempting to refresh and reconnect...');
            const newToken = await apiClient.refreshAccessToken();
            if (newToken) {
              debugLog('[SSE] Token refreshed, reconnecting SSE...');
              console.info('[SSE] Reconnecting with refreshed token');
              // Recursively call connectSSE with new token
              await connectSSE(newToken);
            } else {
              console.warn('[SSE] Failed to refresh token - user may need to re-login');
            }
          } catch (refreshError) {
            console.error('[SSE] Failed to refresh token:', refreshError);
            // Don't reconnect if token refresh fails - user may need to re-login
          }
        } else {
          console.warn('[SSE] Connection error (not unauthorized), will not auto-reconnect');
        }
      },
      onConnect: () => {
        debugLog('SSE connected for restaurant:', restaurantId);
        console.info('[SSE] connected for restaurant', restaurantId);
        setIsSseConnected(true);
      },
      onDisconnect: () => {
        debugLog('SSE disconnected');
        console.warn('[SSE] disconnected');
        setIsSseConnected(false);
      },
      maxReconnectAttempts: 0, // Disable auto-reconnect - we handle it manually with token refresh
      reconnectDelay: 1000,
    });
  };

  // Helper function to connect SSE with token refresh if needed
  const connectSSE = async (providedToken?: string) => {
    if (!restaurantId || !isAuthenticated) {
      console.info('[SSE] connect skipped', { restaurantId, isAuthenticated });
      return;
    }

    // Disconnect existing connection if any
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
      sseClientRef.current = null;
    }

    let token = providedToken || localStorage.getItem('unified_accessToken');
    if (!token) {
      console.warn('[SSE] no access token');
      return;
    }

    // Check if token is expired or expiring soon, refresh if needed
    if (!providedToken && isTokenExpiredOrExpiringSoon(token)) {
      debugLog('Token expired or expiring soon, refreshing...');
      const newToken = await apiClient.refreshAccessToken();
      if (newToken) {
        token = newToken;
      } else {
        console.error('Failed to refresh token for SSE connection');
        return;
      }
    }

    // Create SSE client
    const sseClient = createSSEClient(token);

    // Connect to SSE endpoint
    const sseUrl = getSSEUrl(`/api/sse/restaurant/${restaurantId}/staff`, token);
    console.info('[SSE] connecting', { sseUrl: sseUrl.replace(token, '***') });
    sseClient.connect(sseUrl);

    sseClientRef.current = sseClient;
  };

  // Setup SSE connection for real-time updates
  useEffect(() => {
    connectSSE();

    // Listen for token refresh events to reconnect SSE
    const handleTokenRefresh = () => {
      if (sseClientRef.current && restaurantId) {
        const newToken = localStorage.getItem('unified_accessToken');
        if (newToken) {
          debugLog('Token refreshed, reconnecting SSE...');
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
      setIsSseConnected(false);
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
    };
  }, [restaurantId, isAuthenticated]);

  const playRequestAlert = useCallback((tableNumber: number, message: string) => {
    const chatMessage = t('msg.request_table').replace('{number}', String(tableNumber)).replace('{message}', message);
    toast.info(chatMessage);
    if (!isSoundEnabledRef.current) {
      console.info('[SSE] request alert skipped: sound disabled');
      return;
    }
    if (!notificationAudioRef.current) {
      console.warn('[SSE] request alert skipped: no audio element');
      return;
    }
    if (!isSoundUnlocked) {
      console.warn('[SSE] request alert skipped: sound locked');
      return;
    }
    notificationAudioRef.current.currentTime = 0;
    notificationAudioRef.current.play().catch((error) => {
      console.error('[SSE] request alert play failed', error);
    });
  }, [isSoundUnlocked, t]);

  const pollChatRequests = useCallback(async () => {
    if (requestAlertInFlightRef.current || !restaurantId || !isAuthenticated) {
      return;
    }
    requestAlertInFlightRef.current = true;
    try {
      const activeTables = tables.filter((table) => table.currentSessionId);
      await Promise.all(activeTables.map(async (table) => {
        const sessionId = table.currentSessionId;
        if (!sessionId) return;
        const result = await apiClient.getChatHistory(sessionId);
        if (!result.success || !result.data) return;
        const requests = result.data.filter(
          (msg: BackendChatMessage) => msg.senderType === 'USER' && msg.messageType === 'REQUEST'
        );
        const latestRequest = requests[requests.length - 1];
        if (!latestRequest) return;
        const lastNotifiedId = requestAlertLastIdRef.current.get(sessionId);
        const messageText = language === 'ko'
          ? latestRequest.textKo || ''
          : language === 'vn'
          ? latestRequest.textVn || ''
          : language === 'zh'
          ? (latestRequest as { textZh?: string }).textZh || latestRequest.textEn || ''
          : latestRequest.textEn || '';
        if (!lastNotifiedId) {
          requestAlertLastIdRef.current.set(sessionId, latestRequest.id);
          const createdAtMs = latestRequest.createdAt
            ? new Date(latestRequest.createdAt).getTime()
            : NaN;
          if (!Number.isNaN(createdAtMs) && Date.now() - createdAtMs <= 30000) {
            playRequestAlert(table.id, messageText);
          }
          return;
        }
        if (latestRequest.id !== lastNotifiedId) {
          requestAlertLastIdRef.current.set(sessionId, latestRequest.id);
          playRequestAlert(table.id, messageText);
        }
      }));
    } catch (error) {
      console.error('Failed to poll chat requests:', error);
    } finally {
      requestAlertInFlightRef.current = false;
    }
  }, [tables, restaurantId, isAuthenticated, language, playRequestAlert]);

  // SSE-only mode: polling fallback disabled

  const unlockSound = useCallback(async (): Promise<boolean> => {
    if (!notificationAudioRef.current) {
      console.warn('[SSE] sound unlock skipped: no audio element');
      setIsSoundUnlocked(false);
      isSoundUnlockedRef.current = false;
      return false;
    }
    const audio = notificationAudioRef.current;
    const tryResumeAudioContext = async () => {
      try {
        if (!audioContextRef.current) {
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          if (Ctx) {
            audioContextRef.current = new Ctx();
          }
        }
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.warn('[SSE] audio context resume failed', error);
      }
    };
    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      setIsSoundUnlocked(true);
      isSoundUnlockedRef.current = true;
      console.info('[SSE] sound unlocked');
      return true;
    } catch (error) {
      console.warn('[SSE] initial sound unlock failed', error);
      await tryResumeAudioContext();
      try {
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        setIsSoundUnlocked(true);
        isSoundUnlockedRef.current = true;
        console.info('[SSE] sound unlocked');
        return true;
      } catch (retryError) {
        console.error('Failed to unlock sound:', retryError);
        setIsSoundUnlocked(false);
        isSoundUnlockedRef.current = false;
        console.warn('[SSE] sound unlock failed');
        toast.error(t('settings.sound_activate_failed'));
        return false;
      }
    }
  }, []);

  // Handle SSE events
  const handleSSEEvent = (event: SSEEvent) => {
    switch (event.type) {
      case 'order:new':
        console.info('[SSE] order:new event received', { 
          orderId: event.orderId, 
          tableId: event.tableId, 
          tableNumber: event.tableNumber 
        });
        // Reload both tables and orders to get updated currentSessionId and new order
        loadTables().then((freshTables) => {
          console.info('[SSE] Tables reloaded, loading orders', { 
            tablesCount: freshTables?.length || 0,
            activeSessions: freshTables?.filter(t => t.currentSessionId).length || 0
          });
          loadOrders(freshTables);
        }).catch((error) => {
          console.error('[SSE] Failed to reload tables/orders after order:new', error);
        });
        toast.success(t('msg.new_order') || '새 주문이 들어왔습니다.');
        
        // Show customer request modal
        const orderTableNumber = event.tableNumber || '?';
        const orderModalKey = `order-${event.orderId || Date.now()}-${orderTableNumber}`;
        
        // Check if we've shown this modal recently (within last 2 seconds)
        if (!recentModalRequestsRef.current.has(orderModalKey)) {
          recentModalRequestsRef.current.add(orderModalKey);
          setCustomerRequestData({
            tableNumber: orderTableNumber,
            requestType: 'order',
            message: t('msg.new_order'),
          });
          setCustomerRequestModalOpen(true);
          
          // Remove from recent set after 2 seconds
          setTimeout(() => {
            recentModalRequestsRef.current.delete(orderModalKey);
          }, 2000);
        }
        
        if (isSoundEnabledRef.current && notificationAudioRef.current && isSoundUnlockedRef.current) {
          notificationAudioRef.current.currentTime = 0;
          notificationAudioRef.current.play().catch(() => {});
        }
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
        console.info('[SSE] table:status-changed event received', {
          tableId: event.tableId,
          status: event.status,
          sessionId: event.sessionId,
        });
        // Reload tables to get updated table state
        loadTables().then(() => {
          console.info('[SSE] Tables reloaded after table:status-changed');
          // Also reload orders to ensure they are displayed
          loadOrders();
        });
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
        toast.success(`${t('msg.payment_confirmed')} - ${t('table.number')} ${paymentTableNumber} (${amountFormatted}₫)`);
        break;

      case 'chat:new':
        // Show notification for new chat message
        const sessionId = event.sessionId;
        const messageText = event.message || '';
        const sender = (event.sender || 'user').toLowerCase(); // Normalize to lowercase
        const rawTableNumber = event.tableNumber ?? event.tableId;
        const numericTableNumber = typeof rawTableNumber === 'string'
          ? Number(rawTableNumber)
          : rawTableNumber;
        const resolvedTableNumber = Number.isFinite(numericTableNumber)
          ? (numericTableNumber as number)
          : tables.find((table) => table.currentSessionId === sessionId)?.id;
        const displayTableNumber = resolvedTableNumber ?? rawTableNumber ?? '?';
        
        debugLog('SSE chat:new event received:', { tableNumber: displayTableNumber, sessionId, messageText, sender, event });
        console.info('[SSE] chat:new event', { tableNumber: displayTableNumber, sessionId, messageText, sender, messageType: event.messageType });
        
        // Only show modal/toast for messages from customers (user), not from staff (staff)
        // Staff messages are already visible in the UI, no need for notification
        if (sender === 'user') {
          lastChatEventAtRef.current = Date.now();
          // Create a unique key for this modal to prevent duplicates
          const modalKey = `${sessionId}-${messageText}`;
          
          // Check if we've shown this modal recently (within last 2 seconds)
          if (recentModalRequestsRef.current.has(modalKey)) {
            debugLog('Modal already shown recently, skipping duplicate');
            return;
          }
          
          // Add to recent set
          recentModalRequestsRef.current.add(modalKey);
          
          // Check if it's a REQUEST type message
          const isRequest = event.messageType === 'REQUEST';
          
          // Show customer request modal instead of toast
          setCustomerRequestData({
            tableNumber: displayTableNumber,
            requestType: isRequest ? 'request' : 'chat',
            message: messageText || t('msg.new_message'),
          });
          setCustomerRequestModalOpen(true);
          
          // Remove from recent set after 2 seconds
          setTimeout(() => {
            recentModalRequestsRef.current.delete(modalKey);
          }, 2000);
          
          // Play notification sound
          if (!isSoundEnabledRef.current) {
            console.info('[SSE] chat:new sound skipped: sound disabled');
          } else if (!notificationAudioRef.current) {
            console.warn('[SSE] chat:new sound skipped: no audio element');
          } else if (!isSoundUnlockedRef.current) {
            console.warn('[SSE] chat:new sound skipped: sound locked');
            setShowSoundUnlockPrompt(true);
            if (!soundUnlockToastShownRef.current) {
              soundUnlockToastShownRef.current = true;
              toast.info(t('settings.sound_activate_prompt'), {
                action: {
                  label: t('settings.sound_activate'),
                  onClick: async () => {
                    const unlocked = await unlockSound();
                    if (unlocked) {
                      soundUnlockToastShownRef.current = false;
                      setShowSoundUnlockPrompt(false);
                    }
                  },
                },
              });
            }
          } else {
            notificationAudioRef.current.currentTime = 0;
            notificationAudioRef.current.play().then(() => {
              console.info('[SSE] chat:new sound played');
            }).catch((error) => {
              console.error('[SSE] chat:new sound play failed', error);
            });
          }
        }
        
        // Update request status for the specific table and reload chat messages
        // This will reload chat messages for the open table detail
        // Note: updateTableRequestStatus already handles reloading chat messages,
        // so we don't need to reload tables separately to avoid duplicate calls
        if (sessionId && chatNewHandlerRef.current && typeof resolvedTableNumber === 'number') {
          chatNewHandlerRef.current(resolvedTableNumber, sessionId, sender, event.messageType);
        }
        
        // Only reload tables if it's a customer message (to refresh request status)
        // But delay it slightly to avoid race condition with updateTableRequestStatus
        if (sender === 'user') {
          setTimeout(() => {
            loadTables();
          }, 100);
        }
        break;

      case 'chat:read':
        // Handle chat read status update from another device
        // This allows real-time synchronization of unread chat counts across devices
        // Only update if it's from the same user (same userId)
        const readSessionId = event.sessionId;
        const lastReadMessageId = event.lastReadMessageId;
        const eventUserId = event.userId;
        
        console.info('[SSE] chat:read event received', { 
          sessionId: readSessionId, 
          lastReadMessageId, 
          eventUserId,
          hasHandler: !!chatReadHandlerRef.current 
        });
        
        // Get current user's userId from JWT token
        let currentUserId: string | null = null;
        try {
          const token = localStorage.getItem('unified_accessToken');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId;
            console.info('[SSE] Current userId extracted', { currentUserId });
          }
        } catch (error) {
          console.error('[SSE] Failed to extract userId from token:', error);
        }
        
        // Only process if it's from the same user (same userId)
        if (!readSessionId || !lastReadMessageId) {
          console.warn('[SSE] chat:read event missing required fields', { readSessionId, lastReadMessageId });
          break;
        }
        
        if (!chatReadHandlerRef.current) {
          console.warn('[SSE] chat:read handler not registered yet');
          break;
        }
        
        if (eventUserId !== currentUserId) {
          debugLog('[SSE] chat:read event ignored (different user)', { eventUserId, currentUserId });
          break;
        }
        
        console.info('[SSE] Processing chat:read event', { sessionId: readSessionId, lastReadMessageId, userId: eventUserId });
        chatReadHandlerRef.current(readSessionId, lastReadMessageId).catch((error) => {
          console.error('[SSE] Failed to handle chat:read event:', error);
        });
        break;

      case 'connected':
        debugLog('SSE connected at:', event.timestamp);
        break;

      default:
        debugLog('Unknown SSE event type:', event.type);
    }
  };

  useEffect(() => {
    if (!resolvedNotificationSoundUrl || isSoundUnlocked) {
      return;
    }
    let isActive = true;
    const handleFirstInteraction = () => {
      unlockSound().then((unlocked) => {
        if (!isActive) return;
        if (unlocked) {
          window.removeEventListener('pointerdown', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
        }
      }).catch(() => {});
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      isActive = false;
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [isSoundUnlocked, unlockSound, resolvedNotificationSoundUrl]);

  useEffect(() => {
    if (!isSoundEnabled) {
      setShowSoundUnlockPrompt(false);
      soundUnlockToastShownRef.current = false;
    }
  }, [isSoundEnabled]);

  const enablePushNotifications = useCallback(async () => {
    if (!restaurantId) {
      throw new Error(t('push.restaurant_required'));
    }
    if (!checkPushSupported()) {
      throw new Error(t('push.browser_not_supported'));
    }
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error(t('push.permission_required'));
    }
    
    const keyResult = await apiClient.getVapidPublicKey();
    const publicKey = keyResult.success ? keyResult.data?.publicKey : null;
    if (!publicKey) {
      throw new Error(t('push.vapid_failed'));
    }
    
    const subscription = await subscribeToPush(publicKey);
    await apiClient.subscribePush(restaurantId, subscription);
    setIsPushEnabled(true);
    toast.success(t('push.enabled'));
    await unlockSound();
  }, [restaurantId, unlockSound, t]);

  const disablePushNotifications = useCallback(async () => {
    if (!checkPushSupported()) {
      toast.error(t('push.browser_not_supported'));
      return;
    }
    setIsDisablingPush(true);
    try {
      const subscription = await unsubscribeFromPush();
      if (!subscription) {
        setIsPushEnabled(false);
        toast.success(t('push.disabled'));
        return;
      }
      await apiClient.unsubscribePush(subscription.endpoint);
      setIsPushEnabled(false);
      toast.success(t('push.disabled'));
    } catch (error: any) {
      console.error('Failed to disable push notifications:', error);
      toast.error(error.message || t('push.disable_failed'));
    } finally {
      setIsDisablingPush(false);
    }
  }, [t]);

  const enableNotifications = useCallback(async () => {
    setIsEnablingPush(true);
    try {
      // 먼저 알림음 설정만 활성화 (Web Push 실패해도 알림음은 사용 가능하도록)
      setIsSoundEnabled(true);
      if (restaurantId) {
        try {
          await apiClient.updateNotificationPreferences(restaurantId, true);
        } catch (error) {
          console.error('Failed to update notification preferences:', error);
          // Continue even if API call fails
        }
      }
      
      // Web Push는 선택적 기능으로 처리 (실패해도 알림음은 활성화됨)
      if (!checkPushSupported()) {
        toast.success(t('push.sound_enabled'));
        setIsEnablingPush(false);
        return;
      }
      
      // Web Push 등록 시도 (실패해도 알림음은 활성화 상태 유지)
      try {
        await enablePushNotifications();
      } catch (pushError: any) {
        // Web Push 실패해도 알림음은 활성화 상태 유지
        // 콘솔 에러 대신 경고만 표시
        const errorMessage = pushError?.message || '알림 활성화 실패';
        if (errorMessage.includes('push service not available') || errorMessage.includes('Push 알림 서비스')) {
          // Web Push 서비스가 사용 불가능한 경우 조용히 처리
          console.warn('Web Push 서비스가 사용 불가능합니다. 알림음만 활성화됩니다.');
        } else {
          console.warn('Web Push 활성화 실패 (알림음은 활성화됨):', pushError);
        }
        // 사용자에게는 알림음이 활성화되었다는 메시지만 표시
        toast.success(t('push.sound_enabled'));
      }
    } catch (error: any) {
      console.error('Failed to enable notifications:', error);
      setIsSoundEnabled(false);
      toast.error(error.message || t('push.enable_failed'));
    } finally {
      setIsEnablingPush(false);
    }
  }, [enablePushNotifications, restaurantId, t]);

  const disableNotifications = useCallback(async () => {
    setIsDisablingPush(true);
    try {
      setIsSoundEnabled(false);
      if (restaurantId) {
        try {
          await apiClient.updateNotificationPreferences(restaurantId, false);
        } catch (error) {
          console.error('Failed to update notification preferences:', error);
          // Continue even if API call fails
        }
      }
      if (!checkPushSupported()) {
        return;
      }
      await disablePushNotifications();
    } catch (error: any) {
      console.error('Failed to disable notifications:', error);
      setIsSoundEnabled(true);
      toast.error(error.message || t('push.disable_failed'));
    } finally {
      setIsDisablingPush(false);
    }
  }, [disablePushNotifications, restaurantId, t]);

  const toggleSoundNotifications = useCallback(async () => {
    if (isSoundEnabled) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  }, [isSoundEnabled, disableNotifications, enableNotifications]);

  const testNotificationSound = useCallback(async () => {
    if (!resolvedNotificationSoundUrl || !notificationAudioRef.current) {
      toast.error(t('settings.sound_not_set'));
      return;
    }
    if (window.location.protocol === 'https:' && resolvedNotificationSoundUrl.startsWith('http://')) {
      toast.error(t('settings.sound_https_blocked'));
      return;
    }
    if (!isSoundUnlocked) {
      const unlocked = await unlockSound();
      if (!unlocked) {
        toast.error(t('settings.sound_please_enable'));
        return;
      }
    }
    notificationAudioRef.current.currentTime = 0;
    try {
      await notificationAudioRef.current.play();
    } catch (error) {
      console.error('Failed to play notification sound:', error);
      toast.error(t('settings.sound_play_failed'));
    }
  }, [isSoundUnlocked, resolvedNotificationSoundUrl, unlockSound, t]);

  const loadTables = async (): Promise<Table[] | null> => {
    if (!restaurantId) return;
    
    setIsLoadingTables(true);
    try {
      const result = await apiClient.getTables(restaurantId);
      if (result.success && result.data) {
        const mappedTables = result.data.map((table: BackendTable) => mapBackendTableToFrontend(table));
        setTables(mappedTables);
        return mappedTables;
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
    return null;
  };

  const loadOrders = async (tablesOverride?: Table[] | null) => {
    if (!restaurantId) return;
    
    console.info('[loadOrders] Starting to load orders', { restaurantId, tablesOverride: !!tablesOverride });
    setIsLoadingOrders(true);
    try {
      const result = await apiClient.getOrders(restaurantId);
      if (result.success && result.data) {
        const mappedOrders = result.data.map((order: BackendOrder) => {
          // Pass tableNumber from backend order if available
          const tableNumber = order.table?.tableNumber;
          return mapBackendOrderToFrontend(order, language, tableNumber);
        });
        
        // Filter orders: only include orders from active sessions
        // This prevents showing orders from ended sessions (e.g., after table reset)
        // Use provided tables (if any) to get active session IDs
        const tablesForFilter = (tablesOverride ?? tables).filter(table => table.isActive !== false);
        const activeSessionIds = new Set(
          tablesForFilter
            .map(t => t.currentSessionId)
            .filter((id): id is string => id !== null && id !== undefined)
        );
        
        console.info('[loadOrders] Filtering orders', {
          totalOrders: mappedOrders.length,
          activeSessionIds: Array.from(activeSessionIds),
          tablesCount: tablesForFilter.length,
        });
        
        const filteredOrders = mappedOrders.filter(order => {
          // Find the table for this order
          const table = tablesForFilter.find(t => t.id === order.tableId);
          
          // If table not found, exclude the order
          if (!table) {
            console.info('[loadOrders] Order excluded (table not found)', {
              orderId: order.id,
              orderTableId: order.tableId,
            });
            return false;
          }
          
          // Exclude cancelled orders
          if (order.status === 'cancelled') {
            console.info('[loadOrders] Order excluded (cancelled)', {
              orderId: order.id,
              tableId: order.tableId,
              orderStatus: order.status,
            });
            return false;
          }
          
          // Exclude orders from empty tables unless:
          // 1. Order belongs to an active session (currentSessionId matches)
          // 2. Order is very recent (within 1 minute) AND table has currentSessionId - handles timing issues during new order creation
          if (table.status === 'empty') {
            // If table has no active session (currentSessionId is null), exclude all orders
            // This prevents showing orders from previous customers after table reset
            if (!table.currentSessionId) {
              console.info('[loadOrders] Order excluded (empty table, no active session)', {
                orderId: order.id,
                tableId: order.tableId,
                tableStatus: table.status,
                tableCurrentSessionId: table.currentSessionId,
                orderSessionId: order.sessionId,
              });
              return false;
            }
            
            // Check if order belongs to active session
            if (order.sessionId && order.sessionId === table.currentSessionId) {
              console.info('[loadOrders] Order included (active session on empty table)', {
                orderId: order.id,
                tableId: order.tableId,
                sessionId: order.sessionId,
                tableCurrentSessionId: table.currentSessionId,
              });
              return true;
            }
            
            // Allow very recent orders (within 1 minute) only if table has currentSessionId
            // This handles timing issues when a new order is created but sessionId hasn't been synced yet
            const orderAge = Date.now() - order.timestamp.getTime();
            const oneMinute = 1 * 60 * 1000;
            if (orderAge < oneMinute && table.currentSessionId) {
              console.info('[loadOrders] Order included (very recent order on empty table with active session)', {
                orderId: order.id,
                tableId: order.tableId,
                tableStatus: table.status,
                orderAge,
                tableCurrentSessionId: table.currentSessionId,
              });
              return true;
            }
            
            console.info('[loadOrders] Order excluded (empty table, not recent or no active session)', {
              orderId: order.id,
              tableId: order.tableId,
              tableStatus: table.status,
              orderAge,
              orderSessionId: order.sessionId,
              tableCurrentSessionId: table.currentSessionId,
            });
            return false;
          }
          
          // Include orders that belong to active sessions
          if (order.sessionId && activeSessionIds.has(order.sessionId)) {
            console.info('[loadOrders] Order included (active session)', {
              orderId: order.id,
              tableId: order.tableId,
              sessionId: order.sessionId,
            });
            return true;
          }
          
          // ordering/dining 테이블: 현재 세션 주문만 포함 (테이블 초기화 후 이전 고객 주문 제외)
          if (table.status === 'ordering' || table.status === 'dining') {
            const orderAge = Date.now() - order.timestamp.getTime();
            const oneMinute = 1 * 60 * 1000;
            // 현재 세션 주문이거나, 세션 미동기화로 매우 최근(1분) 주문만
            if (order.sessionId && order.sessionId === table.currentSessionId) return true;
            if (!order.sessionId && orderAge < oneMinute && table.currentSessionId) return true;
            return false;
          }
          
          // 세션 갱신 지연 시 매우 최근(5분) 주문만 허용
          const orderAge = Date.now() - order.timestamp.getTime();
          const fiveMinutes = 5 * 60 * 1000;
          if (orderAge < fiveMinutes && table.currentSessionId && (!order.sessionId || order.sessionId === table.currentSessionId)) {
            return true;
          }
          
          // Exclude all other orders
          console.info('[loadOrders] Order excluded (no match)', {
            orderId: order.id,
            tableId: order.tableId,
            sessionId: order.sessionId,
            tableStatus: table.status,
          });
          return false;
        });
        
        console.info('[loadOrders] Filtered orders result', {
          filteredCount: filteredOrders.length,
          ordersByTable: filteredOrders.reduce((acc, o) => {
            acc[o.tableId] = (acc[o.tableId] || 0) + 1;
            return acc;
          }, {} as Record<number, number>),
        });
        
        setOrders(filteredOrders);
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
  // restaurantId는 shopRestaurantId (서브도메인 기반) 또는 legacyRestaurantId (URL 기반)에서 가져옴
  if (!isAuthenticated || !restaurantId) {
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
            isSoundEnabled={isSoundEnabled}
            onToggleSound={toggleSoundNotifications}
            isSoundToggling={isEnablingPush || isDisablingPush}
            onTableOpen={(tableNumber: number) => {
              // Switch to tables tab and set table to open
              setCurrentTab('tables');
              setTableToOpen(tableNumber);
            }}
          />

          {showSoundUnlockPrompt && (
            <div className="sticky top-0 z-30 px-4 pt-3">
              <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                <div>{t('settings.sound_locked_message')}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const unlocked = await unlockSound();
                      if (unlocked) {
                        setShowSoundUnlockPrompt(false);
                        soundUnlockToastShownRef.current = false;
                      }
                    }}
                    className="rounded-md bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                  >
                    {t('settings.sound_activate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSoundUnlockPrompt(false)}
                    className="rounded-md border border-amber-300 px-3 py-1 text-amber-900 hover:bg-amber-100"
                  >
                    {t('table.detail.close')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
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
                      onChatRead={(handler) => {
                        // Store handler reference for SSE event
                        chatReadHandlerRef.current = handler;
                      }}
                      tableToOpen={tableToOpen}
                      onTableOpened={() => {
                        setTableToOpen(null);
                        setInitialActiveTab('orders'); // Reset to default
                      }}
                      initialActiveTab={initialActiveTab}
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
                      notificationSoundUrl={notificationSoundUrl}
                      isPushSupported={isPushSupported}
                      isSoundEnabled={isSoundEnabled}
                      isEnablingPush={isEnablingPush}
                      isDisablingPush={isDisablingPush}
                      isSoundUnlocked={isSoundUnlocked}
                      onEnableNotifications={enableNotifications}
                      onDisableNotifications={disableNotifications}
                      onTestSound={testNotificationSound}
                   />
                )}
            </div>
          </main>

          {/* Mobile Bottom Nav */}
          <div className="md:hidden">
              <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} activeOrders={activeOrdersCount} />
          </div>
      </div>

      {/* Customer Request Modal */}
      {customerRequestData && (
        <CustomerRequestModal
          open={customerRequestModalOpen}
          onOpenChange={setCustomerRequestModalOpen}
          tableNumber={customerRequestData.tableNumber}
          requestType={customerRequestData.requestType}
          message={customerRequestData.message}
          onTableOpen={(tableNumber, tab) => {
            setInitialActiveTab(tab || 'orders');
            setTableToOpen(tableNumber);
          }}
        />
      )}
    </div>
  );
}
