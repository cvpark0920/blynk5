import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Clock, BellRing, UtensilsCrossed, MessageSquare, ArrowRight, ChefHat, CircleCheck, Check, List, X, Edit2, StickyNote, ShoppingCart } from 'lucide-react';
import { Table, Order, WaitingEntry } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { WaitingListPanel } from './WaitingListPanel';
import { OrderEntrySheet } from './OrderEntrySheet';
import { CheckoutSheet } from './CheckoutSheet';
import { formatPriceVND } from '../../utils/priceFormat';
import { mapBackendWaitingEntryToFrontend, mapChatMessageToOrder } from '../../utils/mappers';
import { BackendWaitingEntry, BackendChatMessage } from '../../types/api';
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
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

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
  onOrdersReload?: () => void;
  onTablesReload?: () => void; // 테이블 목록 재로드를 위한 콜백 추가
  menu?: Array<{ id: string; name: string; imageUrl?: string }>; // Optional menu for image display
  onChatNew?: (handler: (tableId: number, sessionId: string) => Promise<void>) => void; // 채팅 메시지 수신 시 호출되는 핸들러 등록 콜백
  tableToOpen?: number | null; // 테이블 번호로 테이블 상세 화면 열기
  onTableOpened?: () => void; // 테이블이 열렸을 때 호출되는 콜백
}

export function TableGrid({ tables, orders, setTables, setOrders, onOrdersReload, onTablesReload, menu = [], onChatNew, tableToOpen, onTableOpened }: TableGridProps) {
  const { t, language } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [detailTableId, setDetailTableId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'empty' | 'ordering' | 'dining' | 'cleaning'>('all');
  const isDesktop = useIsDesktop();

  // Derived state for the table currently being viewed (or last viewed if closing)
  const selectedTable = tables.find(t => t.id === detailTableId) || null;

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

  const loadChatMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setChatMessages([]);
      loadingChatSessionRef.current = null;
      return;
    }

    // Prevent duplicate reloads if already loading the same session
    if (loadingChatSessionRef.current === sessionId && isLoadingChat) {
      console.log('Chat messages already loading for this session, skipping duplicate call');
      return;
    }

    loadingChatSessionRef.current = sessionId;
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
      // Reset loading flag after a short delay to allow for rapid successive messages
      setTimeout(() => {
        if (loadingChatSessionRef.current === sessionId) {
          loadingChatSessionRef.current = null;
        }
      }, 500);
    }
  }, [isLoadingChat]);

  // Handle tableToOpen prop - open table detail when tableToOpen is set
  useEffect(() => {
    if (tableToOpen !== null && tableToOpen !== undefined) {
      const table = tables.find(t => t.id === tableToOpen);
      if (table) {
        setDetailTableId(tableToOpen);
        setIsDetailOpen(true);
        // Call onTableOpened after a short delay to ensure table is opened
        setTimeout(() => {
          if (onTableOpened) {
            onTableOpened();
          }
        }, 100);
      }
    }
  }, [tableToOpen, tables, onTableOpened]);

  // Load chat messages when table detail opens or session changes
  useEffect(() => {
    if (selectedTable?.currentSessionId) {
      loadChatMessages(selectedTable.currentSessionId);
    } else {
      setChatMessages([]);
    }
  }, [selectedTable?.currentSessionId, detailTableId]);

  // Note: We removed the useEffect that reloads chat messages when tables change
  // because updateTableRequestStatus already handles reloading chat messages for the open table
  // This prevents duplicate API calls

  // Check request status for all tables when tables are loaded
  useEffect(() => {
    const checkTableRequests = async () => {
      if (tables.length === 0) return;

      const statusMap = new Map<number, boolean>();
      const checkPromises = tables.map(async (table) => {
        if (table.currentSessionId) {
          try {
            const result = await apiClient.getChatHistory(table.currentSessionId);
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
              
              statusMap.set(table.id, hasUnrepliedRequest);
            }
          } catch (error) {
            console.error(`Failed to check requests for table ${table.id}:`, error);
            statusMap.set(table.id, false);
          }
        } else {
          statusMap.set(table.id, false);
        }
      });

      await Promise.all(checkPromises);
      setTableRequestStatus(statusMap);
    };

    checkTableRequests();
  }, [tables]);

  // Update request status for a specific table (called from SSE events)
  // Also reloads chat messages if the table detail is open for this table
  const updateTableRequestStatus = useCallback(async (tableId: number, sessionId: string) => {
    try {
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

        // If the table detail is open for this table, reload chat messages immediately
        // This ensures both REQUEST and TEXT messages are displayed in real-time
        const currentDetailTableId = detailTableId;
        const currentSelectedTable = tables.find(t => t.id === currentDetailTableId);
        if (currentDetailTableId === tableId && currentSelectedTable?.currentSessionId === sessionId) {
          await loadChatMessages(sessionId);
        }
      }
    } catch (error) {
      console.error(`Failed to update request status for table ${tableId}:`, error);
    }
  }, [detailTableId, tables, loadChatMessages]);

  // Expose updateTableRequestStatus to parent component via callback
  useEffect(() => {
    if (onChatNew) {
      // Store the function reference so parent can call it
      onChatNew(updateTableRequestStatus);
    }
  }, [onChatNew, updateTableRequestStatus]);

  const QUICK_REPLIES = [
    t('reply.coming'),
    t('reply.wait'),
    t('reply.soldout'),
    t('reply.kitchen')
  ];

  // Prevent duplicate message sending
  const sendingMessageRef = useRef<Set<string>>(new Set());

  const handleReply = async (orderIdOrSessionId: string, message: string) => {
    // Create a unique key for this message to prevent duplicates
    const messageKey = `${orderIdOrSessionId}-${message}-${Date.now()}`;
    
    // Check if this exact message is already being sent
    if (sendingMessageRef.current.has(messageKey)) {
      console.log('Message already being sent, skipping duplicate');
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
        setReplyingTo(null);
        
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
    ? (selectedTable.status === 'empty' || selectedTable.status === 'cleaning')
      ? [] // Empty and cleaning tables should not show any orders
      : orders
          .filter(o => {
            // Filter by table number
            if (o.tableId !== selectedTable.id || o.status === 'cancelled') {
              return false;
            }
            // If table has an active session, only show orders from that session
            // This prevents showing orders from previous customers
            if (selectedTable.currentSessionId && o.sessionId) {
              return o.sessionId === selectedTable.currentSessionId;
            }
            // If no active session but table is ordering/dining, show orders that match the table
            // This handles the case where order was just created but table's currentSessionId hasn't been updated yet
            // Only show recent orders (within last 30 minutes) to avoid showing old orders
            // Also show orders without sessionId if they're recent (for backward compatibility)
            if (selectedTable.status === 'ordering' || selectedTable.status === 'dining') {
              const orderAge = Date.now() - o.timestamp.getTime();
              const thirtyMinutes = 30 * 60 * 1000;
              // Show recent orders (within 30 minutes) that match this table
              // This ensures customer orders are visible even if sessionId is not set
              return orderAge < thirtyMinutes;
            }
            // If no active session and table is not ordering/dining, don't show any orders
            // This prevents showing orders from previous customers when a new customer sits down
            return false;
          })
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];

  // Convert REQUEST type chat messages to Order format and include in tableOrders
  // Only show requests that haven't been replied to (check if there's a STAFF message after the request)
  const requestOrders = selectedTable && selectedTable.currentSessionId && chatMessages.length > 0
    ? chatMessages
        .filter(msg => {
          // Only include REQUEST type messages from USER
          if (msg.messageType !== 'REQUEST' || msg.senderType !== 'USER') {
            return false;
          }
          
          // Check if there's a STAFF reply after this request message
          const requestIndex = chatMessages.findIndex(m => m.id === msg.id);
          const hasReply = chatMessages.slice(requestIndex + 1).some(
            (m: BackendChatMessage) => m.senderType === 'STAFF'
          );
          
          // Only include if there's no reply yet
          return !hasReply;
        })
        .map(msg => mapChatMessageToOrder(msg, selectedTable.id, language))
    : [];

  // Combine orders and request orders
  const tableOrders = [...filteredOrders, ...requestOrders].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const handleSmartAction = async () => {
    if (!selectedTable || !selectedTable.tableId) return;

    // If dining status, open checkout sheet instead of directly changing to cleaning
    if (selectedTable.status === 'dining') {
      // Check if there are served orders
      const servedOrdersForTable = orders.filter(
        o => o.tableId === selectedTable.id && o.status === 'served'
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
        // Check if there are any orders before allowing dining status
        const ordersForTable = orders.filter(
          o => o.tableId === selectedTable.id && 
               o.status !== 'cancelled' &&
               o.type === 'order'
        );
        
        if (ordersForTable.length === 0) {
          toast.error(t('table.error.no_orders') || '주문 내역이 없습니다. 먼저 주문을 추가해주세요.');
          return;
        }
        
        newStatus = 'dining';
        break;
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

  const getActionButtonText = (status: Table['status']) => {
      switch (status) {
          case 'empty': return t('table.action.seat_guests');
          case 'ordering': return t('table.action.start_dining');
          case 'dining': return t('table.action.checkout_clear');
          case 'cleaning': return t('table.action.mark_cleaned');
          default: return t('table.action.manage');
      }
  };

  const getActionButtonColor = (status: Table['status']) => {
    switch (status) {
        case 'empty': return 'bg-zinc-900 hover:bg-zinc-800';
        case 'ordering': return 'bg-orange-500 hover:bg-orange-600';
        case 'dining': return 'bg-rose-500 hover:bg-rose-600';
        case 'cleaning': return 'bg-blue-500 hover:bg-blue-600';
        default: return 'bg-zinc-900';
    }
  };

  const openTableDetail = (tableId: number) => {
    setDetailTableId(tableId);
    setIsDetailOpen(true);
  };

  const closeTableDetail = () => {
    setIsDetailOpen(false);
    setReplyingTo(null);
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
    
    return (
        <div className="bg-gradient-to-br from-white via-zinc-50/30 to-white px-6 py-6 rounded-t-[32px] border-b border-zinc-200/60 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm shadow-sm shadow-zinc-100/30">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-zinc-900/20">
                    {selectedTable.id}
                </div>
                <div>
                    <TitleComponent className="text-xl font-bold text-zinc-900 flex items-center gap-3 mb-1.5">
                        <span>{t('table.detail.orders')}</span>
                        <Badge variant="secondary" className="bg-gradient-to-r from-zinc-100 to-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200/60 font-semibold text-xs px-2.5 py-0.5">
                            {t(`status.${selectedTable.status}`)}
                        </Badge>
                    </TitleComponent>
                    <DescriptionComponent className="text-xs font-medium text-zinc-500 flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <User size={13} className="text-zinc-400" />
                            <span className="font-semibold text-zinc-700">{selectedTable.guests}</span>
                            <span className="text-zinc-400">/</span>
                            <span>{t('table.guests')}</span>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                        <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-zinc-400" />
                            <span className="font-semibold text-zinc-700 font-mono">
                                {selectedTable.orderTime ? Math.floor((Date.now() - selectedTable.orderTime.getTime()) / 60000) : 0}
                            </span>
                            <span>{t('table.minutes')}</span>
                        </span>
                    </DescriptionComponent>
                </div>
            </div>
            <div className="text-right">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">{t('table.detail.total')}</p>
                <p className="text-2xl font-bold text-zinc-900 tracking-tight">
                  {formatPriceVND(
                    tableOrders
                      .filter((o: any) => o.type === 'order')
                      .reduce((sum: number, order: any) => {
                        if (!order.items || order.items.length === 0) return sum;
                        const orderTotal = order.items.reduce((itemSum: number, item: any) => {
                          // item.price is totalPrice (sum of unitPrice * quantity for the item)
                          return itemSum + (item.price || 0);
                        }, 0);
                        return sum + orderTotal;
                      }, 0)
                  )}
                </p>
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
          <div className="mb-4">
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <TabsList className="bg-zinc-100 p-1 w-full md:w-auto grid grid-cols-5 md:inline-flex">
                <TabsTrigger value="all" className="px-3 sm:px-4 text-xs">
                  전체 ({tables.length})
                </TabsTrigger>
                <TabsTrigger value="empty" className="px-3 sm:px-4 text-xs">
                  {t('status.empty')} ({tables.filter(t => t.status === 'empty').length})
                </TabsTrigger>
                <TabsTrigger value="ordering" className="px-3 sm:px-4 text-xs">
                  {t('status.ordering')} ({tables.filter(t => t.status === 'ordering').length})
                </TabsTrigger>
                <TabsTrigger value="dining" className="px-3 sm:px-4 text-xs">
                  {t('status.dining')} ({tables.filter(t => t.status === 'dining').length})
                </TabsTrigger>
                <TabsTrigger value="cleaning" className="px-3 sm:px-4 text-xs">
                  {t('status.cleaning')} ({tables.filter(t => t.status === 'cleaning').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filtered Tables Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables
              .filter(table => statusFilter === 'all' || table.status === statusFilter)
              .map(table => {
              const activeOrder = orders.find(o => o.tableId === table.id && o.status === 'pending' && o.type === 'order');
              
              // Check for active requests from tableRequestStatus map
              const hasRequestFromStatus = tableRequestStatus.get(table.id) || false;
              
              // Also check orders array for request type (for backward compatibility)
              const activeRequestFromOrders = orders.find(o => o.tableId === table.id && o.status === 'pending' && o.type === 'request');
              
              const activeRequest = hasRequestFromStatus || activeRequestFromOrders;
              const hasAlert = activeOrder || activeRequest;
              
              // Check if table is truly empty (status is empty AND no guests AND no active orders)
              const isTableEmpty = table.status === 'empty' && table.guests === 0 && !activeOrder;
              const isSeatingTarget = seatingCandidate && isTableEmpty;
              
              // If seating candidate exists, only allow clicking truly empty tables
              const isClickable = !seatingCandidate || isTableEmpty;
              
              return (
                <div 
                  key={table.id}
                  onClick={() => {
                    if (!isClickable) {
                      // Show message that only empty tables can be selected
                      toast.info('공석인 테이블만 선택할 수 있습니다.');
                      return;
                    }
                    if (isSeatingTarget) {
                      confirmSeating(table.id);
                    } else {
                      openTableDetail(table.id);
                    }
                  }}
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
                  {/* Header: ID, Floor, Status */}
                  <div className="flex justify-between items-start">
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

                    {/* Status Indicator */}
                    {hasAlert && table.status !== 'cleaning' ? (
                      <div className="bg-rose-500 text-white px-2 py-1 rounded-md shadow-sm shadow-rose-200 flex items-center gap-1.5 animate-in zoom-in-50">
                        <BellRing size={10} fill="currentColor" className="animate-pulse" />
                        <span className="text-[10px] font-bold leading-none">{activeRequest ? t('table.status.call') : t('table.status.order')}</span>
                      </div>
                    ) : (
                       table.status !== 'empty' && (
                           <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold capitalize border bg-white/50 backdrop-blur-sm ${
                               table.status === 'ordering' ? 'border-orange-100 text-orange-600 bg-orange-50/50' :
                               table.status === 'dining' ? 'border-emerald-100 text-emerald-600 bg-emerald-50/50' :
                               table.status === 'cleaning' ? 'border-blue-100 text-blue-600 bg-blue-50/50' :
                               'border-blue-100 text-blue-600 bg-blue-50/50'
                           }`}>
                               <div className={`w-1.5 h-1.5 rounded-full ${getIndicatorColor(table.status)}`} />
                               <span className="leading-none">
                                 {table.status === 'cleaning' ? t('table.status.cleaning') : t(`status.${table.status}`)}
                               </span>
                           </div>
                       )
                    )}
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
        <DrawerContent className="h-[85vh] rounded-t-[32px] p-0">
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
                className="w-[400px] h-full rounded-l-[32px] sm:max-w-[400px] p-0 bg-zinc-50 border-none outline-none flex flex-col overflow-hidden"
            >
                {renderHeaderContent(SheetTitle, SheetDescription)}
                {selectedTable && <DetailBody 
                    detailTableId={detailTableId}
                    tables={tables}
                    selectedTable={selectedTable}
                    tableOrders={tableOrders}
                    chatMessages={chatMessages}
                    isLoadingChat={isLoadingChat}
                    t={t}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    handleReply={handleReply}
                    handleUpdateOrderStatus={handleUpdateOrderStatus}
                    handleSmartAction={handleSmartAction}
                    closeTableDetail={closeTableDetail}
                    getActionButtonText={getActionButtonText}
                    getActionButtonColor={getActionButtonColor}
                    QUICK_REPLIES={QUICK_REPLIES}
                    handleUpdateGuests={handleUpdateGuests}
                    handleUpdateMemo={handleUpdateMemo}
                    onOrderEntryClick={() => setIsOrderEntryOpen(true)}
                    updatingOrderId={updatingOrderId}
                    menu={menu}
                    formatPriceVND={formatPriceVND}
                    language={language}
                />}
            </SheetContent>
          </Sheet>
      ) : (
          <Drawer open={isDetailOpen} onOpenChange={(open) => !open && closeTableDetail()}>
            <DrawerContent className="h-[85vh] rounded-t-[32px] p-0 bg-zinc-50 border-none outline-none mt-24 flex flex-col overflow-hidden">
                {renderHeaderContent(DrawerTitle, DrawerDescription)}
                {selectedTable && <DetailBody 
                    detailTableId={detailTableId}
                    tables={tables}
                    selectedTable={selectedTable}
                    tableOrders={tableOrders}
                    chatMessages={chatMessages}
                    isLoadingChat={isLoadingChat}
                    t={t}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    handleReply={handleReply}
                    handleUpdateOrderStatus={handleUpdateOrderStatus}
                    handleSmartAction={handleSmartAction}
                    closeTableDetail={closeTableDetail}
                    getActionButtonText={getActionButtonText}
                    getActionButtonColor={getActionButtonColor}
                    QUICK_REPLIES={QUICK_REPLIES}
                    handleUpdateGuests={handleUpdateGuests}
                    handleUpdateMemo={handleUpdateMemo}
                    onOrderEntryClick={() => setIsOrderEntryOpen(true)}
                    updatingOrderId={updatingOrderId}
                    menu={menu}
                    formatPriceVND={formatPriceVND}
                    language={language}
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
    </div>
  );
}

// Extracted Component for the body content
function DetailBody({ 
    detailTableId, tables, selectedTable, tableOrders, chatMessages = [], isLoadingChat = false, t, replyingTo, setReplyingTo, handleReply, handleUpdateOrderStatus, 
    handleSmartAction, closeTableDetail, getActionButtonText, getActionButtonColor, QUICK_REPLIES,
    handleUpdateGuests, handleUpdateMemo, onOrderEntryClick, updatingOrderId, menu = [], formatPriceVND, language = 'ko'
}: any) {
    const [isEditingGuests, setIsEditingGuests] = useState(false);
    const [isEditingMemo, setIsEditingMemo] = useState(false);
    const [chatInputText, setChatInputText] = useState('');
    const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
    const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
    
    // Always get the latest table data from tables array
    const currentTable = tables.find((t: Table) => t.id === detailTableId) || selectedTable;
    const [tempGuests, setTempGuests] = useState(currentTable?.guests?.toString() || '0');
    const [tempMemo, setTempMemo] = useState(currentTable?.memo || '');

    useEffect(() => {
        if (currentTable) {
            setTempGuests(currentTable.guests?.toString() || '0');
            setTempMemo(currentTable.memo || '');
        }
    }, [currentTable?.guests, currentTable?.memo, currentTable?.id]); // tables 배열이 업데이트되면 자동으로 반영됨

    const saveGuests = () => {
        const val = parseInt(tempGuests);
        if (!isNaN(val)) {
            handleUpdateGuests(val);
            setIsEditingGuests(false);
        }
    };

    const saveMemo = () => {
        handleUpdateMemo(tempMemo);
        setIsEditingMemo(false);
    };

    // Auto-scroll to bottom when chat messages change
    useEffect(() => {
        if (chatMessagesContainerRef.current) {
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                if (chatMessagesContainerRef.current) {
                    chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [chatMessages]);

    return (
        <div className="h-full flex flex-col overflow-hidden min-h-0 bg-gradient-to-b from-zinc-50/50 to-white">
            {/* Body */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-5 space-y-5">
                     {/* Info Section - Modern Card Design */}
                     <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 p-5 rounded-3xl shadow-sm shadow-zinc-100/50 space-y-5">
                        {/* Guest Count */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                                    <User size={16} className="text-blue-600" />
                                </div>
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t('table.detail.guest_count')}</span>
                            </div>
                            {isEditingGuests ? (
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        value={tempGuests} 
                                        onChange={(e) => setTempGuests(e.target.value)}
                                        className="w-20 h-9 text-sm font-medium text-center border-zinc-200 focus:border-blue-400 focus:ring-blue-400/20"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && saveGuests()}
                                    />
                                    <button onClick={saveGuests} className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-500/20">
                                        <Check size={14} />
                                    </button>
                                    <button onClick={() => setIsEditingGuests(false)} className="p-2 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsEditingGuests(true)}
                                    className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50/80 px-3 py-2 rounded-xl transition-all group"
                                >
                                    <span className="text-base font-bold text-zinc-900">{currentTable?.guests || 0}</span>
                                    <span className="text-zinc-400">/</span>
                                    <span className="text-zinc-600">{currentTable?.capacity || 0}</span>
                                    <span className="text-xs text-zinc-400 ml-1">{t('table.guests')}</span>
                                    <Edit2 size={13} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                </button>
                            )}
                        </div>

                        {/* Memo */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                                        <StickyNote size={16} className="text-amber-600" />
                                    </div>
                                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t('table.detail.memo')}</span>
                                </div>
                                {!isEditingMemo && (
                                    <button 
                                        onClick={() => setIsEditingMemo(true)}
                                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 bg-zinc-50 hover:bg-zinc-100 px-2.5 py-1.5 rounded-lg transition-all"
                                    >
                                        <Edit2 size={11} /> {t('table.management.edit')}
                                    </button>
                                )}
                            </div>
                            
                            {isEditingMemo ? (
                                <div className="space-y-3">
                                    <Textarea 
                                        value={tempMemo}
                                        onChange={(e) => setTempMemo(e.target.value)}
                                        placeholder={t('table.detail.memo')}
                                        className="text-sm min-h-[90px] border-zinc-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsEditingMemo(false)} className="px-4 py-2 text-xs font-semibold text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors">
                                            {t('btn.cancel')}
                                        </button>
                                        <button onClick={saveMemo} className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm shadow-amber-500/20">
                                            {t('btn.save')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setIsEditingMemo(true)}
                                    className={`text-sm p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer group ${
                                        currentTable?.memo 
                                            ? 'bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-200/60 text-amber-900 hover:border-amber-300 hover:shadow-sm' 
                                            : 'bg-zinc-50/50 border-zinc-200/60 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-100/50'
                                    }`}
                                >
                                    {currentTable?.memo ? (
                                        <div className="flex gap-3 items-start">
                                            <StickyNote size={18} className="shrink-0 mt-0.5 text-amber-500/60" />
                                            <p className="flex-1 leading-relaxed">{currentTable.memo}</p>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-2.5 text-zinc-400 group-hover:text-zinc-500 transition-colors">
                                            <StickyNote size={16} /> 
                                            <span className="italic">{t('table.detail.memo')}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                     </div>

                {tableOrders.length > 0 ? (
                    <div className="space-y-6">
                        {/* Requests Section */}
                        {tableOrders.some((o: any) => o.type === 'request') && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="w-1 h-4 bg-gradient-to-b from-rose-400 to-pink-500 rounded-full"></div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('table.detail.active_requests')}</h4>
                                </div>
                                {tableOrders.filter((o: any) => o.type === 'request').map((order: any) => (
                                    <div key={order.id} className="bg-white/90 backdrop-blur-sm border border-rose-200/60 shadow-sm shadow-rose-100/30 p-5 rounded-3xl overflow-hidden relative">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center shrink-0 shadow-sm shadow-rose-100/50">
                                                <MessageSquare size={20} className="text-rose-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-zinc-900 text-sm mb-1.5 leading-relaxed">{order.requestDetail}</p>
                                                <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                                                    <Clock size={11} />
                                                    {order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        {replyingTo === order.id ? (
                                            <div className="animate-in fade-in zoom-in-95 duration-200 bg-gradient-to-br from-zinc-50/80 to-white/80 backdrop-blur-sm rounded-2xl p-4 border border-zinc-200/60 shadow-sm">
                                                <div className="flex justify-between items-center mb-3 px-1">
                                                    <p className="text-xs font-semibold text-zinc-500">{t('reply.select')}</p>
                                                    <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-zinc-200/60 rounded-lg transition-colors">
                                                        <X size={14} className="text-zinc-400"/>
                                                    </button>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {QUICK_REPLIES.map((reply: string, idx: number) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                handleReply(order.id, reply);
                                                                // Only update order status if it's not a request type
                                                                if (order.type !== 'request') {
                                                                    handleUpdateOrderStatus(order.id, 'served');
                                                                }
                                                            }}
                                                            className="text-left text-sm p-3 rounded-xl bg-white text-zinc-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all font-medium shadow-sm border border-zinc-200/60 flex items-center justify-between group hover:shadow-md hover:border-blue-200/60"
                                                        >
                                                            <span className="flex-1">{reply}</span>
                                                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-blue-600"/>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2.5">
                                                <button 
                                                    onClick={() => setReplyingTo(order.id)}
                                                    className="flex-1 h-11 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 text-sm font-semibold rounded-xl hover:from-rose-100 hover:to-pink-100 transition-all flex items-center justify-center gap-2 border border-rose-200/60 shadow-sm shadow-rose-100/30"
                                                >
                                                    <MessageSquare size={16}/> {t('btn.reply')}
                                                </button>
                                                {order.type !== 'request' && (
                                                    <button 
                                                        onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                                                        className="flex-1 h-11 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white text-sm font-semibold rounded-xl hover:from-zinc-800 hover:to-zinc-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-zinc-900/10"
                                                    >
                                                        <Check size={16}/> {t('btn.done')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Orders Section */}
                        {tableOrders.some((o: any) => o.type === 'order') && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full"></div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('table.detail.orders')}</h4>
                                </div>
                                {tableOrders.filter((o: any) => o.type === 'order').map((order: any) => (
                                    <div key={order.id} className="bg-white/90 backdrop-blur-sm border border-zinc-200/60 p-5 rounded-3xl shadow-sm shadow-zinc-100/30">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                                            <span className="text-xs font-semibold text-zinc-500 flex items-center gap-2">
                                                <Clock size={13} className="text-zinc-400" />
                                                {order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${
                                                order.status === 'pending' ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200/60' :
                                                order.status === 'cooking' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/60' :
                                                order.status === 'served' ? 'bg-zinc-100 text-zinc-600 border border-zinc-200/60' :
                                                'bg-zinc-100 text-zinc-600 border border-zinc-200/60'
                                            }`}>
                                                {order.status === 'served' ? t('order.status.payment_pending') || '결제 대기' : order.status}
                                            </span>
                                        </div>
                                        <ul className="space-y-3.5 mb-5">
                                            {order.items.map((item: any, idx: number) => {
                                                const menuItem = menu.find(m => m.name === item.name);
                                                return (
                                                    <li key={idx} className="flex justify-between items-start gap-4 p-3 rounded-2xl bg-zinc-50/50 hover:bg-zinc-100/50 transition-colors">
                                                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                                            <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-zinc-200/60 shadow-sm">
                                                                {menuItem?.imageUrl ? (
                                                                    <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-zinc-300 bg-gradient-to-br from-zinc-50 to-zinc-100">
                                                                        <UtensilsCrossed size={16} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className="font-semibold text-zinc-900 text-sm mb-1">{item.name}</span>
                                                                {item.options && item.options.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                                        {item.options.map((opt: string, i: number) => (
                                                                            <span key={i} className="text-[10px] font-medium text-zinc-600 bg-white px-2 py-0.5 rounded-lg border border-zinc-200/60 shadow-sm">
                                                                                {opt}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <span className="text-xs text-zinc-500 mt-1.5 font-medium">
                                                                    {formatPriceVND(item.unitPrice || (item.price / item.quantity))} × {item.quantity}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center shrink-0">
                                                            <span className="font-bold text-zinc-900 text-sm">{formatPriceVND(item.price)}</span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {/* Order Actions */}
                                        <div className="flex gap-2.5">
                                            {order.status === 'pending' && (
                                                <button 
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'cooking')}
                                                    disabled={updatingOrderId === order.id}
                                                    className="flex-1 h-11 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white text-sm font-semibold rounded-xl hover:from-zinc-800 hover:to-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-zinc-900/10"
                                                >
                                                    <ChefHat size={16}/> {updatingOrderId === order.id ? t('order.status.updating') : t('order.action.start_cooking')}
                                                </button>
                                            )}
                                            {order.status === 'cooking' && (
                                                <button 
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                                                    disabled={updatingOrderId === order.id}
                                                    className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/20"
                                                >
                                                    <CircleCheck size={16}/> {updatingOrderId === order.id ? t('order.status.updating') : t('order.action.mark_served')}
                                                </button>
                                            )}
                                            {order.status === 'served' && (
                                                <div className="flex-1 h-11 bg-zinc-50/80 text-zinc-600 text-sm font-medium rounded-xl flex items-center justify-center gap-2 border border-zinc-200/60">
                                                    <CircleCheck size={16} className="text-zinc-400"/> {t('order.status.payment_pending') || '결제 대기 중'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-300 min-h-[300px] py-12">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100/50 flex items-center justify-center mb-4">
                            <UtensilsCrossed size={28} className="opacity-30" />
                        </div>
                        <p className="font-medium text-zinc-400">{t('table.detail.no_orders')}</p>
                    </div>
                )}

                {/* Chat Messages Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1 h-4 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-full"></div>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('table.detail.chat')}</h4>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm border border-zinc-200/60 rounded-3xl shadow-sm shadow-zinc-100/30 flex flex-col overflow-hidden" style={{ maxHeight: '520px' }}>
                        {/* Chat Messages List */}
                        <div ref={chatMessagesContainerRef} className="flex-1 p-5 space-y-4 overflow-y-auto min-h-[240px] scroll-smooth">
                            {isLoadingChat ? (
                                <div className="text-center py-12 text-zinc-400">
                                    <div className="inline-flex items-center gap-2 text-sm">
                                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"></div>
                                        {t('table.detail.loading') || t('report.loading') || '로딩 중...'}
                                    </div>
                                </div>
                            ) : chatMessages && chatMessages.filter((msg: BackendChatMessage) => msg.messageType === 'TEXT').length > 0 ? (
                                chatMessages
                                    .filter((msg: BackendChatMessage) => msg.messageType === 'TEXT')
                                    .map((msg: BackendChatMessage) => {
                                        const messageText = language === 'ko' 
                                            ? (msg.textKo || '')
                                            : language === 'vn'
                                            ? (msg.textVn || '')
                                            : (msg.textEn || '');
                                        const isUser = msg.senderType === 'USER';
                                        const isStaff = msg.senderType === 'STAFF';
                                        const isSystem = msg.senderType === 'SYSTEM';
                                        const messageDate = new Date(msg.createdAt);
                                        
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex gap-3 ${isUser ? 'flex-row' : isStaff ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                            >
                                                <div className={`flex-1 ${isUser ? 'text-left' : isStaff ? 'text-right' : 'text-center'} max-w-[75%]`}>
                                                    <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                                        isUser 
                                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-sm' 
                                                            : isStaff 
                                                            ? 'bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-900 border border-zinc-200/60 rounded-bl-sm'
                                                            : 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 border border-amber-200/60'
                                                    }`}>
                                                        <p className="font-medium leading-relaxed">{messageText}</p>
                                                        <p className={`text-[10px] mt-1.5 font-medium ${
                                                            isUser ? 'text-blue-100' : isStaff ? 'text-zinc-500' : 'text-amber-600'
                                                        }`}>
                                                            {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="text-center py-12 text-zinc-400">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100/50 flex items-center justify-center mx-auto mb-3">
                                        <MessageSquare size={20} className="opacity-30" />
                                    </div>
                                    <p className="text-sm">{t('table.detail.no_messages') || '메시지가 없습니다.'}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Chat Input Area */}
                        {selectedTable?.currentSessionId && (
                            <div className="border-t border-zinc-200/60 p-4 bg-gradient-to-b from-zinc-50/80 to-white/80 backdrop-blur-sm">
                                <div className="flex gap-2.5 items-end">
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
                                        className="flex-1 text-sm h-11 border-zinc-200 focus:border-indigo-400 focus:ring-indigo-400/20 bg-white/80 rounded-xl"
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
                                        className="px-5 py-2.5 h-11 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm shadow-indigo-500/20"
                                    >
                                        {isSendingChatMessage ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>{t('btn.sending') || '전송 중...'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <MessageSquare size={16} />
                                                <span>{t('btn.send') || '전송'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </ScrollArea>
            
            {/* Sheet Footer Actions */}
            <div className="shrink-0 p-4 bg-white border-t border-zinc-100 space-y-3">
                    <button 
                        onClick={onOrderEntryClick}
                        className="w-full h-12 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                        <ShoppingCart size={16} />
                        {t('order.entry.title')}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={closeTableDetail}
                            className="h-12 rounded-xl bg-zinc-100 text-zinc-600 font-bold text-sm hover:bg-zinc-200 transition-colors"
                        >
                            {t('table.detail.close')}
                        </button>
                        <button 
                            onClick={handleSmartAction}
                            disabled={currentTable?.status === 'ordering' && tableOrders.length === 0}
                            className={`h-12 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-zinc-200 active:scale-95 ${getActionButtonColor(currentTable?.status || selectedTable.status)} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-opacity-50`}
                        >
                            {getActionButtonText(currentTable?.status || selectedTable.status)}
                        </button>
                    </div>
            </div>
        </div>
    );
}