import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Clock, BellRing, UtensilsCrossed, MessageSquare, ArrowRight, ChefHat, CircleCheck, Check, List, X, Edit2, StickyNote, ShoppingCart, RotateCcw, CheckCircle2, CreditCard } from 'lucide-react';
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
  const { shopRestaurantId: restaurantId, shopUserRole, shopUser } = useUnifiedAuth();
  const [detailTableId, setDetailTableId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Debug: Log shopUserRole
  useEffect(() => {
    console.log('TableGrid shopUserRole:', shopUserRole, 'shopUser:', shopUser);
  }, [shopUserRole, shopUser]);
  
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
  const [quickReplies, setQuickReplies] = useState<Array<{ labelKo: string; labelVn: string; labelEn?: string; messageKo?: string; messageVn?: string; messageEn?: string }>>([]);
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

  // Load quick reply chips from API
  useEffect(() => {
    const loadQuickReplies = async () => {
      if (!restaurantId) return;
      
      try {
        console.log('Loading quick reply chips for restaurant:', restaurantId);
        const response = await apiClient.getQuickChips(restaurantId, 'STAFF_RESPONSE');
        console.log('Quick reply chips response:', response);
        
        if (response.success && response.data) {
          // Convert to format used in the component
          const replies = response.data.map((chip) => ({
            labelKo: chip.labelKo,
            labelVn: chip.labelVn,
            labelEn: chip.labelEn,
            messageKo: chip.messageKo || chip.labelKo,
            messageVn: chip.messageVn || chip.labelVn,
            messageEn: chip.messageEn || chip.labelEn,
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

  // Get quick reply text based on language
  const getQuickReplyText = (reply: { labelKo: string; labelVn: string; labelEn?: string }) => {
    if (language === 'ko') return reply.labelKo;
    if (language === 'vn') return reply.labelVn;
    return reply.labelEn || reply.labelKo;
  };

  // Get quick reply message based on language
  const getQuickReplyMessage = (reply: { messageKo?: string; messageVn?: string; messageEn?: string }) => {
    if (language === 'ko') return reply.messageKo || '';
    if (language === 'vn') return reply.messageVn || '';
    return reply.messageEn || reply.messageKo || '';
  };

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
            
            // If table has an active session, prioritize showing orders from that session
            // But also show recent orders without sessionId (for orders created before sessionId is set)
            if (selectedTable.currentSessionId) {
              // If order has sessionId, it must match the table's currentSessionId
              if (o.sessionId) {
                return o.sessionId === selectedTable.currentSessionId;
              }
              // If order doesn't have sessionId but is recent (within 30 minutes), show it
              // This handles the case where order was created before sessionId was set
              if (selectedTable.status === 'ordering' || selectedTable.status === 'dining') {
                const orderAge = Date.now() - o.timestamp.getTime();
                const thirtyMinutes = 30 * 60 * 1000;
                return orderAge < thirtyMinutes;
              }
              return false;
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

  const handleResetTable = async () => {
    if (!selectedTable || !selectedTable.tableId) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      language === 'ko' 
        ? `테이블 ${selectedTable.id}을(를) 공석으로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
        : language === 'vn'
        ? `Bạn có chắc chắn muốn đặt lại bàn ${selectedTable.id} về trạng thái trống? Hành động này không thể hoàn tác.`
        : `Are you sure you want to reset table ${selectedTable.id} to empty? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const result = await apiClient.resetTable(selectedTable.tableId);
      
      if (result.success) {
        // Reload tables from backend to get accurate state
        if (onTablesReload) {
          await onTablesReload();
        } else {
          // Fallback: Update local state if reload callback is not available
          setTables(prev => prev.map(t => 
            t.id === selectedTable.id 
              ? { ...t, status: 'empty', guests: 0, totalAmount: 0, orderTime: undefined }
              : t
          ));
        }

        // Reload orders to remove orders from reset table
        // This ensures the orders array doesn't contain stale data for empty tables
        if (onOrdersReload) {
          await onOrdersReload();
        }

        // Close detail panel since table is now empty
        setIsDetailOpen(false);

        toast.success(
          language === 'ko'
            ? `테이블 ${selectedTable.id}이(가) 공석으로 초기화되었습니다.`
            : language === 'vn'
            ? `Bàn ${selectedTable.id} đã được đặt lại về trạng thái trống.`
            : `Table ${selectedTable.id} has been reset to empty.`
        );
      } else {
        throw new Error(result.error?.message || 'Failed to reset table');
      }
    } catch (error: unknown) {
      console.error('Error resetting table:', error);
      toast.error(
        language === 'ko'
          ? '테이블 초기화에 실패했습니다.'
          : language === 'vn'
          ? 'Không thể đặt lại bàn.'
          : 'Failed to reset table.'
      );
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
    
    // Calculate table status badge using the same logic as table cards
    // Priority: 청소중 > 결제완료 > 서빙완료 > 조리중 > 식사중 > 주문완료 > 주문중
    const tableOrdersForStatus = tableOrders.filter((o: any) => o.type === 'order');
    const pendingOrders = tableOrdersForStatus.filter((o: any) => o.status === 'pending');
    const cookingOrders = tableOrdersForStatus.filter((o: any) => o.status === 'cooking');
    const servedOrders = tableOrdersForStatus.filter((o: any) => o.status === 'served');
    const paidOrders = tableOrdersForStatus.filter((o: any) => o.status === 'paid');
    
    let statusLabel = '';
    if (selectedTable.status === 'cleaning') {
      statusLabel = t('table.status.cleaning') || '청소중';
    } else if (selectedTable.status === 'dining' && paidOrders.length > 0) {
      statusLabel = t('payment.status.completed') || '결제완료';
    } else if (cookingOrders.length > 0) {
      statusLabel = t('order.status.cooking') || '조리중';
    } else if (servedOrders.length > 0 && paidOrders.length === 0) {
      // 서빙완료 - 서빙 완료된 주문이 있고 결제가 완료되지 않은 경우 (ORDERING 또는 DINING 상태)
      statusLabel = t('order.status.served') || '서빙완료';
    } else if (selectedTable.status === 'dining' && paidOrders.length === 0) {
      // 서빙완료 - DINING 상태이고 결제가 완료되지 않은 경우 (서빙 완료 주문이 없어도)
      statusLabel = t('order.status.served') || '서빙완료';
    } else if (selectedTable.status === 'ordering' && pendingOrders.length === 0 && tableOrdersForStatus.length > 0 && (cookingOrders.length > 0 || servedOrders.length > 0 || paidOrders.length > 0)) {
      statusLabel = t('order.status.completed') || '주문완료';
    } else if (selectedTable.status === 'ordering') {
      statusLabel = t('status.ordering') || '주문중';
    } else {
      // Fallback to table status
      statusLabel = t(`status.${selectedTable.status}`) || selectedTable.status;
    }
    
    return (
        <div className="bg-white px-4 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-zinc-900 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    {selectedTable.id}
                </div>
                <div>
                    <TitleComponent className="text-base font-semibold text-zinc-900 flex items-center gap-2 mb-0.5">
                        <span>{t('table.detail.orders')}</span>
                        <span className="text-xs font-medium text-zinc-500 px-2 py-0.5 bg-zinc-100 rounded">
                            {statusLabel}
                        </span>
                    </TitleComponent>
                    <DescriptionComponent className="text-xs text-zinc-500 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <User size={11} className="text-zinc-400" />
                            <span className="font-medium text-zinc-700">{selectedTable.guests}</span>
                            <span className="text-zinc-400">/</span>
                            <span>{selectedTable.capacity}</span>
                        </span>
                        {selectedTable.orderTime && (
                            <>
                                <span className="w-0.5 h-0.5 rounded-full bg-zinc-300"></span>
                                <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-zinc-400" />
                                    <span className="font-medium text-zinc-700 font-mono">
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
                <p className="text-xs text-zinc-500 font-medium mb-0.5">{t('table.detail.total')}</p>
                <p className="text-lg font-bold text-zinc-900">
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
              // Get all orders for this table (exclude cancelled orders)
              // Also exclude orders for empty tables to prevent showing stale data
              const tableOrders = table.status === 'empty' 
                ? [] 
                : orders.filter(o => 
                    o.tableId === table.id && 
                    o.type === 'order' && 
                    o.status !== 'cancelled'
                  );
              const pendingOrders = tableOrders.filter(o => o.status === 'pending');
              const cookingOrders = tableOrders.filter(o => o.status === 'cooking');
              const servedOrders = tableOrders.filter(o => o.status === 'served');
              const paidOrders = tableOrders.filter(o => o.status === 'paid');
              
              // Check for active requests from tableRequestStatus map
              const hasRequestFromStatus = tableRequestStatus.get(table.id) || false;
              const activeRequestFromOrders = orders.find(o => o.tableId === table.id && o.status === 'pending' && o.type === 'request');
              const activeRequest = hasRequestFromStatus || activeRequestFromOrders;
              const hasAlert = pendingOrders.length > 0 || activeRequest;
              
              // Determine table status badge based on table status and order statuses
              // Priority: 청소중 > 결제완료 > 서빙완료 > 조리중 > 식사중 > 주문완료 > 주문중
              let tableStatusBadge: {
                label: string;
                color: string;
                bgColor: string;
                borderColor: string;
                textColor: string;
              } | null = null;
              
              if (table.status === 'cleaning') {
                // 청소중
                tableStatusBadge = {
                  label: t('table.status.cleaning') || '청소중',
                  color: 'blue',
                  bgColor: 'bg-blue-500',
                  borderColor: 'border-blue-500',
                  textColor: 'text-white'
                };
              } else if (table.status === 'dining' && paidOrders.length > 0) {
                // 결제완료
                tableStatusBadge = {
                  label: t('payment.status.completed') || '결제완료',
                  color: 'emerald',
                  bgColor: 'bg-emerald-500',
                  borderColor: 'border-emerald-500',
                  textColor: 'text-white'
                };
              } else if (cookingOrders.length > 0) {
                // 조리중
                tableStatusBadge = {
                  label: t('order.status.cooking') || '조리중',
                  color: 'blue',
                  bgColor: 'bg-blue-500',
                  borderColor: 'border-blue-500',
                  textColor: 'text-white'
                };
              } else if (servedOrders.length > 0 && paidOrders.length === 0) {
                // 서빙완료 - 서빙 완료된 주문이 있고 결제가 완료되지 않은 경우 (ORDERING 또는 DINING 상태)
                tableStatusBadge = {
                  label: t('order.status.served') || '서빙완료',
                  color: 'zinc',
                  bgColor: 'bg-zinc-500',
                  borderColor: 'border-zinc-500',
                  textColor: 'text-white'
                };
              } else if (table.status === 'dining' && paidOrders.length === 0) {
                // 서빙완료 - DINING 상태이고 결제가 완료되지 않은 경우 (서빙 완료 주문이 없어도)
                tableStatusBadge = {
                  label: t('order.status.served') || '서빙완료',
                  color: 'zinc',
                  bgColor: 'bg-zinc-500',
                  borderColor: 'border-zinc-500',
                  textColor: 'text-white'
                };
              } else if (table.status === 'ordering' && pendingOrders.length === 0 && tableOrders.length > 0 && cookingOrders.length > 0) {
                // 주문완료 - 주문이 있고 조리 중인 상태
                tableStatusBadge = {
                  label: t('order.status.completed') || '주문완료',
                  color: 'orange',
                  bgColor: 'bg-orange-500',
                  borderColor: 'border-orange-500',
                  textColor: 'text-white'
                };
              } else if (table.status === 'ordering') {
                // 주문중 - 주문 대기 중이거나 아직 주문이 없는 상태
                tableStatusBadge = {
                  label: t('status.ordering') || '주문중',
                  color: 'orange',
                  bgColor: 'bg-orange-500',
                  borderColor: 'border-orange-500',
                  textColor: 'text-white'
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
                    <div className="flex items-center gap-1.5">
                      {/* Status Badge */}
                      {tableStatusBadge && (
                        <div className={`${tableStatusBadge.bgColor} ${tableStatusBadge.textColor} px-2 py-1 rounded-md shadow-sm flex items-center gap-1.5`}>
                          <span className="text-[10px] font-bold leading-none">{tableStatusBadge.label}</span>
                        </div>
                      )}
                      {/* Alert Badge - Show separately from status badge */}
                      {hasAlert && table.status !== 'cleaning' && (
                        <div className="bg-rose-500 text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1.5 animate-in zoom-in-50">
                          <BellRing size={10} fill="currentColor" className="animate-pulse" />
                          <span className="text-[10px] font-bold leading-none">{activeRequest ? t('table.status.call') : t('table.status.order')}</span>
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
                    handleResetTable={handleResetTable}
                    closeTableDetail={closeTableDetail}
                    getActionButtonText={getActionButtonText}
                    getActionButtonColor={getActionButtonColor}
                    quickReplies={quickReplies}
                    getQuickReplyText={getQuickReplyText}
                    getQuickReplyMessage={getQuickReplyMessage}
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
                    handleResetTable={handleResetTable}
                    closeTableDetail={closeTableDetail}
                    getActionButtonText={getActionButtonText}
                    getActionButtonColor={getActionButtonColor}
                    quickReplies={quickReplies}
                    getQuickReplyText={getQuickReplyText}
                    getQuickReplyMessage={getQuickReplyMessage}
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
    handleSmartAction, handleResetTable, closeTableDetail, getActionButtonText, getActionButtonColor, quickReplies, getQuickReplyText, getQuickReplyMessage,
    handleUpdateGuests, handleUpdateMemo, onOrderEntryClick, updatingOrderId, menu = [], formatPriceVND, language = 'ko', shopUserRole,
    updateTableToCleaning, onTablesReload, onCheckoutClick
}: any) {
    const [isEditingGuests, setIsEditingGuests] = useState(false);
    
    // Check if user can reset table (OWNER or MANAGER)
    const canResetTable = shopUserRole === 'OWNER' || shopUserRole === 'MANAGER';
    
    // Debug log
    useEffect(() => {
        console.log('DetailBody shopUserRole:', shopUserRole, 'canResetTable:', canResetTable);
    }, [shopUserRole, canResetTable]);
    const [isEditingMemo, setIsEditingMemo] = useState(false);
    const [chatInputText, setChatInputText] = useState('');
    const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
    const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
    
    // Always get the latest table data from tables array
    const currentTable = tables.find((t: Table) => t.id === detailTableId) || selectedTable;
    const [tempGuests, setTempGuests] = useState(currentTable?.guests?.toString() || '0');
    const [tempMemo, setTempMemo] = useState(currentTable?.memo || '');
    const [savedGuests, setSavedGuests] = useState<number | null>(null); // Track saved guest count for immediate UI update

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
        <div className="h-full flex flex-col overflow-hidden min-h-0 bg-white">
            {/* Quick Action Bar - Fixed at top */}
            <div className="shrink-0 px-4 pt-4 pb-3 bg-white border-b border-zinc-200 space-y-2">
                {/* Primary Actions Row */}
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
                              hasPaidOrders || // 결제 완료 후 비활성화
                              (currentTable?.status === 'empty' && (currentTable?.guests ?? 0) === 0) ||
                              (currentTable?.status === 'empty' && savedGuests !== null && savedGuests === 0)
                            }
                            className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart size={16} />
                            {t('order.entry.title')}
                          </button>
                          {/* Main Action Button */}
                          {(() => {
                            // DINING 상태일 때
                            if (currentTable?.status === 'dining') {
                              if (hasPaidOrders) {
                                // 결제 완료된 경우 - 청소 완료 버튼
                                return (
                                  <button 
                                    onClick={async () => {
                                      if (updateTableToCleaning) {
                                        await updateTableToCleaning();
                                      }
                                    }}
                                    className="h-10 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle2 size={16} />
                                    {t('table.action.complete_cleaning')}
                                  </button>
                                );
                              } else {
                                // 결제 및 정리 버튼
                                return (
                                  <button 
                                    onClick={onCheckoutClick}
                                    className="h-10 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                  >
                                    <CreditCard size={16} />
                                    {t('table.action.checkout_clear')}
                                  </button>
                                );
                              }
                            }
                            
                            // ORDERING 상태일 때 - 식사 시작 버튼 제거 (hasServedOrders가 false일 때는 버튼 표시 안 함)
                            if (currentTable?.status === 'ordering' && !hasServedOrders) {
                              return null; // 식사 시작 버튼 제거
                            }
                            
                            // EMPTY, CLEANING 상태일 때
                            return (
                              <button 
                                onClick={handleSmartAction}
                                disabled={
                                  (currentTable?.status === 'empty' && effectiveGuests === 0)
                                }
                                className={`h-10 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${getActionButtonColor(currentTable?.status || selectedTable.status)} disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {getActionButtonText(currentTable?.status || selectedTable.status, hasServedOrders)}
                              </button>
                            );
                          })()}
                        </>
                      );
                    })()}
                </div>
            </div>
            
            {/* Body */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                     {/* Info Section - Minimal Design */}
                     <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
                        {/* Guest Count */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User size={14} className="text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-600">{t('table.detail.guest_count')}</span>
                            </div>
                            {isEditingGuests ? (
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        value={tempGuests} 
                                        onChange={(e) => setTempGuests(e.target.value)}
                                        className="w-20 h-8 text-sm font-medium text-center border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && saveGuests()}
                                    />
                                    <button onClick={saveGuests} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                        <Check size={12} />
                                    </button>
                                    <button onClick={() => setIsEditingGuests(false)} className="p-1.5 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-zinc-200 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsEditingGuests(true)}
                                    className="flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors group"
                                >
                                    <span>{savedGuests !== null ? savedGuests : (currentTable?.guests ?? 0)}</span>
                                    <span className="text-zinc-400">/</span>
                                    <span className="text-zinc-600">{currentTable?.capacity ?? 0}</span>
                                    <Edit2 size={12} className="text-zinc-400 group-hover:text-zinc-600 transition-colors ml-1" />
                                </button>
                            )}
                        </div>

                        {/* Memo */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <StickyNote size={14} className="text-zinc-400" />
                                    <span className="text-xs font-medium text-zinc-600">{t('table.detail.memo')}</span>
                                </div>
                                {!isEditingMemo && (
                                    <button 
                                        onClick={() => setIsEditingMemo(true)}
                                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 px-2 py-1 rounded transition-colors"
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
                                        className="text-sm min-h-[80px] border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsEditingMemo(false)} className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
                                            {t('btn.cancel')}
                                        </button>
                                        <button onClick={saveMemo} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
                                            {t('btn.save')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setIsEditingMemo(true)}
                                    className={`text-sm p-3 rounded-lg border border-dashed transition-all cursor-pointer ${
                                        currentTable?.memo 
                                            ? 'bg-amber-50/50 border-amber-200 text-amber-900 hover:border-amber-300' 
                                            : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300'
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

                     {/* Payment Status Section - Show if there are paid orders */}
                     {(() => {
                       const paidOrders = tableOrders.filter((o: any) => o.type === 'order' && o.status === 'paid');
                       if (paidOrders.length === 0) return null;
                       
                       // Calculate total payment amount
                       const totalPaymentAmount = paidOrders.reduce((sum: number, order: any) => {
                         if (!order.items || order.items.length === 0) return sum;
                         const orderTotal = order.items.reduce((itemSum: number, item: any) => {
                           return itemSum + (item.price || 0);
                         }, 0);
                         return sum + orderTotal;
                       }, 0);
                       
                       // Get most recent payment time
                       const mostRecentPayment = paidOrders.sort((a: any, b: any) => 
                         b.timestamp.getTime() - a.timestamp.getTime()
                       )[0];
                       const paymentTime = mostRecentPayment.timestamp;
                       
                       // Payment method (could be extracted from notification metadata, but for now we'll use a default)
                       // In a real implementation, this would come from the payment notification metadata
                       const paymentMethod = language === 'ko' ? '계좌이체' : language === 'vn' ? 'Chuyển khoản' : 'Bank Transfer';
                       
                       return (
                         <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                           <div className="flex items-center gap-2">
                             <CheckCircle2 size={14} className="text-emerald-600" />
                             <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{t('payment.status.completed')}</span>
                           </div>
                           
                           <div className="space-y-2">
                             {/* Payment Amount */}
                             <div className="flex items-center justify-between">
                               <span className="text-xs font-medium text-zinc-600">{t('payment.amount')}</span>
                               <span className="text-base font-bold text-emerald-900">{formatPriceVND(totalPaymentAmount)}</span>
                             </div>
                             
                             {/* Payment Method */}
                             <div className="flex items-center justify-between">
                               <span className="text-xs font-medium text-zinc-600">{t('payment.method')}</span>
                               <span className="text-xs font-semibold text-zinc-900">{paymentMethod}</span>
                             </div>
                             
                             {/* Payment Time */}
                             <div className="flex items-center justify-between">
                               <span className="text-xs font-medium text-zinc-600">{t('payment.time')}</span>
                               <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1">
                                 <Clock size={11} />
                                 {paymentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                             </div>
                           </div>
                         </div>
                       );
                     })()}

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
                                                    {quickReplies.length === 0 ? (
                                                        <div className="text-sm text-muted-foreground text-center py-4">
                                                            상용구가 없습니다.
                                                        </div>
                                                    ) : (
                                                        quickReplies.map((reply, idx: number) => {
                                                            const replyText = getQuickReplyText(reply);
                                                            const replyMessage = getQuickReplyMessage(reply);
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        if (replyMessage) {
                                                                            handleReply(order.id, replyMessage);
                                                                        }
                                                                        // Only update order status if it's not a request type
                                                                        if (order.type !== 'request') {
                                                                            handleUpdateOrderStatus(order.id, 'served');
                                                                        }
                                                                    }}
                                                                    className="text-left text-sm p-3 rounded-xl bg-white text-zinc-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all font-medium shadow-sm border border-zinc-200/60 flex items-center justify-between group hover:shadow-md hover:border-blue-200/60"
                                                                >
                                                                    <span className="flex-1">{replyText}</span>
                                                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-blue-600"/>
                                                                </button>
                                                            );
                                                        })
                                                    )}
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
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1 pb-1">
                                    <h4 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">{t('table.detail.orders')}</h4>
                                </div>
                                {tableOrders.filter((o: any) => o.type === 'order').map((order: any) => (
                                    <div key={order.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                                        {/* Order Header */}
                                        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} className="text-zinc-400" />
                                                <span className="text-xs font-medium text-zinc-600">
                                                    {order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wide ${
                                                order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                order.status === 'cooking' ? 'bg-blue-100 text-blue-700' :
                                                order.status === 'served' ? 'bg-zinc-100 text-zinc-600' :
                                                order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-zinc-100 text-zinc-600'
                                            }`}>
                                                {order.status === 'pending' ? t('order.status.pending') || '주문중' :
                                                 order.status === 'cooking' ? t('order.status.cooking') || '조리중' :
                                                 order.status === 'served' ? t('order.status.served') || '서빙완료' :
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
                                                        <div className="w-10 h-10 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-100">
                                                            {menuItem?.imageUrl ? (
                                                                <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <UtensilsCrossed size={14} className="text-zinc-300" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                <span className="text-sm font-semibold text-zinc-900 leading-snug">{item.name}</span>
                                                                <span className="text-sm font-bold text-zinc-900 shrink-0">{formatPriceVND(item.price)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-zinc-500">
                                                                    {formatPriceVND(item.unitPrice || (item.price / item.quantity))} × {item.quantity}
                                                                </span>
                                                                {item.options && item.options.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {item.options.map((opt: string, i: number) => (
                                                                            <span key={i} className="text-[10px] font-medium text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded">
                                                                                {opt}
                                                                            </span>
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
                                                    className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <ChefHat size={13}/> {updatingOrderId === order.id ? t('order.status.updating') : t('order.action.start_cooking')}
                                                </button>
                                            )}
                                            {order.status === 'cooking' && (
                                                <button 
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                                                    disabled={updatingOrderId === order.id}
                                                    className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <CircleCheck size={13}/> {updatingOrderId === order.id ? t('order.status.updating') : t('order.action.mark_served')}
                                                </button>
                                            )}
                                            {order.status === 'served' && (
                                                <div className="w-full h-9 bg-zinc-50 text-zinc-500 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 border border-zinc-200">
                                                    <CircleCheck size={13} className="text-zinc-400"/> {t('order.status.payment_pending') || '결제 대기 중'}
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
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1 pb-1">
                        <h4 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">{t('table.detail.chat')}</h4>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden" style={{ maxHeight: '520px' }}>
                        {/* Chat Messages List */}
                        <div ref={chatMessagesContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[240px] scroll-smooth">
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
                                                className={`flex gap-2 ${isUser ? 'flex-row' : isStaff ? 'flex-row-reverse' : 'flex-row'}`}
                                            >
                                                <div className={`flex-1 ${isUser ? 'text-left' : isStaff ? 'text-right' : 'text-center'} max-w-[80%]`}>
                                                    <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                                                        isUser 
                                                            ? 'bg-blue-500 text-white' 
                                                            : isStaff 
                                                            ? 'bg-zinc-100 text-zinc-900'
                                                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                                                    }`}>
                                                        <p className="font-medium leading-relaxed text-sm">{messageText}</p>
                                                        <p className={`text-[10px] mt-1 font-medium ${
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
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2">
                                        <MessageSquare size={16} className="text-zinc-400" />
                                    </div>
                                    <p className="text-xs">{t('table.detail.no_messages') || '메시지가 없습니다.'}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Chat Input Area */}
                        {selectedTable?.currentSessionId && (
                            <div className="border-t border-zinc-200 p-3 bg-white">
                                <div className="flex gap-2">
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
                                        className="flex-1 text-sm h-9 border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white rounded-lg"
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
                                        className="px-3 h-9 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
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
                    </div>
                </div>
                </div>
            </ScrollArea>
            
            {/* Sheet Footer Actions - 초기화 및 닫기 버튼 */}
            <div className="shrink-0 bg-white border-t border-zinc-200">
                <div className="p-3">
                    <div className="flex gap-2">
                        {handleResetTable && canResetTable && (
                            <button 
                                onClick={handleResetTable}
                                className="flex-1 h-9 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            >
                                <RotateCcw size={13} />
                                {language === 'ko' ? '초기화' : language === 'vn' ? 'Đặt lại' : 'Reset'}
                            </button>
                        )}
                        <button 
                            onClick={closeTableDetail}
                            className={`h-9 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors ${handleResetTable && canResetTable ? 'flex-1' : 'w-full'}`}
                        >
                            {t('table.detail.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}