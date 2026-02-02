import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Clock, BellRing, UtensilsCrossed, MessageSquare, ArrowRight, ChefHat, CircleCheck, Check, List, X, Edit2, StickyNote, ShoppingCart, RotateCcw, CheckCircle2, CreditCard, QrCode } from 'lucide-react';
import { Table, Order, WaitingEntry } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { WaitingListPanel } from './WaitingListPanel';
import { OrderEntrySheet } from './OrderEntrySheet';
import { CheckoutSheet } from './CheckoutSheet';
import { TableQRCodeModal } from './TableQRCodeModal';
import { formatPriceVND } from '../../utils/priceFormat';
import { mapBackendWaitingEntryToFrontend } from '../../utils/mappers';
import { BackendWaitingEntry, BackendChatMessage } from '../../types/api';
import ChatBubble from '../chat/ChatBubble';
import { QuickActions } from '../chat/QuickActions';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "../ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

// Simple hook for responsive design
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024); // Changed to lg for split view
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

interface TableGridProps {
  tables: Table[];
  orders: Order[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onOrdersReload?: (tablesOverride?: Table[] | null) => void | Promise<void>;
  onTablesReload?: () => Promise<Table[] | null>; // 테이블 목록 재로드, 반환값으로 주문 필터에 사용
  menu?: Array<{ id: string; name: string; imageUrl?: string }>; // Optional menu for image display
  onChatNew?: (handler: (tableId: number, sessionId: string, sender?: string, messageType?: string) => Promise<void>) => void; // 채팅 메시지 수신 시 호출되는 핸들러 등록 콜백
  onChatRead?: (handler: (sessionId: string, lastReadMessageId: string) => Promise<void>) => void; // 채팅 읽음 상태 변경 시 호출되는 핸들러 등록 콜백
  tableToOpen?: number | null; // 테이블 번호로 테이블 상세 화면 열기
  onTableOpened?: () => void; // 테이블이 열렸을 때 호출되는 콜백
  initialActiveTab?: 'orders' | 'chat'; // 테이블이 열릴 때 초기 활성 탭
}

export function TableGrid({ tables, orders, setTables, setOrders, onOrdersReload, onTablesReload, menu = [], onChatNew, onChatRead, tableToOpen, onTableOpened, initialActiveTab }: TableGridProps) {
  const debugLog = (..._args: unknown[]) => {};
  const { t, language } = useLanguage();
  const { shopRestaurantId: restaurantId, shopUserRole, shopUser } = useUnifiedAuth();
  const [detailTableId, setDetailTableId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Debug: Log shopUserRole
  useEffect(() => {
    debugLog('TableGrid shopUserRole:', shopUserRole, 'shopUser:', shopUser);
  }, [shopUserRole, shopUser]);
  
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
  const [isWaitingSheetOpen, setIsWaitingSheetOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [seatingCandidate, setSeatingCandidate] = useState<WaitingEntry | null>(null);
  const [isOrderEntryOpen, setIsOrderEntryOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isLoadingWaitingList, setIsLoadingWaitingList] = useState(false);
  const [chatMessages, setChatMessages] = useState<BackendChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [tableRequestStatus, setTableRequestStatus] = useState<Map<number, boolean>>(new Map());
  const [tableUnreadChatCount, setTableUnreadChatCount] = useState<Map<number, number>>(new Map());
  const [statusFilter, setStatusFilter] = useState<'all' | 'empty' | 'ordering' | 'dining' | 'cleaning'>('all');
  const [quickReplies, setQuickReplies] = useState<Array<{ labelKo: string; labelVn: string; labelEn?: string; labelZh?: string; messageKo?: string; messageVn?: string; messageEn?: string; messageZh?: string }>>([]);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState<{ tableNumber: number; qrCodeUrl: string } | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'chat'>('orders');
  const isDesktop = useIsDesktop();
  const chatFetchStateRef = useRef<Map<string, { lastAt: number; inFlight: boolean }>>(new Map());
  const lastChatCheckSignatureRef = useRef<string | null>(null);
  const chatLastReadBySessionRef = useRef<Map<string, string>>(new Map());
  const detailTableIdRef = useRef<number | null>(null);

  const visibleTables = useMemo(
    () => tables.filter(table => table.isActive !== false),
    [tables]
  );

  const chatCheckSignature = useMemo(() => {
    return visibleTables
      .map((table) => `${table.id}:${table.currentSessionId ?? ''}:${table.status ?? ''}`)
      .join('|');
  }, [visibleTables]);

  // Derived state for the table currently being viewed (or last viewed if closing)
  const selectedTable = visibleTables.find(t => t.id === detailTableId) || null;

  useEffect(() => {
    if (detailTableId !== null && !selectedTable) {
      setIsDetailOpen(false);
      setDetailTableId(null);
      detailTableIdRef.current = null;
    }
  }, [detailTableId, selectedTable]);

  // Load waiting list from API
  const loadWaitingList = async () => {
    if (!restaurantId) return;
    
    setIsLoadingWaitingList(true);
    try {
      const result = await apiClient.getWaitingList(restaurantId);
      if (result.success && result.data) {
        // Map backend waiting list to frontend format
        const mappedWaitingList: WaitingEntry[] = result.data.map((item: BackendWaitingEntry) => 
          mapBackendWaitingEntryToFrontend(item)
        );
        setWaitingList(mappedWaitingList);
      } else {
        console.error('Failed to load waiting list:', result.error);
      }
    } catch (error: unknown) {
      console.error('Error loading waiting list:', error);
    } finally {
      setIsLoadingWaitingList(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadWaitingList();
    }
  }, [restaurantId]);

  // Load chat messages for the selected table's active session
  // Prevent duplicate chat message reloads
  const loadingChatSessionRef = useRef<string | null>(null);
  const isLoadingChatRef = useRef(false);

  const canFetchChatHistory = useCallback((sessionId: string, minIntervalMs = 1000, force = false) => {
    const now = Date.now();
    const state = chatFetchStateRef.current.get(sessionId);
    if (state?.inFlight) {
      return false;
    }
    if (!force && state && now - state.lastAt < minIntervalMs) {
      return false;
    }
    chatFetchStateRef.current.set(sessionId, { lastAt: now, inFlight: true });
    return true;
  }, []);

  const markChatFetchDone = useCallback((sessionId: string) => {
    const state = chatFetchStateRef.current.get(sessionId);
    if (state) {
      chatFetchStateRef.current.set(sessionId, { lastAt: state.lastAt, inFlight: false });
    } else {
      chatFetchStateRef.current.set(sessionId, { lastAt: Date.now(), inFlight: false });
    }
  }, []);

  const loadChatMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setChatMessages([]);
      loadingChatSessionRef.current = null;
      return;
    }

    // Prevent duplicate reloads if already loading the same session
    if (loadingChatSessionRef.current === sessionId && isLoadingChatRef.current) {
      debugLog('Chat messages already loading for this session, skipping duplicate call');
      return;
    }

    if (!canFetchChatHistory(sessionId, 800, true)) {
      return;
    }

    loadingChatSessionRef.current = sessionId;
    isLoadingChatRef.current = true;
    setIsLoadingChat(true);
    try {
      const result = await apiClient.getChatHistory(sessionId);
      if (result.success && result.data) {
        setChatMessages(result.data);
      } else {
        console.error('Failed to load chat messages:', result.error);
        setChatMessages([]);
      }
    } catch (error: unknown) {
      console.error('Error loading chat messages:', error);
      setChatMessages([]);
    } finally {
      setIsLoadingChat(false);
      isLoadingChatRef.current = false;
      markChatFetchDone(sessionId);
      // Reset loading flag after a short delay to allow for rapid successive messages
      setTimeout(() => {
        if (loadingChatSessionRef.current === sessionId) {
          loadingChatSessionRef.current = null;
        }
      }, 500);
    }
  }, [canFetchChatHistory, markChatFetchDone]);

  // Handle tableToOpen prop - open table detail when tableToOpen is set
  useEffect(() => {
    if (tableToOpen !== null && tableToOpen !== undefined) {
      const table = visibleTables.find(t => t.id === tableToOpen);
      if (table) {
        setDetailTableId(tableToOpen);
        detailTableIdRef.current = tableToOpen;
        setIsDetailOpen(true);
        // Set initial active tab if provided
        if (initialActiveTab) {
          setActiveTab(initialActiveTab);
        }
        // Load chat messages if opening to chat tab or if chat tab is selected
        // Use a delay to ensure table state is updated
        setTimeout(() => {
          if (table.currentSessionId && (initialActiveTab === 'chat' || !initialActiveTab)) {
            // Force reload chat messages when opening table from notification
            loadChatMessages(table.currentSessionId);
          }
          if (onTableOpened) {
            onTableOpened();
          }
        }, 200);
      }
    }
  }, [tableToOpen, visibleTables, onTableOpened, initialActiveTab, loadChatMessages]);

  // Keep detailTableIdRef in sync with detailTableId
  useEffect(() => {
    detailTableIdRef.current = detailTableId;
  }, [detailTableId]);

  // Load chat messages when table detail opens or session changes
  useEffect(() => {
    if (selectedTable?.currentSessionId) {
      loadChatMessages(selectedTable.currentSessionId);
    } else {
      setChatMessages([]);
    }
  }, [selectedTable?.currentSessionId, detailTableId, loadChatMessages]);

  // Reload chat messages when switching to chat tab (especially when opened from notification)
  useEffect(() => {
    if (activeTab === 'chat' && selectedTable?.currentSessionId && isDetailOpen) {
      // Force reload chat messages when switching to chat tab
      // This ensures messages are loaded even if there was a timing issue
      const timeoutId = setTimeout(() => {
        loadChatMessages(selectedTable.currentSessionId);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, selectedTable?.currentSessionId, isDetailOpen, loadChatMessages]);

  // Note: We removed the useEffect that reloads chat messages when tables change
  // because updateTableRequestStatus already handles reloading chat messages for the open table
  // This prevents duplicate API calls

  const getUnreadChatCount = useCallback((messages: BackendChatMessage[], lastReadId?: string) => {
    if (!messages || messages.length === 0) return 0;

    const normalizedLastReadId = lastReadId ? String(lastReadId) : null;
    if (normalizedLastReadId) {
      const lastReadIndex = messages.findIndex(
        (msg: BackendChatMessage) => String(msg.id) === normalizedLastReadId
      );
      if (lastReadIndex !== -1) {
        return messages
          .slice(lastReadIndex + 1)
          .filter(
            (msg: BackendChatMessage) =>
              msg.senderType === 'USER' && msg.messageType !== 'ORDER'
          )
          .length;
      }
    }

    const lastStaffIndex = [...messages]
      .reverse()
      .findIndex((msg: BackendChatMessage) => msg.senderType === 'STAFF');
    const cutoffIndex = lastStaffIndex === -1 ? 0 : messages.length - 1 - lastStaffIndex;
    return messages
      .slice(cutoffIndex)
      .filter(
        (msg: BackendChatMessage) =>
          msg.senderType === 'USER' && msg.messageType !== 'ORDER'
      )
      .length;
  }, []);

  // Check request status for all tables when tables are loaded
  useEffect(() => {
    const checkTableRequests = async () => {
      if (visibleTables.length === 0) return;
      if (lastChatCheckSignatureRef.current === chatCheckSignature) {
        return;
      }
      lastChatCheckSignatureRef.current = chatCheckSignature;

      const sessionIds = visibleTables
        .map((table) => table.currentSessionId)
        .filter((id): id is string => Boolean(id));
      const readStatusMap: Record<string, string> = {};
      if (sessionIds.length > 0) {
        const readStatusResult = await apiClient.getChatReadStatus(sessionIds);
        if (readStatusResult.success && readStatusResult.data) {
          Object.entries(readStatusResult.data).forEach(([sessionId, lastReadMessageId]) => {
            readStatusMap[sessionId] = lastReadMessageId;
            chatLastReadBySessionRef.current.set(sessionId, lastReadMessageId);
          });
        }
      }

      const statusMap = new Map<number, boolean>();
      const unreadChatMap = new Map<number, number>();
      const checkPromises = visibleTables.map(async (table) => {
        if (table.currentSessionId) {
          const sessionId = table.currentSessionId;
          if (!canFetchChatHistory(sessionId, 5000)) {
            return;
          }
          try {
            const result = await apiClient.getChatHistory(sessionId);
            if (result.success && result.data) {
              const messages = result.data;
              // Check if there are any unreplied requests
              // A request is considered unreplied if:
              // 1. It's a REQUEST type message from USER
              // 2. There's a STAFF reply after it (to check if it's been replied to)
              const requests = messages.filter(
                (msg: BackendChatMessage) => 
                  msg.messageType === 'REQUEST' && msg.senderType === 'USER'
              );
              
              // Check if any request has a staff reply after it
              const hasUnrepliedRequest = requests.some((request: BackendChatMessage) => {
                const requestIndex = messages.findIndex((m: BackendChatMessage) => m.id === request.id);
                // Check if there's a STAFF message after this request
                const hasReply = messages.slice(requestIndex + 1).some(
                  (m: BackendChatMessage) => m.senderType === 'STAFF'
                );
                return !hasReply;
              });

              const lastReadId = readStatusMap[sessionId] || chatLastReadBySessionRef.current.get(sessionId);
              const unreadChatCount = getUnreadChatCount(messages, lastReadId);
              
              statusMap.set(table.id, hasUnrepliedRequest);
              unreadChatMap.set(table.id, unreadChatCount);
            }
          } catch (error) {
            console.error(`Failed to check requests for table ${table.id}:`, error);
            statusMap.set(table.id, false);
            unreadChatMap.set(table.id, 0);
          } finally {
            markChatFetchDone(sessionId);
          }
        } else {
          statusMap.set(table.id, false);
          unreadChatMap.set(table.id, 0);
        }
      });

      await Promise.all(checkPromises);
      setTableRequestStatus(statusMap);
      setTableUnreadChatCount(unreadChatMap);
    };

    checkTableRequests();
  }, [visibleTables, getUnreadChatCount, canFetchChatHistory, markChatFetchDone, chatCheckSignature]);

  // Update request status for a specific table (called from SSE events)
  // Also reloads chat messages if the table detail is open for this table
  const updateTableRequestStatus = useCallback(async (tableId: number, sessionId: string, sender?: string, messageType?: string) => {
    if (sender === 'user') {
      setTableUnreadChatCount(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(tableId) || 0;
        newMap.set(tableId, current + 1);
        return newMap;
      });
      if (messageType === 'REQUEST') {
        setTableRequestStatus(prev => {
          const newMap = new Map(prev);
          newMap.set(tableId, true);
          return newMap;
        });
      }
    }
    if (!canFetchChatHistory(sessionId, 1200, true)) {
      window.setTimeout(() => {
        updateTableRequestStatus(tableId, sessionId, sender, messageType);
      }, 800);
      return;
    }
    try {
      if (!chatLastReadBySessionRef.current.has(sessionId)) {
        const readStatusResult = await apiClient.getChatReadStatus([sessionId]);
        if (readStatusResult.success && readStatusResult.data?.[sessionId]) {
          chatLastReadBySessionRef.current.set(sessionId, readStatusResult.data[sessionId]);
        }
      }
      const result = await apiClient.getChatHistory(sessionId);
      if (result.success && result.data) {
        const messages = result.data;
        // Check if there are any unreplied requests
        const requests = messages.filter(
          (msg: BackendChatMessage) => 
            msg.messageType === 'REQUEST' && msg.senderType === 'USER'
        );
        
        // Check if any request has a staff reply after it
        const hasUnrepliedRequest = requests.some((request: BackendChatMessage) => {
          const requestIndex = messages.findIndex((m: BackendChatMessage) => m.id === request.id);
          // Check if there's a STAFF message after this request
          const hasReply = messages.slice(requestIndex + 1).some(
            (m: BackendChatMessage) => m.senderType === 'STAFF'
          );
          return !hasReply;
        });
        
        setTableRequestStatus(prev => {
          const newMap = new Map(prev);
          newMap.set(tableId, hasUnrepliedRequest);
          return newMap;
        });
        const lastReadId = chatLastReadBySessionRef.current.get(sessionId);
        const unreadChatCount = getUnreadChatCount(messages, lastReadId);
        setTableUnreadChatCount(prev => {
          const newMap = new Map(prev);
          newMap.set(tableId, unreadChatCount);
          return newMap;
        });

        // If the table detail is open for this table, reload chat messages immediately
        // This ensures both REQUEST and TEXT messages are displayed in real-time
        // Use ref to get the latest detailTableId value to avoid stale closure
        const currentDetailTableId = detailTableIdRef.current;
        const currentSelectedTable = visibleTables.find(t => t.id === currentDetailTableId);
        if (currentDetailTableId === tableId && currentSelectedTable?.currentSessionId === sessionId) {
          debugLog('Reloading chat messages for open table detail', { tableId, sessionId, currentDetailTableId });
          await loadChatMessages(sessionId);
        }
      }
    } catch (error) {
      console.error(`Failed to update request status for table ${tableId}:`, error);
    } finally {
      markChatFetchDone(sessionId);
    }
  }, [detailTableId, visibleTables, loadChatMessages, getUnreadChatCount, canFetchChatHistory, markChatFetchDone]);

  const handleChatTabOpen = useCallback(async (tableId: number, lastMessageId?: string) => {
    if (lastMessageId) {
      const sessionId = visibleTables.find((table) => table.id === tableId)?.currentSessionId || null;
      if (sessionId) {
        console.info('[TableGrid] handleChatTabOpen: marking chat as read', { tableId, sessionId, lastMessageId });
        const result = await apiClient.markChatRead(sessionId, String(lastMessageId));
        if (result.success) {
          chatLastReadBySessionRef.current.set(sessionId, String(lastMessageId));
          // Update local state immediately for this device
          // Other devices will receive the SSE event and update via handleChatRead
          // For this device, we also need to recalculate to ensure consistency
          try {
            const chatResult = await apiClient.getChatHistory(sessionId);
            if (chatResult.success && chatResult.data) {
              const messages = chatResult.data;
              const unreadChatCount = getUnreadChatCount(messages, String(lastMessageId));
              setTableUnreadChatCount(prev => {
                const newMap = new Map(prev);
                newMap.set(tableId, unreadChatCount);
                return newMap;
              });
            } else {
              // Fallback: set to 0 if we can't recalculate
              setTableUnreadChatCount(prev => {
                const newMap = new Map(prev);
                newMap.set(tableId, 0);
                return newMap;
              });
            }
          } catch (error) {
            console.error('[TableGrid] handleChatTabOpen: failed to recalculate count', error);
            // Fallback: set to 0
            setTableUnreadChatCount(prev => {
              const newMap = new Map(prev);
              newMap.set(tableId, 0);
              return newMap;
            });
          }
        } else {
          console.warn('[TableGrid] handleChatTabOpen: markChatRead failed', { result });
        }
      } else {
        console.warn('[TableGrid] handleChatTabOpen: sessionId not found', { tableId });
      }
    } else {
      // If no lastMessageId, just set count to 0
      setTableUnreadChatCount(prev => {
        const newMap = new Map(prev);
        newMap.set(tableId, 0);
        return newMap;
      });
    }
  }, [visibleTables, getUnreadChatCount]);

  // Handle chat read status update from SSE event (when another device marks chat as read)
  const handleChatRead = useCallback(async (sessionId: string, lastReadMessageId: string) => {
    console.info('[TableGrid] handleChatRead called', { sessionId, lastReadMessageId });
    
    // Update the last read message ID for this session
    chatLastReadBySessionRef.current.set(sessionId, lastReadMessageId);
    
    // Find the table that uses this sessionId
    const table = visibleTables.find((t) => t.currentSessionId === sessionId);
    if (!table) {
      console.warn('[TableGrid] handleChatRead: table not found for sessionId', { sessionId, visibleTablesCount: visibleTables.length });
      return;
    }

    console.info('[TableGrid] handleChatRead: found table', { tableId: table.id, tableNumber: table.tableNumber });

    // Recalculate unread chat count for this table
    try {
      const result = await apiClient.getChatHistory(sessionId);
      if (result.success && result.data) {
        const messages = result.data;
        const unreadChatCount = getUnreadChatCount(messages, lastReadMessageId);
        console.info('[TableGrid] handleChatRead: recalculated unread count', { 
          tableId: table.id, 
          unreadChatCount, 
          lastReadMessageId,
          totalMessages: messages.length 
        });
        setTableUnreadChatCount(prev => {
          const newMap = new Map(prev);
          newMap.set(table.id, unreadChatCount);
          return newMap;
        });
      } else {
        console.warn('[TableGrid] handleChatRead: failed to get chat history', { result });
      }
    } catch (error) {
      console.error(`[TableGrid] Failed to recalculate unread count for table ${table.id}:`, error);
    }
  }, [visibleTables, getUnreadChatCount]);

  // Expose updateTableRequestStatus to parent component via callback
  useEffect(() => {
    if (onChatNew) {
      // Store the function reference so parent can call it
      onChatNew(updateTableRequestStatus);
    }
  }, [onChatNew, updateTableRequestStatus]);

  // Expose handleChatRead to parent component via callback
  useEffect(() => {
    if (onChatRead) {
      // Store the function reference so parent can call it
      onChatRead(handleChatRead);
    }
  }, [onChatRead, handleChatRead]);

  // Load quick reply chips from API
  useEffect(() => {
    const loadQuickReplies = async () => {
      if (!restaurantId) return;
      
      try {
        debugLog('Loading quick reply chips for restaurant:', restaurantId);
        const response = await apiClient.getQuickChips(restaurantId, 'STAFF_RESPONSE');
        debugLog('Quick reply chips response:', response);
        
        if (response.success && response.data) {
          // Convert to format used in the component
          const replies = response.data.map((chip) => ({
            labelKo: chip.labelKo,
            labelVn: chip.labelVn,
            labelEn: chip.labelEn,
            labelZh: chip.labelZh,
            messageKo: chip.messageKo || chip.labelKo,
            messageVn: chip.messageVn || chip.labelVn,
            messageEn: chip.messageEn || chip.labelEn,
            messageZh: chip.messageZh || chip.labelZh,
          }));
          setQuickReplies(replies);
        } else {
          console.error('Failed to load quick reply chips:', response.error);
          // Fallback to empty array
          setQuickReplies([]);
        }
      } catch (error) {
        console.error('Failed to load quick reply chips:', error);
        // Fallback to empty array
        setQuickReplies([]);
      }
    };
    
    loadQuickReplies();
  }, [restaurantId]);

  // Prevent duplicate message sending
  const sendingMessageRef = useRef<Set<string>>(new Set());

  const handleReply = async (orderIdOrSessionId: string, message: string) => {
    // Create a unique key for this message to prevent duplicates
    const messageKey = `${orderIdOrSessionId}-${message}-${Date.now()}`;
    
    // Check if this exact message is already being sent
    if (sendingMessageRef.current.has(messageKey)) {
      debugLog('Message already being sent, skipping duplicate');
      return;
    }

    // Add to sending set
    sendingMessageRef.current.add(messageKey);

    try {
      let sessionId: string | undefined;

      // Check if orderIdOrSessionId is a sessionId (from chat input) or an order/chat message ID
      // If it's a sessionId, use it directly
      // Otherwise, try to find the sessionId from order or chat message
      if (selectedTable?.currentSessionId === orderIdOrSessionId) {
        // This is a sessionId from chat input
        sessionId = orderIdOrSessionId;
      } else {
        // Check if this is a chat message ID
        const chatMessage = chatMessages.find((msg: BackendChatMessage) => msg.id === orderIdOrSessionId);
        
        if (chatMessage) {
          // This is a chat message ID, use the sessionId from the message
          sessionId = chatMessage.sessionId || undefined;
        } else {
          // This is an order/request ID, find in tableOrders
          const order = tableOrders.find((o: any) => o.id === orderIdOrSessionId);
          if (!order || !order.sessionId) {
            // Fallback: use selectedTable's currentSessionId
            sessionId = selectedTable?.currentSessionId || undefined;
          } else {
            sessionId = order.sessionId;
          }
        }
      }

      if (!sessionId) {
        toast.error('세션 정보를 찾을 수 없습니다.');
        sendingMessageRef.current.delete(messageKey);
        return;
      }

      // Get message text in current language
      let textKo = '';
      let textVn = '';
      let textEn = '';

      if (language === 'ko') {
        textKo = message;
        textVn = message; // Fallback to same text
        textEn = message;
      } else if (language === 'vn') {
        textVn = message;
        textKo = message;
        textEn = message;
      } else if (language === 'zh') {
        textEn = message;
        textKo = message;
        textVn = message;
      } else {
        textEn = message;
        textKo = message;
        textVn = message;
      }

      // Send message via API
      const result = await apiClient.sendMessage({
        sessionId,
        senderType: 'STAFF',
        textKo,
        textVn,
        textEn,
        messageType: 'TEXT',
      });

      if (result.success) {
        // Don't show toast here - SSE event will handle it for customer messages
        
        // Reload chat messages immediately to show the sent message
        // Note: STAFF messages don't trigger SSE chat:new event, so we need to reload here
        // For USER messages, SSE will also trigger reload, but that's okay - it's idempotent
        if (selectedTable?.currentSessionId) {
          await loadChatMessages(selectedTable.currentSessionId);
        }
      } else {
        throw new Error(result.error?.message || 'Failed to send message');
      }
    } catch (error: unknown) {
      console.error('Error sending reply:', error);
      toast.error('답장 전송에 실패했습니다.');
    } finally {
      // Remove from sending set after a delay to allow for rapid successive messages
      setTimeout(() => {
        sendingMessageRef.current.delete(messageKey);
      }, 1000);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
      // Don't allow status updates for chat message requests (they have 'chat-' prefix)
      if (orderId.startsWith('chat-')) {
        toast.error('요청 사항은 주문 상태를 변경할 수 없습니다.');
        return;
      }

      // Check if this is a request type order
      const order = orders.find(o => o.id === orderId);
      if (order && order.type === 'request') {
        toast.error('요청 사항은 주문 상태를 변경할 수 없습니다.');
        return;
      }

      setUpdatingOrderId(orderId);
      try {
        // Map frontend status to backend status (uppercase)
        const backendStatus = newStatus.toUpperCase();
        const result = await apiClient.updateOrderStatus(orderId, backendStatus);
        
        if (result.success) {
          // Update local state optimistically
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
          
          // Reload orders to ensure consistency
          if (onOrdersReload) {
            onOrdersReload();
          }
          
          if (newStatus === 'served') {
            toast.success(t('msg.completed'));
          } else if (newStatus === 'cooking') {
            toast.success(t('msg.cooking_started') || '조리를 시작했습니다.');
          }
        } else {
          throw new Error(result.error?.message || 'Failed to update order status');
        }
    } catch (error: unknown) {
      console.error('Error updating order status:', error);
      toast.error(t('msg.update_failed') || '주문 상태 업데이트에 실패했습니다.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSeatGuest = (entry: WaitingEntry) => {
    setSeatingCandidate(entry);
    if (!isDesktop) setIsWaitingSheetOpen(false);
    toast(t('table.detail.select_table'), {
      icon: <User size={16} />,
      description: `${entry.name} (${entry.guests} ${t('table.guests')})`
    });
  };

  const confirmSeating = async (tableId: number) => {
    if (!seatingCandidate || !restaurantId) return;

    try {
      // Update waiting list status to SEATED via API
      const result = await apiClient.updateWaitingListStatus(seatingCandidate.id, 'SEATED');
      
      if (result.success) {
        // Update table status locally
        setTables(prev => prev.map(t => 
          t.id === tableId 
            ? { ...t, status: 'ordering', guests: seatingCandidate.guests, orderTime: new Date(), totalAmount: 0 }
            : t
        ));

        // Reload waiting list to get updated data
        await loadWaitingList();

        setSeatingCandidate(null);
        toast.success(t('msg.wait_seated'));
      } else {
        throw new Error(result.error?.message || 'Failed to update waiting list status');
      }
    } catch (error: unknown) {
      console.error('Error confirming seating:', error);
      toast.error('좌석 배정에 실패했습니다.');
    }
  };

  const getStatusStyle = (status: Table['status']) => {
    switch (status) {
      case 'empty': return 'bg-white border-zinc-100/50 text-zinc-300';
      case 'ordering': return 'bg-orange-50/50 border-orange-100 text-orange-900';
      case 'dining': return 'bg-emerald-50/50 border-emerald-100 text-emerald-900';
      case 'cleaning': return 'bg-blue-50/50 border-blue-100 text-blue-900';
      default: return 'bg-white';
    }
  };

  const getIndicatorColor = (status: Table['status']) => {
    switch (status) {
      case 'empty': return 'bg-zinc-200';
      case 'ordering': return 'bg-orange-400';
      case 'dining': return 'bg-emerald-400';
      case 'cleaning': return 'bg-blue-400';
      default: return 'bg-zinc-200';
    }
  };

  // Filter orders for the selected table (include served orders for checkout)
  // Don't show orders if table is empty or cleaning (previous customer's orders should not be visible)
  // Only show orders from the active session to prevent showing previous customer's orders
  const filteredOrders = selectedTable 
    ? orders
        .filter(o => {
          // Filter by table number
          if (o.tableId !== selectedTable.id || o.status === 'cancelled') {
            return false;
          }
          
          // Always show orders for this table if they match the table number
          // The main filtering is done in loadOrders(), so here we just need to match by tableId
          // Show orders if:
          // 1. Order has matching sessionId (if table has currentSessionId)
          // 2. Order is recent (within 2 hours) and table is ordering/dining
          // 3. Order is very recent (within 5 minutes) regardless of table status
          
          const orderAge = Date.now() - o.timestamp.getTime();
          const twoHours = 2 * 60 * 60 * 1000;
          const fiveMinutes = 5 * 60 * 1000;
          const oneMinute = 1 * 60 * 1000;
          
          // If table is cleaning, only show very recent orders (within 5 minutes)
          // This handles the case where order was just created but table status hasn't updated yet
          if (selectedTable.status === 'cleaning') {
            return orderAge < fiveMinutes;
          }
          
          // For empty tables: only show orders if table has an active session (currentSessionId)
          // This prevents showing orders from previous customers after table reset
          if (selectedTable.status === 'empty') {
            // If table has no active session, exclude all orders
            if (!selectedTable.currentSessionId) {
              return false;
            }
            // If order belongs to active session, show it
            if (o.sessionId && o.sessionId === selectedTable.currentSessionId) {
              return true;
            }
            // Allow very recent orders (within 1 minute) only if table has currentSessionId
            // This handles timing issues when a new order is created but sessionId hasn't been synced yet
            return orderAge < oneMinute && !!selectedTable.currentSessionId;
          }
          
          // If table has an active session, show ONLY orders from that session
          // (테이블 초기화 후 이전 고객 주문이 새 고객 주문과 함께 보이지 않도록)
          if (selectedTable.currentSessionId) {
            if (o.sessionId && o.sessionId === selectedTable.currentSessionId) {
              return true;
            }
            // 세션 ID가 아직 안 붙은 매우 최근 주문만 허용 (주문 직후 동기화 지연 대비)
            if (!o.sessionId && orderAge < oneMinute) {
              return true;
            }
            return false;
          }
          
          // 테이블에 활성 세션이 없는데 ordering/dining인 경우 (세션 갱신 지연 시 최근 주문만)
          if (selectedTable.status === 'ordering' || selectedTable.status === 'dining') {
            return orderAge < fiveMinutes;
          }
          
          return false;
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];

  const tableOrders = [...filteredOrders].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const handleSmartAction = async () => {
    if (!selectedTable || !selectedTable.tableId) return;

    // If dining status, open checkout sheet instead of directly changing to cleaning
    if (selectedTable.status === 'dining') {
      // Check if there are served or delivered orders (eligible for checkout)
      const servedOrdersForTable = orders.filter(
        o => o.tableId === selectedTable.id && (o.status === 'served' || o.status === 'delivered')
      );
      
      if (servedOrdersForTable.length > 0) {
        setIsCheckoutOpen(true);
        return;
      } else {
        // No served orders, proceed directly to cleaning
        await updateTableToCleaning();
        return;
      }
    }

    let newStatus: Table['status'] = selectedTable.status;
    let updates: Partial<Table> = {};

    switch (selectedTable.status) {
      case 'empty':
        newStatus = 'ordering';
        // Use the current guests count if set, otherwise default to 2
        const guestsCount = selectedTable.guests > 0 ? selectedTable.guests : 2;
        updates = { guests: guestsCount, orderTime: new Date(), totalAmount: 0 };
        break;
      case 'ordering':
        // If there are served orders, open checkout sheet for payment
        // No need to change to dining status - payment can be done while ordering
        const servedOrdersForTable = orders.filter(
          o => o.tableId === selectedTable.id && 
               o.status === 'served' &&
               o.type === 'order'
        );
        
        if (servedOrdersForTable.length > 0) {
          // Open checkout sheet for payment
          setIsCheckoutOpen(true);
          return;
        } else {
          toast.error(t('table.error.no_served_orders') || '서빙 완료된 메뉴가 없습니다. 먼저 서빙을 완료해주세요.');
          return;
        }
      case 'cleaning':
        newStatus = 'empty';
        // Reset guests count when table becomes empty
        updates = { guests: 0, totalAmount: 0, orderTime: undefined };
        break;
    }

    // Update table status in backend
    try {
      const backendStatus = newStatus.toUpperCase();
      const result = await apiClient.updateTableStatus(selectedTable.tableId, backendStatus);
      
      if (result.success) {
        // Reload tables from backend to get accurate state (especially guests count from active session)
        if (onTablesReload) {
          // Wait for tables to reload before closing panel
          await onTablesReload();
        } else {
          // Fallback: Update local state if reload callback is not available
          setTables(prev => prev.map(t => 
              t.id === selectedTable.id 
                  ? { ...t, status: newStatus, ...updates }
                  : t
          ));
        }

        // If table becomes empty, close the panel
        if (newStatus === 'empty') {
            setIsDetailOpen(false);
        }
      } else {
        throw new Error(result.error?.message || 'Failed to update table status');
      }
    } catch (error: unknown) {
      console.error('Error updating table status:', error);
      toast.error(t('table.error.update_failed'));
    }
  };

  const handleResetTableClick = () => {
    if (!selectedTable || !selectedTable.tableId) return;
    setIsResetDialogOpen(true);
  };

  const handleResetTableConfirm = async () => {
    if (!selectedTable || !selectedTable.tableId) return;
    
    setIsResetDialogOpen(false);

    try {
      const result = await apiClient.resetTable(selectedTable.tableId);
      
      if (result.success) {
        // Reload tables from backend to get new currentSessionId
        const freshTables = onTablesReload ? await onTablesReload() : null;
        if (!onTablesReload) {
          setTables(prev => prev.map(t => 
            t.id === selectedTable.id 
              ? { ...t, status: 'empty', guests: 0, totalAmount: 0, orderTime: undefined }
              : t
          ));
        }

        // Reload orders using fresh tables so 이전 세션 주문이 목록에 남지 않음
        if (onOrdersReload) {
          await onOrdersReload(freshTables ?? undefined);
        }

        // Close detail panel since table is now empty
        setIsDetailOpen(false);

        toast.success(t('table.reset.success').replace('{id}', String(selectedTable.id)));
      } else {
        throw new Error(result.error?.message || 'Failed to reset table');
      }
    } catch (error: unknown) {
      console.error('Error resetting table:', error);
      toast.error(t('table.reset.failed'));
    }
  };

  const updateTableToCleaning = async () => {
    if (!selectedTable || !selectedTable.tableId) return;

    try {
      const result = await apiClient.updateTableStatus(selectedTable.tableId, 'CLEANING');
      
      if (result.success) {
        // Reload tables from backend to get accurate state
        if (onTablesReload) {
          await onTablesReload();
        } else {
          // Fallback: Update local state if reload callback is not available
          setTables(prev => prev.map(t => 
              t.id === selectedTable.id 
                  ? { ...t, status: 'cleaning', totalAmount: 0, orderTime: undefined, guests: 0 }
                  : t
          ));
        }
      } else {
        throw new Error(result.error?.message || 'Failed to update table status');
      }
    } catch (error: unknown) {
      console.error('Error updating table status:', error);
      toast.error(t('table.error.update_failed'));
    }
  };

  const handleCheckoutComplete = () => {
    // Update table status to cleaning after checkout
    updateTableToCleaning();
    
    // Reload orders to refresh the list
    if (onOrdersReload) {
      onOrdersReload();
    }
  };

  const getActionButtonText = (status: Table['status'], hasServedOrders: boolean = false) => {
      switch (status) {
          case 'empty': return t('table.action.seat_guests');
          case 'ordering': 
            // If there are served orders, show "결제" (Payment) instead of "식사 시작" (Start Dining)
            return hasServedOrders ? (t('table.action.checkout') || '결제') : t('table.action.start_dining');
          case 'dining': return t('table.action.checkout_clear');
          case 'cleaning': return t('table.action.mark_cleaned');
          default: return t('table.action.manage');
      }
  };

  const getActionButtonColor = (status: Table['status']) => {
    switch (status) {
        case 'empty': return 'bg-primary text-primary-foreground hover:bg-primary/90';
        case 'ordering': return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
        case 'dining': return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
        case 'cleaning': return 'bg-accent text-accent-foreground hover:bg-accent/90';
        default: return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };

  const openTableDetail = (tableId: number) => {
    setDetailTableId(tableId);
    detailTableIdRef.current = tableId;
    setActiveTab('orders'); // Reset to orders tab when opening table detail
    setIsDetailOpen(true);
  };

  const closeTableDetail = () => {
    setIsDetailOpen(false);
    // We don't clear detailTableId here so animation can play with data
  };

  const handleUpdateGuests = async (newGuests: number) => {
    if (!selectedTable || !detailTableId || !selectedTable.tableId || !restaurantId) return;
    if (newGuests < 0 || newGuests > selectedTable.capacity) {
        toast.error(t('table.error.guest_range').replace('{min}', '0').replace('{max}', selectedTable.capacity.toString()));
        return;
    }
    
    try {
      // Update guest count in backend (updates or creates session)
      const result = await apiClient.updateTableGuestCount(selectedTable.tableId, restaurantId, newGuests);
      
      if (result.success) {
        // Reload tables to get updated state from backend
        if (onTablesReload) {
          await onTablesReload();
        } else {
          // Fallback: Update local state if reload callback is not available
          setTables(prev => prev.map(t => 
              t.id === detailTableId 
                  ? { ...t, guests: newGuests }
                  : t
          ));
        }
        toast.success(t('table.success.guest_updated'));
      } else {
        throw new Error(result.error?.message || '인원수 업데이트에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('Error updating guest count:', error);
      const errorMessage = error instanceof Error ? error.message : '인원수 업데이트에 실패했습니다.';
      toast.error(errorMessage);
    }
  };

  const handleUpdateMemo = (newMemo: string) => {
    if (!selectedTable || !detailTableId) return;
    setTables(prev => prev.map(t => 
        t.id === detailTableId 
            ? { ...t, memo: newMemo }
            : t
    ));
    toast.success(t('table.success.memo_updated'));
  };

  // Reusable header content for both Sheet and Drawer
  const renderHeaderContent = (TitleComponent: React.ElementType, DescriptionComponent: React.ElementType) => {
    if (!selectedTable) {
        return (
            <>
                <TitleComponent className="sr-only">Table Details</TitleComponent>
                <DescriptionComponent className="sr-only">Table details panel</DescriptionComponent>
            </>
        );
    }
    
    // Calculate table status badge using the same logic as table cards
    // Priority: 청소중 > 결제완료 > 서빙완료 > 조리중 > 식사중 > 주문완료 > 주문중
    const tableOrdersForStatus = tableOrders.filter((o: any) => o.type === 'order');
    const pendingOrders = tableOrdersForStatus.filter((o: any) => o.status === 'pending');
    const cookingOrders = tableOrdersForStatus.filter((o: any) => o.status === 'cooking');
    const servedOrders = tableOrdersForStatus.filter((o: any) => o.status === 'served');
    const deliveredOrders = tableOrdersForStatus.filter((o: any) => o.status === 'delivered');
    const paidOrders = tableOrdersForStatus.filter((o: any) => o.status === 'paid');
    
    let statusLabel = '';
    if (selectedTable.status === 'cleaning') {
      statusLabel = t('table.status.cleaning') || '청소중';
    } else if (selectedTable.status === 'dining' && paidOrders.length > 0) {
      statusLabel = t('payment.status.completed') || '결제완료';
    } else if (cookingOrders.length > 0) {
      statusLabel = t('order.status.cooking') || '조리중';
    } else if ((servedOrders.length > 0 || deliveredOrders.length > 0) && paidOrders.length === 0) {
      // 서빙완료 - 조리/서빙 완료된 주문이 있고 결제가 완료되지 않은 경우
      statusLabel = t('order.status.served') || '서빙완료';
    } else if (selectedTable.status === 'dining' && paidOrders.length === 0) {
      statusLabel = t('order.status.served') || '서빙완료';
    } else if (selectedTable.status === 'ordering' && pendingOrders.length === 0 && tableOrdersForStatus.length > 0 && (cookingOrders.length > 0 || servedOrders.length > 0 || deliveredOrders.length > 0 || paidOrders.length > 0)) {
      statusLabel = t('order.status.completed') || '주문완료';
    } else if (selectedTable.status === 'ordering') {
      statusLabel = t('status.ordering') || '주문중';
    } else {
      // Fallback to table status
      statusLabel = t(`status.${selectedTable.status}`) || selectedTable.status;
    }
    
    // Calculate pending orders count and unread chat count for tabs
    const pendingOrdersCount = tableOrdersForStatus.filter((o: any) => o.status === 'pending').length;
    const unreadChatCount = tableUnreadChatCount.get(detailTableId ?? -1) || 0;
    
    return (
        <div className="bg-card border-b border-border sticky top-0 z-10">
            <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-lg font-bold">
                        {selectedTable.id}
                    </div>
                    <div>
                        <TitleComponent className="text-base font-semibold text-foreground flex items-center gap-2 mb-0.5">
                            <span>{t('table.detail.orders')}</span>
                            <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                {statusLabel}
                            </span>
                        </TitleComponent>
                        <DescriptionComponent className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-1">
                                <User size={11} className="text-muted-foreground" />
                                <span className="font-medium text-foreground">{selectedTable.guests}</span>
                                <span className="text-muted-foreground">/</span>
                                <span>{selectedTable.capacity}</span>
                            </span>
                            {selectedTable.orderTime && (
                                <>
                                    <span className="w-0.5 h-0.5 rounded-full bg-border"></span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={11} className="text-muted-foreground" />
                                        <span className="font-medium text-foreground font-mono">
                                            {Math.floor((Date.now() - selectedTable.orderTime.getTime()) / 60000)}
                                        </span>
                                        <span>분</span>
                                    </span>
                                </>
                            )}
                        </DescriptionComponent>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{t('table.detail.total')}</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatPriceVND(
                        tableOrders
                          .filter((o: any) => o.type === 'order')
                          .reduce((sum: number, order: any) => {
                            if (!order.items || order.items.length === 0) return sum;
                            const orderTotal = order.items.reduce((itemSum: number, item: any) => {
                              return itemSum + (item.price || 0);
                            }, 0);
                            return sum + orderTotal;
                          }, 0)
                      )}
                    </p>
                </div>
            </div>
            {/* Tabs Menu */}
            <div className="px-4 pb-2">
                <Tabs value={activeTab} onValueChange={(value) => {
                    const nextTab = value as 'orders' | 'chat';
                    setActiveTab(nextTab);
                    if (nextTab === 'chat' && selectedTable?.id && handleChatTabOpen) {
                        const lastMessageId = chatMessages[chatMessages.length - 1]?.id;
                        handleChatTabOpen(selectedTable.id, lastMessageId ? String(lastMessageId) : undefined);
                    }
                }} className="w-full">
                    <TabsList className="bg-muted/60 p-0.5 h-9 w-full gap-1 rounded-lg">
                        <TabsTrigger value="orders" className="flex-1 gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-md border-0">
                            <ShoppingCart size={14} />
                            {t('table.detail.orders')}
                            {pendingOrdersCount > 0 && (
                                <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full !bg-rose-500 !text-white text-[10px] font-bold shadow-sm">
                                    {pendingOrdersCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="flex-1 gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-md border-0">
                            <MessageSquare size={14} />
                            {t('table.detail.chat')}
                            {unreadChatCount > 0 && (
                                <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full !bg-rose-500 !text-white text-[10px] font-bold shadow-sm">
                                    {unreadChatCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Main Table Grid Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 pb-32 md:pb-6">
          {!isDesktop && (
             <button 
               onClick={() => setIsWaitingSheetOpen(true)}
               className="w-full mb-4 bg-white border border-zinc-200 rounded-xl p-3 flex items-center justify-between shadow-sm active:scale-[0.99] transition-transform"
             >
               <div className="flex items-center gap-3">
                 <div className="bg-zinc-900 text-white p-2 rounded-lg">
                   <List size={18} />
                 </div>
                 <div className="text-left">
                   <p className="font-bold text-sm text-zinc-900">{t('wait.title')}</p>
                   <p className="text-xs text-zinc-500">{waitingList.filter(w => w.status === 'waiting' || w.status === 'notified').length} {t('table.detail.parties_waiting')}</p>
                 </div>
               </div>
               <div className="bg-rose-50 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-full">
                 View
               </div>
             </button>
          )}

          {seatingCandidate && (
            <div className="mb-4 bg-zinc-900 text-white p-4 rounded-xl shadow-lg animate-in slide-in-from-top-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Seating: {seatingCandidate.name}</p>
                <p className="text-xs opacity-70">{t('table.detail.select_empty_table')}</p>
              </div>
              <button 
                onClick={() => setSeatingCandidate(null)}
                className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="mb-4 overflow-x-auto">
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <TabsList className="bg-transparent p-0 mb-0 w-fit inline-flex gap-2 whitespace-nowrap">
                <TabsTrigger
                  value="all"
                  className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10"
                  aria-label={`전체 (${visibleTables.length})`}
                >
                  <List size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">
                    전체 ({visibleTables.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="empty"
                  className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10"
                  aria-label={`${t('status.empty')} (${visibleTables.filter(t => t.status === 'empty').length})`}
                >
                  <CircleCheck size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">
                    {t('status.empty')} ({visibleTables.filter(t => t.status === 'empty').length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="ordering"
                  className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10"
                  aria-label={`${t('status.ordering')} (${visibleTables.filter(t => t.status === 'ordering').length})`}
                >
                  <Clock size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">
                    {t('status.ordering')} ({visibleTables.filter(t => t.status === 'ordering').length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="dining"
                  className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10"
                  aria-label={`${t('status.dining')} (${visibleTables.filter(t => t.status === 'dining').length})`}
                >
                  <UtensilsCrossed size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">
                    {t('status.dining')} ({visibleTables.filter(t => t.status === 'dining').length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="cleaning"
                  className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10"
                  aria-label={`${t('status.cleaning')} (${visibleTables.filter(t => t.status === 'cleaning').length})`}
                >
                  <RotateCcw size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">
                    {t('status.cleaning')} ({visibleTables.filter(t => t.status === 'cleaning').length})
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filtered Tables Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleTables
              .filter(table => statusFilter === 'all' || table.status === statusFilter)
              .map(table => {
              // Get all orders for this table (exclude cancelled orders)
              // Allow orders even for empty tables if they are recent (within 5 minutes)
              // This handles the case where order was just created but table status hasn't updated yet
              const tableOrders = orders.filter(o => {
                const matches = o.tableId === table.id && 
                  o.type === 'order' && 
                  o.status !== 'cancelled';
                
                if (!matches) {
                  return false;
                }
                
                // If table is empty, only show very recent orders (within 5 minutes)
                // This prevents showing stale orders from previous sessions
                if (table.status === 'empty') {
                  const orderAge = Date.now() - o.timestamp.getTime();
                  const fiveMinutes = 5 * 60 * 1000;
                  const isRecent = orderAge < fiveMinutes;
                  console.info('[TableGrid] Order check for empty table', {
                    orderId: o.id,
                    orderTableId: o.tableId,
                    tableId: table.id,
                    tableStatus: table.status,
                    orderAge,
                    isRecent,
                  });
                  return isRecent;
                }
                
                // For non-empty tables, show all matching orders
                console.info('[TableGrid] Order included for table', {
                  orderId: o.id,
                  orderTableId: o.tableId,
                  tableId: table.id,
                  tableStatus: table.status,
                  orderStatus: o.status,
                });
                return true;
              });
              const pendingOrders = tableOrders.filter(o => o.status === 'pending');
              const cookingOrders = tableOrders.filter(o => o.status === 'cooking');
              const servedOrders = tableOrders.filter(o => o.status === 'served');
              const deliveredOrders = tableOrders.filter(o => o.status === 'delivered');
              const paidOrders = tableOrders.filter(o => o.status === 'paid');
              const pendingOrdersCount = pendingOrders.length;
              
              // Check for active requests from tableRequestStatus map
              const hasRequestFromStatus = tableRequestStatus.get(table.id) || false;
              const activeRequestFromOrders = orders.find(o => o.tableId === table.id && o.status === 'pending' && o.type === 'request');
              const activeRequest = hasRequestFromStatus || activeRequestFromOrders;
              const unreadChatCount = tableUnreadChatCount.get(table.id) || 0;
              const combinedChatCount = unreadChatCount;
              const hasAlert = pendingOrders.length > 0 || activeRequest;
              
              // Determine table status badge based on table status and order statuses
              // Priority: 청소중 > 결제완료 > 서빙완료 > 조리중 > 식사중 > 주문완료 > 주문중
              let tableStatusBadge: {
                label: string;
                color: string;
                bgColor: string;
                borderColor: string;
                textColor: string;
                icon?: React.ReactNode;
              } | null = null;
              
              if (table.status === 'cleaning') {
                // 청소중
                tableStatusBadge = {
                  label: t('table.status.cleaning') || '청소중',
                  color: 'blue',
                  bgColor: 'bg-blue-500',
                  borderColor: 'border-blue-500',
                  textColor: 'text-white',
                  icon: <RotateCcw size={11} />
                };
              } else if (table.status === 'dining' && paidOrders.length > 0) {
                // 결제완료
                tableStatusBadge = {
                  label: t('payment.status.completed') || '결제완료',
                  color: 'emerald',
                  bgColor: 'bg-emerald-500',
                  borderColor: 'border-emerald-500',
                  textColor: 'text-white',
                  icon: <CheckCircle2 size={11} />
                };
              } else if (cookingOrders.length > 0) {
                // 조리중
                tableStatusBadge = {
                  label: t('order.status.cooking') || '조리중',
                  color: 'blue',
                  bgColor: 'bg-blue-500',
                  borderColor: 'border-blue-500',
                  textColor: 'text-white',
                  icon: <ChefHat size={11} />
                };
              } else if ((servedOrders.length > 0 || deliveredOrders.length > 0) && paidOrders.length === 0) {
                // 서빙완료 - 조리/서빙 완료된 주문이 있고 결제가 완료되지 않은 경우
                tableStatusBadge = {
                  label: t('order.status.served') || '서빙완료',
                  color: 'zinc',
                  bgColor: 'bg-zinc-500',
                  borderColor: 'border-zinc-500',
                  textColor: 'text-white',
                  icon: <CircleCheck size={11} />
                };
              } else if (table.status === 'dining' && paidOrders.length === 0) {
                tableStatusBadge = {
                  label: t('order.status.served') || '서빙완료',
                  color: 'zinc',
                  bgColor: 'bg-zinc-500',
                  borderColor: 'border-zinc-500',
                  textColor: 'text-white',
                  icon: <CircleCheck size={11} />
                };
              } else if (table.status === 'ordering' && pendingOrders.length === 0 && tableOrders.length > 0 && (cookingOrders.length > 0 || servedOrders.length > 0 || deliveredOrders.length > 0)) {
                // 주문완료 - 주문이 있고 조리 중인 상태
                tableStatusBadge = {
                  label: t('order.status.completed') || '주문완료',
                  color: 'orange',
                  bgColor: 'bg-orange-500',
                  borderColor: 'border-orange-500',
                  textColor: 'text-white',
                  icon: <CircleCheck size={11} />
                };
              } else if (table.status === 'ordering') {
                // 주문중 - 주문 대기 중이거나 아직 주문이 없는 상태
                tableStatusBadge = {
                  label: t('status.ordering') || '주문중',
                  color: 'orange',
                  bgColor: 'bg-orange-500',
                  borderColor: 'border-orange-500',
                  textColor: 'text-white',
                  icon: <Clock size={11} />
                };
              }
              
              // Check if table is truly empty (status is empty AND no guests AND no active orders)
              const isTableEmpty = table.status === 'empty' && table.guests === 0 && pendingOrders.length === 0;
              const isSeatingTarget = seatingCandidate && isTableEmpty;
              
              // If seating candidate exists, only allow clicking truly empty tables
              const isClickable = !seatingCandidate || isTableEmpty;
              
              return (
                <div 
                  key={table.id}
                  className={`
                    group relative p-3.5 rounded-2xl flex flex-col justify-between aspect-square transition-all duration-300
                    border select-none overflow-hidden
                    ${!isClickable 
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                    }
                    ${isSeatingTarget 
                      ? 'bg-zinc-900 border-zinc-900 text-white ring-4 ring-zinc-200 scale-105 shadow-xl z-10'
                      : hasAlert 
                        ? 'bg-white border-rose-200 shadow-[0_0_0_2px_rgba(244,63,94,0.1)]' 
                        : table.status === 'empty'
                            ? 'bg-zinc-50/50 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'
                            : 'bg-white border-zinc-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }
                  `}
                >
                  {/* QR Code Button - Top Right */}
                  {table.qrCodeUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTableForQR({ tableNumber: table.id, qrCodeUrl: table.qrCodeUrl! });
                        setIsQRModalOpen(true);
                      }}
                      className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 hover:bg-white border border-zinc-200 rounded-lg shadow-sm transition-all hover:shadow-md group/qr"
                      title={t('qr.view_title')}
                    >
                      <QrCode size={14} className="text-zinc-600 group-hover/qr:text-zinc-900" />
                    </button>
                  )}
                  
                  {/* Clickable Area */}
                  <div
                    onClick={() => {
                      if (!isClickable) {
                        // Show message that only empty tables can be selected
                        toast.info(t('table.detail.select_empty_only'));
                        return;
                      }
                      if (isSeatingTarget) {
                        confirmSeating(table.id);
                      } else {
                        openTableDetail(table.id);
                      }
                    }}
                    className="flex flex-col justify-between h-full"
                  >
                  {/* Header: ID, Floor, Status */}
                  <div className="flex flex-col gap-1.5">
                    {/* First Row: Table Number and Floor */}
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-bold tracking-tight leading-none ${
                            hasAlert && !isSeatingTarget ? 'text-rose-600' : 
                            table.status === 'empty' ? 'text-zinc-400' : 'text-zinc-900'
                        }`}>
                            {table.id}
                        </span>
                        <span className={`text-[10px] font-medium ${isSeatingTarget ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {table.floor}F
                        </span>
                    </div>

                    {/* Second Row: Status Badge and Alert Badge */}
                    <div className="flex flex-col items-start gap-1.5">
                      {/* Status Badge */}
                      {tableStatusBadge && (
                        <div className={`${tableStatusBadge.bgColor} ${tableStatusBadge.textColor} h-5 px-2.5 rounded-md shadow-sm flex items-center gap-1.5`}>
                          {tableStatusBadge.icon && (
                            <span className="flex items-center justify-center">
                              {tableStatusBadge.icon}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold leading-none">{tableStatusBadge.label}</span>
                        </div>
                      )}
                      {pendingOrdersCount > 0 && table.status !== 'cleaning' && (
                        <div className="!bg-pink-100 !text-rose-600 border border-rose-200 h-5 px-2.5 rounded-md shadow-sm flex items-center gap-2 animate-in zoom-in-50">
                          <ShoppingCart size={11} className="animate-pulse" />
                          <span className="text-[11px] font-semibold leading-none">
                            {t('table.status.order')}
                          </span>
                          <span className="inline-flex items-center justify-center size-4 rounded-full !bg-slate-900 !text-white text-[10px] font-bold leading-none shadow-sm">
                            {pendingOrdersCount}
                          </span>
                        </div>
                      )}
                      {combinedChatCount > 0 && table.status !== 'cleaning' && (
                        <div className="!bg-pink-100 !text-rose-600 border border-rose-200 h-5 px-2.5 rounded-md shadow-sm flex items-center gap-2 animate-in zoom-in-50">
                          <MessageSquare size={11} className="animate-pulse" />
                          <span className="text-[11px] font-semibold leading-none">
                            {t('table.detail.chat')}
                          </span>
                          <span className="inline-flex items-center justify-center size-4 rounded-full !bg-slate-900 !text-white text-[10px] font-bold leading-none shadow-sm">
                            {combinedChatCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex flex-col gap-2 mt-2">
                    {table.status !== 'empty' ? (
                        <>
                            {/* Stats */}
                            <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
                                <div className="flex items-center gap-1">
                                    <User size={12} className="text-zinc-400"/>
                                    <span className={hasAlert ? 'text-rose-700' : 'text-zinc-700'}>{table.guests}/{table.capacity}</span>
                                </div>
                                <div className="w-px h-3 bg-zinc-200" />
                                <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-zinc-400"/>
                                    <span className="text-zinc-700 font-mono">
                                        {table.orderTime ? Math.floor((Date.now() - table.orderTime.getTime()) / 60000) : 0}m
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 mt-auto">
                                <div className="text-sm font-bold tracking-tight text-zinc-900">
                                    {formatPriceVND(table.totalAmount)}
                                </div>
                                {table.memo && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-50 px-2 py-1.5 rounded-lg border border-zinc-100 w-full">
                                        <StickyNote size={10} className="shrink-0 text-zinc-400" />
                                        <span className="truncate leading-none">{table.memo}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Empty State Content */
                        <div className="h-full flex flex-col justify-end gap-1.5">
                             <div className={`flex items-center gap-1.5 ${isSeatingTarget ? 'text-zinc-400' : 'text-zinc-300'}`}>
                                <User size={12} />
                                <span className="text-xs font-medium">0/{table.capacity}</span>
                             </div>
                             {table.memo && (
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 truncate">
                                    <StickyNote size={10} />
                                    <span className="truncate">{table.memo}</span>
                                </div>
                             )}
                             {isSeatingTarget ? (
                                 <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] rounded-2xl">
                                     <Check size={24} className="text-emerald-400 animate-in zoom-in spin-in-180" />
                                 </div>
                             ) : (
                                 <span className="text-[10px] font-medium text-zinc-300 mt-1">{t('status.empty')}</span>
                             )}
                        </div>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Waiting List Panel */}
      {isDesktop && (
        <div className="w-[320px] shrink-0 h-full sticky top-0">
          <WaitingListPanel 
            waitingList={waitingList} 
            setWaitingList={setWaitingList} 
            onSeat={handleSeatGuest}
            onReload={loadWaitingList}
          />
        </div>
      )}

      {/* Mobile Waiting List Sheet (Drawer) */}
      <Drawer open={isWaitingSheetOpen} onOpenChange={setIsWaitingSheetOpen}>
        <DrawerContent className="h-[90vh] rounded-t-[32px] p-0">
           <DrawerTitle className="sr-only">{t('wait.title')}</DrawerTitle>
           <DrawerDescription className="sr-only">Waiting list</DrawerDescription>
           <WaitingListPanel 
              waitingList={waitingList} 
              setWaitingList={setWaitingList} 
              onSeat={handleSeatGuest}
              onReload={loadWaitingList}
              className="border-none shadow-none rounded-t-[32px] h-full"
           />
        </DrawerContent>
      </Drawer>

      {/* Table Detail Sheet / Drawer */}
      {isDesktop ? (
          <Sheet open={isDetailOpen} onOpenChange={(open) => !open && closeTableDetail()}>
            <SheetContent 
                side="right" 
                className="w-[400px] h-full rounded-l-[32px] sm:max-w-[400px] p-0 bg-background border-none outline-none flex flex-col overflow-hidden"
            >
                {renderHeaderContent(SheetTitle, SheetDescription)}
                {selectedTable && <DetailBody 
                    detailTableId={detailTableId}
                    tables={visibleTables}
                    selectedTable={selectedTable}
                    tableOrders={tableOrders}
                    chatMessages={chatMessages}
                    isLoadingChat={isLoadingChat}
                    t={t}
                    handleReply={handleReply}
                    handleUpdateOrderStatus={handleUpdateOrderStatus}
                    handleSmartAction={handleSmartAction}
                    handleResetTable={handleResetTableClick}
                    closeTableDetail={closeTableDetail}
                    getActionButtonText={getActionButtonText}
                    getActionButtonColor={getActionButtonColor}
                    quickReplies={quickReplies}
                    handleUpdateGuests={handleUpdateGuests}
                    handleUpdateMemo={handleUpdateMemo}
                    onOrderEntryClick={() => setIsOrderEntryOpen(true)}
                    updatingOrderId={updatingOrderId}
                    menu={menu}
                    formatPriceVND={formatPriceVND}
                    language={language}
                    shopUserRole={shopUserRole}
                    updateTableToCleaning={updateTableToCleaning}
                    onTablesReload={onTablesReload}
                    onCheckoutClick={() => setIsCheckoutOpen(true)}
                    onQRCodeClick={(tableNumber: number, qrCodeUrl: string) => {
                        setSelectedTableForQR({ tableNumber, qrCodeUrl });
                        setIsQRModalOpen(true);
                    }}
                    onChatTabOpen={handleChatTabOpen}
                    unreadChatCount={tableUnreadChatCount.get(detailTableId ?? -1) || 0}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />}
            </SheetContent>
          </Sheet>
      ) : (
          <Drawer open={isDetailOpen} onOpenChange={(open) => !open && closeTableDetail()}>
            <DrawerContent className="h-[90vh] rounded-t-[32px] p-0 bg-background border-none outline-none mt-24 flex flex-col overflow-hidden w-full max-w-full">
                {renderHeaderContent(DrawerTitle, DrawerDescription)}
                {selectedTable && <DetailBody 
                    detailTableId={detailTableId}
                    tables={visibleTables}
                    selectedTable={selectedTable}
                    tableOrders={tableOrders}
                    chatMessages={chatMessages}
                    isLoadingChat={isLoadingChat}
                    t={t}
                    handleReply={handleReply}
                    handleUpdateOrderStatus={handleUpdateOrderStatus}
                    handleSmartAction={handleSmartAction}
                    handleResetTable={handleResetTableClick}
                    closeTableDetail={closeTableDetail}
                    getActionButtonText={getActionButtonText}
                    getActionButtonColor={getActionButtonColor}
                    quickReplies={quickReplies}
                    handleUpdateGuests={handleUpdateGuests}
                    handleUpdateMemo={handleUpdateMemo}
                    onOrderEntryClick={() => setIsOrderEntryOpen(true)}
                    updatingOrderId={updatingOrderId}
                    menu={menu}
                    formatPriceVND={formatPriceVND}
                    language={language}
                    shopUserRole={shopUserRole}
                    updateTableToCleaning={updateTableToCleaning}
                    onTablesReload={onTablesReload}
                    onCheckoutClick={() => setIsCheckoutOpen(true)}
                    onQRCodeClick={(tableNumber: number, qrCodeUrl: string) => {
                        setSelectedTableForQR({ tableNumber, qrCodeUrl });
                        setIsQRModalOpen(true);
                    }}
                    onChatTabOpen={handleChatTabOpen}
                    unreadChatCount={tableUnreadChatCount.get(detailTableId ?? -1) || 0}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />}
            </DrawerContent>
        </Drawer>
      )}

      {/* Order Entry Sheet */}
      {selectedTable && restaurantId && selectedTable.tableId && (
        <OrderEntrySheet
          isOpen={isOrderEntryOpen}
          onClose={() => setIsOrderEntryOpen(false)}
          tableId={selectedTable.tableId}
          tableNumber={selectedTable.id}
          restaurantId={restaurantId}
          guestCount={selectedTable.guests}
          onOrderCreated={async (orderData) => {
            // Reload tables first to get updated currentSessionId
            if (onTablesReload) {
              await onTablesReload();
            }
            
            // Reload orders to get the latest data from backend
            if (onOrdersReload) {
              await onOrdersReload();
            }
          }}
        />
      )}

      {/* Checkout Sheet */}
      {selectedTable && selectedTable.tableId && (
        <CheckoutSheet
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          tableId={selectedTable.tableId}
          tableNumber={selectedTable.id}
          orders={orders}
          currentSessionId={selectedTable.currentSessionId}
          onCheckoutComplete={handleCheckoutComplete}
        />
      )}

      {/* Table QR Code Modal */}
      {selectedTableForQR && (
        <TableQRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false);
            setSelectedTableForQR(null);
          }}
          tableNumber={selectedTableForQR.tableNumber}
          qrCodeUrl={selectedTableForQR.qrCodeUrl}
        />
      )}

      {/* Table Reset Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('table.reset.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTable && t('table.reset.description').replace('{id}', String(selectedTable.id))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('btn.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResetTableConfirm} className="bg-zinc-900 hover:bg-zinc-800">
              {t('table.reset.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Extracted Component for the body content
function DetailBody({ 
    detailTableId, tables, selectedTable, tableOrders, chatMessages = [], isLoadingChat = false, t, handleReply, handleUpdateOrderStatus, 
    handleSmartAction, handleResetTable, closeTableDetail, getActionButtonText, getActionButtonColor, quickReplies,
    handleUpdateGuests, handleUpdateMemo, onOrderEntryClick, updatingOrderId, menu = [], formatPriceVND, language = 'ko', shopUserRole,
    updateTableToCleaning, onTablesReload, onCheckoutClick, onQRCodeClick, onChatTabOpen, unreadChatCount: unreadChatCountOverride,
    activeTab, setActiveTab
}: any) {
    const debugLog = (..._args: unknown[]) => {};
    const [isEditingGuests, setIsEditingGuests] = useState(false);
    
    // Check if user can reset table (OWNER or MANAGER)
    const canResetTable = shopUserRole === 'OWNER' || shopUserRole === 'MANAGER';
    
    // Debug log
    useEffect(() => {
        debugLog('DetailBody shopUserRole:', shopUserRole, 'canResetTable:', canResetTable);
    }, [shopUserRole, canResetTable]);
    const [isEditingMemo, setIsEditingMemo] = useState(false);
    const [chatInputText, setChatInputText] = useState('');
    const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
    const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement>(null);
    const tabsContentWrapperRef = useRef<HTMLDivElement>(null);

    const pendingOrdersCount = useMemo(
        () => tableOrders.filter((o: any) => o.type === 'order' && o.status === 'pending').length,
        [tableOrders]
    );
    const unreadRequestCount = useMemo(() => {
        const requests = chatMessages.filter(
            (msg: BackendChatMessage) => msg.messageType === 'REQUEST' && msg.senderType === 'USER'
        );
        return requests.filter((request: BackendChatMessage) => {
            const requestIndex = chatMessages.findIndex((m: BackendChatMessage) => m.id === request.id);
            const hasReply = chatMessages.slice(requestIndex + 1).some(
                (m: BackendChatMessage) => m.senderType === 'STAFF'
            );
            return !hasReply;
        }).length;
    }, [chatMessages]);
    const unreadChatCountCalculated = useMemo(() => {
        const lastStaffIndex = [...chatMessages]
            .reverse()
            .findIndex((msg: BackendChatMessage) => msg.senderType === 'STAFF');
        const cutoffIndex = lastStaffIndex === -1 ? 0 : chatMessages.length - 1 - lastStaffIndex;
        return chatMessages
            .slice(cutoffIndex)
            .filter((msg: BackendChatMessage) => msg.senderType === 'USER' && msg.messageType !== 'ORDER')
            .length;
    }, [chatMessages]);
    const unreadChatCount = typeof unreadChatCountOverride === 'number' ? unreadChatCountOverride : unreadChatCountCalculated;
    
    // Always get the latest table data from tables array
    const currentTable = tables.find((t: Table) => t.id === detailTableId) || selectedTable;
    const [tempGuests, setTempGuests] = useState(currentTable?.guests?.toString() || '0');
    const [tempMemo, setTempMemo] = useState(currentTable?.memo || '');
    const [savedGuests, setSavedGuests] = useState<number | null>(null); // Track saved guest count for immediate UI update

    useEffect(() => {
        if (activeTab === 'chat' && currentTable?.id && onChatTabOpen) {
            const lastMessageId = chatMessages[chatMessages.length - 1]?.id;
            onChatTabOpen(currentTable.id, lastMessageId ? String(lastMessageId) : undefined);
        }
    }, [activeTab, chatMessages, currentTable?.id, onChatTabOpen]);

    // 채팅 탭이 활성화될 때 스크롤을 맨 아래로 이동
    useEffect(() => {
        if (activeTab === 'chat' && chatMessages.length > 0) {
            // ScrollArea의 Viewport를 찾아서 스크롤
            const scrollToBottom = () => {
                // tabsContentWrapperRef를 기준으로 Viewport를 찾기
                if (tabsContentWrapperRef.current) {
                    const viewport = tabsContentWrapperRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
                    if (viewport) {
                        viewport.scrollTop = viewport.scrollHeight;
                        return;
                    }
                }
                // chatMessagesContainerRef의 부모 요소들 중 ScrollArea Viewport를 찾기
                if (chatMessagesContainerRef.current) {
                    let element: HTMLElement | null = chatMessagesContainerRef.current;
                    // Viewport를 찾을 때까지 부모로 올라가기
                    while (element && element.parentElement) {
                        element = element.parentElement;
                        // ScrollArea Viewport는 data-slot="scroll-area-viewport" 속성을 가짐
                        if (element.getAttribute('data-slot') === 'scroll-area-viewport') {
                            // Viewport를 찾았으면 맨 아래로 스크롤
                            element.scrollTop = element.scrollHeight;
                            return;
                        }
                    }
                }
                // Viewport를 찾지 못한 경우, lastMessageRef를 사용한 스크롤 시도
                if (lastMessageRef.current) {
                    // scrollIntoView를 사용하되, Viewport를 찾아서 스크롤
                    const viewport = lastMessageRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
                    if (viewport) {
                        viewport.scrollTop = viewport.scrollHeight;
                    } else {
                        lastMessageRef.current.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
                    }
                }
            };
            
            // DOM이 완전히 업데이트된 후 스크롤 (여러 번 시도)
            requestAnimationFrame(() => {
                setTimeout(scrollToBottom, 50);
                setTimeout(scrollToBottom, 200);
                setTimeout(scrollToBottom, 400);
            });
        }
    }, [activeTab]);

    useEffect(() => {
        if (currentTable) {
            const currentGuests = currentTable.guests ?? 0;
            setTempGuests(currentGuests.toString());
            // If savedGuests matches currentTable.guests, clear the saved state
            if (savedGuests !== null && savedGuests === currentGuests) {
                setSavedGuests(null);
            }
            setTempMemo(currentTable.memo || '');
        }
    }, [currentTable?.guests, currentTable?.memo, currentTable?.id]); // tables 배열이 업데이트되면 자동으로 반영됨

    const saveGuests = async () => {
        const val = parseInt(tempGuests);
        if (!isNaN(val) && val >= 0 && val <= (currentTable?.capacity || 0)) {
            // Store the saved value for immediate UI update
            setSavedGuests(val);
            // Update backend
            await handleUpdateGuests(val);
            // Close edit mode after successful update
            setIsEditingGuests(false);
        } else {
            toast.error(t('table.error.guest_range')?.replace('{min}', '0').replace('{max}', (currentTable?.capacity || 0).toString()) || '인원 수는 0 이상이어야 합니다.');
        }
    };

    const saveMemo = () => {
        handleUpdateMemo(tempMemo);
        setIsEditingMemo(false);
    };

    // Auto-scroll to bottom when chat messages change
    useEffect(() => {
        if (activeTab === 'chat' && chatMessages.length > 0) {
            // ScrollArea의 Viewport를 찾아서 스크롤
            const scrollToBottom = () => {
                // tabsContentWrapperRef를 기준으로 Viewport를 찾기
                if (tabsContentWrapperRef.current) {
                    const viewport = tabsContentWrapperRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
                    if (viewport) {
                        viewport.scrollTop = viewport.scrollHeight;
                        return;
                    }
                }
                // lastMessageRef를 우선적으로 사용
                if (lastMessageRef.current) {
                    const viewport = lastMessageRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
                    if (viewport) {
                        viewport.scrollTop = viewport.scrollHeight;
                        return;
                    }
                }
                // chatMessagesContainerRef를 사용한 fallback
                if (chatMessagesContainerRef.current) {
                    let element: HTMLElement | null = chatMessagesContainerRef.current;
                    // Viewport를 찾을 때까지 부모로 올라가기
                    while (element && element.parentElement) {
                        element = element.parentElement;
                        // ScrollArea Viewport는 data-slot="scroll-area-viewport" 속성을 가짐
                        if (element.getAttribute('data-slot') === 'scroll-area-viewport') {
                            element.scrollTop = element.scrollHeight;
                            return;
                        }
                    }
                }
            };
            
            // Use setTimeout to ensure DOM has updated
            setTimeout(scrollToBottom, 100);
        }
    }, [chatMessages, activeTab]);

    return (
        <div 
          className="h-full flex flex-col overflow-hidden min-h-0 w-full min-w-0 max-w-full"
          style={{ backgroundColor: activeTab === 'chat' ? '#5C7285' : undefined }}
        >
            {/* Body */}
            <ScrollArea className="flex-1 min-h-0 w-full min-w-0">
                <div 
                  ref={tabsContentWrapperRef} 
                  className="p-3 sm:p-4 space-y-3 sm:space-y-4 w-full max-w-full min-w-0 min-h-full"
                >
                <Tabs value={activeTab} className="w-full">
                    <TabsContent value="orders" className="pt-2">
                        <div className="space-y-4">
                            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {(() => {
                                      const hasPaidOrders = tableOrders.some((o: any) => o.type === 'order' && o.status === 'paid');
                                      const effectiveGuests = savedGuests !== null ? savedGuests : (currentTable?.guests ?? 0);
                                      const servedOrders = tableOrders.filter((o: any) => o.type === 'order' && o.status === 'served');
                                      const hasServedOrders = servedOrders.length > 0;
                                      
                                      return (
                                        <>
                                          <button 
                                            onClick={onOrderEntryClick}
                                            disabled={
                                              hasPaidOrders ||
                                              (currentTable?.status === 'empty' && (currentTable?.guests ?? 0) === 0) ||
                                              (currentTable?.status === 'empty' && savedGuests !== null && savedGuests === 0)
                                            }
                                            className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            <ShoppingCart size={16} />
                                            {t('order.entry.title')}
                                          </button>
                                          {(() => {
                                            if (currentTable?.status === 'dining') {
                                              if (hasPaidOrders) {
                                                return (
                                                  <button 
                                                    onClick={async () => {
                                                      if (updateTableToCleaning) {
                                                        await updateTableToCleaning();
                                                      }
                                                    }}
                                                    className="h-10 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                                  >
                                                    <CheckCircle2 size={16} />
                                                    {t('table.action.complete_cleaning')}
                                                  </button>
                                                );
                                              }
                                              return (
                                                <button 
                                                  onClick={onCheckoutClick}
                                                  className="h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                  <CreditCard size={16} />
                                                  {t('table.action.checkout_clear')}
                                                </button>
                                              );
                                            }
                                            
                                            if (currentTable?.status === 'ordering' && !hasServedOrders) {
                                              return null;
                                            }
                                            
                                            return (
                                              <button 
                                                onClick={handleSmartAction}
                                                disabled={
                                                  (currentTable?.status === 'empty' && effectiveGuests === 0)
                                                }
                                                className={`h-10 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${getActionButtonColor(currentTable?.status || selectedTable.status)} disabled:opacity-50 disabled:cursor-not-allowed`}
                                              >
                                                {currentTable?.status === 'ordering' && hasServedOrders ? (
                                                  <CreditCard size={16} />
                                                ) : null}
                                                {getActionButtonText(currentTable?.status || selectedTable.status, hasServedOrders)}
                                              </button>
                                            );
                                          })()}
                                        </>
                                      );
                                    })()}
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">{t('table.detail.guest_count')}</span>
                                    </div>
                                    {isEditingGuests ? (
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                value={tempGuests} 
                                                onChange={(e) => setTempGuests(e.target.value)}
                                                className="w-20 h-8 text-sm font-medium text-center border-border focus:border-primary focus:ring-primary/20 bg-background text-foreground"
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && saveGuests()}
                                            />
                                            <button onClick={saveGuests} className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                                                <Check size={12} />
                                            </button>
                                            <button onClick={() => setIsEditingGuests(false)} className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setIsEditingGuests(true)}
                                            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors group"
                                        >
                                            <span>{savedGuests !== null ? savedGuests : (currentTable?.guests ?? 0)}</span>
                                            <span className="text-muted-foreground">/</span>
                                            <span className="text-muted-foreground">{currentTable?.capacity ?? 0}</span>
                                            <Edit2 size={12} className="text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <StickyNote size={14} className="text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">{t('table.detail.memo')}</span>
                                        </div>
                                        {!isEditingMemo && (
                                            <button 
                                                onClick={() => setIsEditingMemo(true)}
                                            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
                                            >
                                                <Edit2 size={10} /> {t('table.management.edit')}
                                            </button>
                                        )}
                                    </div>
                                    
                                    {isEditingMemo ? (
                                        <div className="space-y-2">
                                            <Textarea 
                                                value={tempMemo}
                                                onChange={(e) => setTempMemo(e.target.value)}
                                                placeholder={t('table.detail.memo')}
                                                className="text-sm min-h-[80px] border-border focus:border-primary focus:ring-primary/20 bg-background text-foreground placeholder:text-muted-foreground resize-none"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setIsEditingMemo(false)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                                                    {t('btn.cancel')}
                                                </button>
                                                <button onClick={saveMemo} className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                                                    {t('btn.save')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={() => setIsEditingMemo(true)}
                                            className={`text-sm p-3 rounded-lg border border-dashed transition-all cursor-pointer ${
                                                currentTable?.memo 
                                                    ? 'bg-muted/60 border-border text-foreground hover:border-border/70' 
                                                    : 'bg-muted border-border text-muted-foreground hover:border-border/70'
                                            }`}
                                        >
                                            {currentTable?.memo ? (
                                                <p className="leading-relaxed">{currentTable.memo}</p>
                                            ) : (
                                                <span className="italic">{t('table.detail.memo')}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(() => {
                              const paidOrders = tableOrders.filter((o: any) => o.type === 'order' && o.status === 'paid');
                              if (paidOrders.length === 0) return null;
                              
                              const totalPaymentAmount = paidOrders.reduce((sum: number, order: any) => {
                                if (!order.items || order.items.length === 0) return sum;
                                const orderTotal = order.items.reduce((itemSum: number, item: any) => {
                                  return itemSum + (item.price || 0);
                                }, 0);
                                return sum + orderTotal;
                              }, 0);
                              
                              const mostRecentPayment = paidOrders.sort((a: any, b: any) => 
                                b.timestamp.getTime() - a.timestamp.getTime()
                              )[0];
                              const paymentTime = mostRecentPayment.timestamp;
                              
                              const paymentMethod = t('checkout.bank_transfer');
                              
                              return (
                                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center gap-2">
                                   <CheckCircle2 size={14} className="text-primary" />
                                   <span className="text-xs font-semibold text-primary uppercase tracking-wide">{t('payment.status.completed')}</span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-muted-foreground">{t('payment.amount')}</span>
                                     <span className="text-base font-bold text-foreground">{formatPriceVND(totalPaymentAmount)}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-muted-foreground">{t('payment.method')}</span>
                                      <span className="text-xs font-semibold text-foreground">{paymentMethod}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-muted-foreground">{t('payment.time')}</span>
                                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                        <Clock size={11} />
                                        {paymentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                        </div>

                        <div className="pt-2">
                            {tableOrders.length > 0 ? (
                                <div className="space-y-6">
                                    {/* Orders Section */}
                                    {tableOrders.some((o: any) => o.type === 'order') && (
                                        <div className="space-y-3">
                                            {tableOrders.filter((o: any) => o.type === 'order').map((order: any) => (
                                                <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
                                                {/* Order Header */}
                                                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-muted-foreground" />
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wide ${
                                                        order.status === 'pending' ? 'bg-primary/10 text-primary' :
                                                        order.status === 'cooking' ? 'bg-accent/10 text-accent-foreground' :
                                                        order.status === 'served' ? 'bg-muted text-muted-foreground' :
                                                        order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-700' :
                                                        order.status === 'paid' ? 'bg-secondary/10 text-secondary-foreground' :
                                                        'bg-muted text-muted-foreground'
                                                    }`}>
                                                        {order.status === 'pending' ? t('order.status.pending') || '주문중' :
                                                         order.status === 'cooking' ? t('order.status.cooking') || '조리중' :
                                                         order.status === 'served' ? (t('feed.tab.served') || '조리완료') :
                                                         order.status === 'delivered' ? (t('btn.serve') || '서빙완료') :
                                                         order.status === 'paid' ? t('order.status.paid') || '결제 완료' : 
                                                         order.status}
                                                    </span>
                                                </div>

                                                {/* Order Items */}
                                                <div className="px-4 py-3 space-y-2.5">
                                                    {order.items.map((item: any, idx: number) => {
                                                        const menuItem = menu.find(m => m.name === item.name);
                                                        return (
                                                            <div key={idx} className="flex items-start gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                                                                    {menuItem?.imageUrl ? (
                                                                        <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <UtensilsCrossed size={14} className="text-muted-foreground" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                                        <span className="text-sm font-semibold text-foreground leading-snug">{item.name}</span>
                                                                        <span className="text-sm font-bold text-foreground shrink-0">
                                                                            {formatPriceVND(
                                                                                (item.unitPrice || 0) * item.quantity + 
                                                                                (item.options?.reduce((sum: number, opt: { name: string; quantity: number; price: number }) => 
                                                                                    sum + (opt.price * opt.quantity), 0) || 0)
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {formatPriceVND(item.unitPrice || 0)} × {item.quantity}
                                                                            </span>
                                                                        </div>
                                                                        {item.options && item.options.length > 0 && (
                                                                            <div className="space-y-1 pl-3 border-l-2 border-muted">
                                                                                {item.options.map((opt: { name: string; quantity: number; price: number }, i: number) => (
                                                                                    <div key={i} className="flex items-center justify-between gap-2">
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                            + {opt.name} {opt.quantity > 1 ? `× ${opt.quantity}` : ''}
                                                                                        </span>
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                            {formatPriceVND(opt.price * opt.quantity)}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Order Actions */}
                                                <div className="px-4 pb-3">
                                                    {order.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleUpdateOrderStatus(order.id, 'cooking')}
                                                            disabled={updatingOrderId === order.id}
                                                            className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <ChefHat size={13}/> {updatingOrderId === order.id ? t('order.status.updating') : t('order.action.start_cooking')}
                                                        </button>
                                                    )}
                                                    {order.status === 'cooking' && (
                                                        <button 
                                                            onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                                                            disabled={updatingOrderId === order.id}
                                                            className="w-full h-9 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <CircleCheck size={13}/> {updatingOrderId === order.id ? t('order.status.updating') : (t('feed.tab.served') || '조리완료')}
                                                        </button>
                                                    )}
                                                    {order.status === 'served' && (
                                                        <div className="w-full h-9 bg-muted text-muted-foreground text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 border border-border">
                                                            <CircleCheck size={13} className="text-muted-foreground"/> {t('order.status.payment_pending') || '결제 대기 중'}
                                                        </div>
                                                    )}
                                                    {order.status === 'delivered' && (
                                                        <div className="w-full h-9 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 border border-emerald-200">
                                                            <CircleCheck size={13}/> {t('order.status.payment_pending') || '결제 대기 중'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground px-1 py-2">
                                    {t('table.detail.no_orders')}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="chat" className="pt-2">
                        <div className="space-y-3 w-full min-w-0 max-w-full">
                            {/* Chat Messages List */}
                            <div ref={chatMessagesContainerRef} className="space-y-2 sm:space-y-3 overflow-y-auto min-h-[200px] sm:min-h-[240px] scroll-smooth text-foreground w-full min-w-0 max-w-full">
                                {isLoadingChat ? (
                                <div className="text-center py-12 text-muted-foreground">
                                        <div className="inline-flex items-center gap-2 text-sm">
                                            <div className="w-4 h-4 border-2 border-muted-foreground/40 border-t-transparent rounded-full animate-spin"></div>
                                            {t('table.detail.loading') || t('report.loading') || '로딩 중...'}
                                        </div>
                                    </div>
                                ) : chatMessages && chatMessages.length > 0 ? (
                                    chatMessages.map((msg: BackendChatMessage, index: number) => (
                                        <div 
                                            key={msg.id} 
                                            ref={index === chatMessages.length - 1 ? lastMessageRef : null}
                                        >
                                            <ChatBubble message={msg} language={language} tableNumber={selectedTable?.id} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                                            <MessageSquare size={16} className="text-muted-foreground" />
                                        </div>
                                        <p className="text-xs">{t('table.detail.no_messages') || '메시지가 없습니다.'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
                </div>
            </ScrollArea>
            
            {activeTab === 'chat' && selectedTable?.currentSessionId && (
                <div className="shrink-0 border-t border-border bg-card min-w-0">
                    <QuickActions
                        replies={quickReplies}
                        language={language}
                        onReply={async (message) => {
                            if (!message.trim() || isSendingChatMessage || !selectedTable?.currentSessionId) return;
                            setIsSendingChatMessage(true);
                            try {
                                await handleReply(selectedTable.currentSessionId, message);
                            } finally {
                                setIsSendingChatMessage(false);
                            }
                        }}
                    />
                    <div className="flex gap-2 px-3 pb-3">
                        <Input
                            value={chatInputText}
                            onChange={(e) => setChatInputText(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (chatInputText.trim() && !isSendingChatMessage && selectedTable?.currentSessionId) {
                                        setIsSendingChatMessage(true);
                                        try {
                                            await handleReply(selectedTable.currentSessionId, chatInputText.trim());
                                            setChatInputText('');
                                        } finally {
                                            setIsSendingChatMessage(false);
                                        }
                                    }
                                }
                            }}
                            placeholder={t('reply.placeholder') || '메시지를 입력하세요...'}
                            className="flex-1 text-sm h-10 border-border focus:border-primary focus:ring-primary/20 bg-background text-foreground placeholder:text-muted-foreground rounded-full px-4"
                            disabled={isSendingChatMessage}
                        />
                        <button
                            onClick={async () => {
                                if (chatInputText.trim() && !isSendingChatMessage && selectedTable?.currentSessionId) {
                                    setIsSendingChatMessage(true);
                                    try {
                                        await handleReply(selectedTable.currentSessionId, chatInputText.trim());
                                        setChatInputText('');
                                    } finally {
                                        setIsSendingChatMessage(false);
                                    }
                                }
                            }}
                            disabled={!chatInputText.trim() || isSendingChatMessage}
                            className="px-4 h-10 text-sm font-semibold text-primary-foreground bg-primary rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
                        >
                            {isSendingChatMessage ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <MessageSquare size={14} />
                            )}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Sheet Footer Actions - 초기화 및 닫기 버튼 */}
            <div className="shrink-0 bg-card border-t border-border">
                <div className="p-3">
                    <div className="flex gap-2">
                        {handleResetTable && canResetTable && (
                            <button 
                                onClick={handleResetTable}
                                className="flex-1 h-9 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            >
                                <RotateCcw size={13} />
                                {t('table.reset.confirm')}
                            </button>
                        )}
                        <button 
                            onClick={closeTableDetail}
                            className={`h-9 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${handleResetTable && canResetTable ? 'flex-1' : 'w-full'}`}
                        >
                            <X size={13} />
                            {t('table.detail.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}