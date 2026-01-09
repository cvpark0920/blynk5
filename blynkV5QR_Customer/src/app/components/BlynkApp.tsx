import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, QuickChip, CartItem, MenuItem as FrontendMenuItem, MenuOption } from '../types';
import ChatBubble from './chat/ChatBubble';
import { QuickActions } from './chat/QuickActions';
import { MenuModal } from './menu/MenuModal';
import { BillModal } from './order/BillModal';
import { EventModal } from './event/EventModal';
import { LanguageSelector } from './intro/LanguageSelector';
import { LoadingScreen } from './LoadingScreen';
import { ErrorPage } from './ErrorPage';
import { Send, Camera, Receipt, X, ShoppingBag, Globe, PartyPopper, UtensilsCrossed } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../context/SessionContext';
import { apiClient, Menu, MenuItem as BackendMenuItem, ChatMessage as BackendChatMessage } from '../../lib/api';
import { SSEClient, SSEEvent } from '../../lib/sseClient';
import { toast } from 'sonner';
import { getTranslation } from '../i18n/translations';

type LangType = 'ko' | 'vn' | 'en';

// 백엔드 ChatMessage를 프론트엔드 ChatMessage로 변환
const convertBackendMessage = (msg: BackendChatMessage): ChatMessage => {
  return {
    id: msg.id,
    sender: msg.senderType === 'USER' ? 'user' : msg.senderType === 'STAFF' ? 'staff' : 'system',
    textKO: msg.textKo || '',
    textVN: msg.textVn || '',
    textEN: msg.textEn,
    timestamp: new Date(msg.createdAt),
    type: msg.messageType === 'TEXT' ? 'text' : msg.messageType === 'IMAGE' ? 'image' : msg.messageType === 'ORDER' ? 'order' : 'request',
    metadata: msg.metadata,
    imageUrl: msg.imageUrl,
  };
};

// 백엔드 MenuItem을 프론트엔드 MenuItem으로 변환
const convertBackendMenuItem = (item: BackendMenuItem, category: string): FrontendMenuItem => {
  // optionGroups를 평탄화하여 options 배열로 변환
  const options = (item.optionGroups && Array.isArray(item.optionGroups) 
    ? item.optionGroups.flatMap(group => 
        (group.options && Array.isArray(group.options)
          ? group.options.map(opt => ({
              id: opt.id,
              labelKO: opt.nameKo,
              labelVN: opt.nameVn,
              labelEN: opt.nameEn,
              priceVND: opt.priceVnd,
            }))
          : [])
      )
    : []).filter(Boolean);

  return {
    id: item.id,
    nameKO: item.nameKo,
    nameVN: item.nameVn,
    nameEN: item.nameEn,
    priceVND: item.priceVnd,
    category: category as 'food' | 'drink' | 'dessert',
    imageQuery: item.imageUrl || '',
    descriptionKO: item.descriptionKo,
    descriptionVN: item.descriptionVn,
    descriptionEN: item.descriptionEn,
    options: options.length > 0 ? options : undefined,
  };
};

export const BlynkApp: React.FC = () => {
  const { lang: userLang, setLang: setUserLang } = useLanguage();
  const { sessionId, restaurantId, tableId, tableNumber, isLoading: sessionLoading, error: sessionError, refreshSession, session } = useSession();
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<CartItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuItems, setMenuItems] = useState<FrontendMenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [quickChips, setQuickChips] = useState<QuickChip[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [sessionOrders, setSessionOrders] = useState<CartItem[]>([]);
  
  // Coach mark state
  const [showCoachMark, setShowCoachMark] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'chat' | 'menu' | 'cart' | 'bill' | 'event'>('chat');
  
  // Modals state (controlled by tabs or direct action)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [menuStartCart, setMenuStartCart] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  
  const [inputText, setInputText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sseClientRef = useRef<SSEClient | null>(null);

  // Calculate cart item count for badge
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // 메뉴 로드
  useEffect(() => {
    if (!restaurantId || sessionLoading) return;

    const loadMenu = async () => {
      setIsLoadingMenu(true);
      try {
        const response = await apiClient.getMenu(restaurantId);
        console.log('Menu API Response:', response); // 디버깅용
        if (response.success && response.data) {
          // 백엔드가 categories 배열을 직접 반환하는지 확인
          // response.data가 배열인 경우와 객체인 경우 모두 처리
          const categories = Array.isArray(response.data) 
            ? response.data 
            : (response.data as Menu).categories || [];
          
          console.log('Categories:', categories); // 디버깅용
          console.log('Categories length:', categories.length); // 디버깅용
          
          // 카테고리별로 메뉴 아이템 변환 및 평탄화
          const allItems: FrontendMenuItem[] = [];
          
          // categories가 존재하고 배열인지 확인
          if (categories && Array.isArray(categories) && categories.length > 0) {
            categories.forEach((category, index) => {
              console.log(`Category ${index}:`, category); // 디버깅용
              console.log(`Category ${index} menuItems:`, category.menuItems); // 디버깅용
              const categoryName = category.nameKo.toLowerCase().includes('음식') || category.nameKo.toLowerCase().includes('food') 
                ? 'food' 
                : category.nameKo.toLowerCase().includes('음료') || category.nameKo.toLowerCase().includes('drink')
                ? 'drink'
                : 'dessert';
              
              // menuItems가 존재하고 배열인지 확인
              if (category.menuItems && Array.isArray(category.menuItems)) {
                category.menuItems.forEach(item => {
                  if (!item.isSoldOut) {
                    allItems.push(convertBackendMenuItem(item, categoryName));
                  }
                });
              }
            });
          }
          
          console.log('All menu items:', allItems); // 디버깅용
          console.log('Menu items count:', allItems.length); // 디버깅용
          
          // API에서 받은 카테고리 데이터 저장
          setMenuCategories(categories);
          setMenuItems(allItems);

          // TODO: 백엔드 API 연동 필요
          // QuickChips는 현재 하드코딩되어 있음
          // 백엔드에 QuickChips 모델/API가 추가되면 API를 통해 가져오도록 변경 필요
          setQuickChips([
            {
              id: 'c1',
              icon: 'Droplets',
              labelKO: '물 주세요',
              labelVN: 'Cho tôi nước',
              labelEN: 'Water',
              action: 'message',
              messageKO: '물 좀 주시겠어요?',
              messageVN: 'Làm ơn cho tôi xin nước lọc.',
              messageEN: 'Can I have some water please?'
            },
            {
              id: 'c2',
              icon: 'Utensils',
              labelKO: '수저',
              labelVN: 'Muỗng đũa',
              labelEN: 'Cutlery',
              action: 'message',
              messageKO: '수저 세트 부탁드립니다.',
              messageVN: 'Làm ơn cho tôi xin bộ muỗng đũa.',
              messageEN: 'Can I have a cutlery set please?'
            },
            {
              id: 'c3',
              icon: 'Leaf',
              labelKO: '고수 빼고',
              labelVN: 'Không rau mùi',
              labelEN: 'No Cilantro',
              action: 'message',
              messageKO: '고수는 빼주세요.',
              messageVN: 'Vui lòng không cho rau mùi.',
              messageEN: 'No cilantro please.'
            },
            {
              id: 'c4',
              icon: 'ThermometerSnowflake',
              labelKO: '얼음',
              labelVN: 'Đá lạnh',
              labelEN: 'Ice',
              action: 'message',
              messageKO: '얼음 좀 주실 수 있나요?',
              messageVN: 'Cho tôi xin ít đá lạnh.',
              messageEN: 'Can I have some ice please?'
            }
          ]);
        } else if (response.error) {
          // API 응답은 받았지만 에러가 있는 경우
          console.error('Failed to load menu:', response.error);
          toast.error(response.error.message || '메뉴를 불러오는데 실패했습니다.');
          setMenuCategories([]);
          setMenuItems([]);
        } else {
          // 응답은 성공이지만 데이터가 없는 경우
          console.warn('Menu loaded but no data received');
          setMenuCategories([]);
          setMenuItems([]);
        }
      } catch (error) {
        // 네트워크 에러 또는 기타 예외
        console.error('Failed to load menu:', error);
        const errorMessage = error instanceof Error 
          ? error.message.includes('fetch') || error.message.includes('network')
            ? '네트워크 연결을 확인해주세요.'
            : error.message
          : '메뉴를 불러오는데 실패했습니다.';
        toast.error(errorMessage);
        setMenuCategories([]);
        setMenuItems([]);
      } finally {
        setIsLoadingMenu(false);
      }
    };

    loadMenu();
  }, [restaurantId, sessionLoading]);

  // 모든 데이터 초기화 함수
  const resetAllData = () => {
    // 모든 상태 초기화
    setMessages([]);
    setCart([]);
    setConfirmedOrders([]);
    setSessionOrders([]);
    setInputText('');
    setPreviewImage(null);
    
    // localStorage에서 세션 ID 삭제
    if (restaurantId && tableNumber) {
      const storageKey = `session_${restaurantId}_${tableNumber}`;
      localStorage.removeItem(storageKey);
    }
    
    // SSE 연결 종료
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
      sseClientRef.current = null;
    }
    
    console.log('All data reset completed');
  };

  // 세션 종료 처리 함수
  const handleSessionEnded = async () => {
    console.log('Session ended event received');
    
    // 모든 데이터 초기화
    resetAllData();
    
    // 새 세션 생성 트리거
    if (refreshSession) {
      await refreshSession();
    }
    
    // 사용자에게 알림 표시
    const message = userLang === 'ko' 
      ? '테이블이 초기화되었습니다.'
      : userLang === 'vn'
      ? 'Bàn đã được khởi tạo lại.'
      : 'Table has been reset.';
    toast.info(message);
  };

  // SSE 이벤트 핸들러
  const handleSSEEvent = (event: SSEEvent) => {
    console.log('SSE Event received:', event);
    
    switch (event.type) {
      case 'order:status':
        // 주문 상태 변경 처리
        handleOrderStatusChange(event);
        break;
      
      case 'chat:message':
        // 채팅 메시지 수신 처리
        handleChatMessage(event);
        break;
      
      case 'session:ended':
        // 세션 종료 처리
        handleSessionEnded();
        break;
      
      case 'connected':
        console.log('SSE connected at:', event.timestamp);
        break;
      
      default:
        console.log('Unknown SSE event type:', event.type);
    }
  };

  // 주문 상태 변경 처리
  const handleOrderStatusChange = async (event: SSEEvent) => {
    const { orderId, status } = event;
    
    if (!orderId || !status) {
      console.warn('Invalid order:status event:', event);
      return;
    }

    // 주문 목록 새로고침
    await refreshSessionOrders();

    // 주문 상태에 따른 메시지 생성 (토스트 알림용)
    const statusMessages = {
      PENDING: {
        ko: '주문이 접수되었습니다.',
        vn: 'Đơn hàng đã được tiếp nhận.',
        en: 'Order has been received.',
      },
      COOKING: {
        ko: '주문이 조리 중입니다.',
        vn: 'Đơn hàng đang được chế biến.',
        en: 'Order is being prepared.',
      },
      SERVED: {
        ko: '주문이 준비되었습니다.',
        vn: 'Đơn hàng đã sẵn sàng.',
        en: 'Order is ready.',
      },
      PAID: {
        ko: '결제가 완료되었습니다.',
        vn: 'Thanh toán đã hoàn tất.',
        en: 'Payment has been completed.',
      },
      CANCELLED: {
        ko: '주문이 취소되었습니다.',
        vn: 'Đơn hàng đã bị hủy.',
        en: 'Order has been cancelled.',
      },
    };

    const message = statusMessages[status as keyof typeof statusMessages] || statusMessages.PENDING;
    
    // 채팅 히스토리를 다시 로드하여 DB에 저장된 메시지 표시 (중복 방지)
    // DB에 이미 저장된 메시지가 있으므로 SSE 이벤트로 메시지를 추가하지 않음
    if (sessionId && !reloadingChatRef.current) {
      reloadingChatRef.current = true;
      try {
        const response = await apiClient.getChatHistory(sessionId);
        if (response.success && response.data) {
          const convertedMessages = response.data.map(convertBackendMessage);
          setMessages(convertedMessages);
        }
      } catch (error) {
        console.error('Failed to reload chat history:', error);
      } finally {
        reloadingChatRef.current = false;
      }
    }

    // 토스트 알림만 표시 (채팅 메시지는 DB에서 로드됨)
    const toastMessage = userLang === 'ko' ? message.ko : userLang === 'vn' ? message.vn : message.en;
    toast.info(toastMessage);
  };

  // Prevent duplicate chat history reloads
  const reloadingChatRef = useRef(false);

  // 채팅 메시지 수신 처리
  const handleChatMessage = async (event: SSEEvent) => {
    const { sender, text, messageType, imageUrl } = event;
    
    // Prevent duplicate reloads if already reloading
    if (reloadingChatRef.current) {
      console.log('Chat history reload already in progress, skipping duplicate SSE event');
      return;
    }

    // SSE 이벤트는 간단한 형태로만 전달되므로, 전체 메시지를 다시 로드하는 것이 더 안전함
    // 또는 백엔드에서 전체 메시지 객체를 전달하도록 수정 필요
    // 현재는 채팅 히스토리를 다시 로드하여 최신 메시지 포함
    reloadingChatRef.current = true;
    try {
      const response = await apiClient.getChatHistory(sessionId!);
      if (response.success && response.data) {
        const backendMessages = response.data;
        const convertedMessages = backendMessages.map(convertBackendMessage);
        setMessages(convertedMessages);
        
        // 자동 스크롤
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to reload chat history after SSE message:', error);
    } finally {
      // Reset flag after a short delay to allow for rapid successive messages
      setTimeout(() => {
        reloadingChatRef.current = false;
      }, 500);
    }
  };

  // 세션의 주문 목록 새로고침
  const refreshSessionOrders = async () => {
    if (!sessionId) return;

    try {
      const response = await apiClient.getBill(sessionId);
      console.log('Bill API Response:', response); // 디버깅용
      
      if (response.success && response.data) {
        const { session } = response.data;
        
        // session이 존재하는지 확인
        if (!session) {
          console.warn('Session not found in bill response');
          setSessionOrders([]);
          setConfirmedOrders([]);
          return;
        }
        
        // 세션의 orders를 CartItem 형식으로 변환
        const orders: CartItem[] = [];
        
        // session.orders가 존재하고 배열인지 확인
        if (session.orders && Array.isArray(session.orders)) {
          session.orders.forEach(order => {
            // order.items가 존재하고 배열인지 확인
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                // 백엔드에서 menuItem을 포함하여 반환하므로 직접 사용
                const backendMenuItem = item.menuItem;
                
                if (!backendMenuItem) {
                  console.warn('MenuItem not found in order item:', item);
                  return;
                }
                
                // 옵션 변환 (안전하게 처리)
                const selectedOptions: MenuOption[] = (item.options && Array.isArray(item.options))
                  ? item.options
                      .filter(opt => opt && opt.option) // null/undefined 필터링
                      .map(opt => ({
                        id: opt.option.id || '',
                        labelKO: opt.option.nameKo || '',
                        labelVN: opt.option.nameVn || '',
                        labelEN: opt.option.nameEn,
                        priceVND: opt.option.priceVnd || 0,
                      }))
                      .filter(opt => opt.id) // 유효한 옵션만 필터링
                  : [];

                // optionGroups를 안전하게 처리
                const options = (backendMenuItem.optionGroups && Array.isArray(backendMenuItem.optionGroups))
                  ? backendMenuItem.optionGroups.flatMap(group => 
                      (group && group.options && Array.isArray(group.options)
                        ? group.options.map(opt => ({
                            id: opt.id,
                            labelKO: opt.nameKo,
                            labelVN: opt.nameVn,
                            labelEN: opt.nameEn,
                            priceVND: opt.priceVnd,
                          }))
                        : [])
                    )
                  : [];

                // 프론트엔드 MenuItem 형식으로 변환
                const frontendMenuItem: FrontendMenuItem = {
                  id: backendMenuItem.id,
                  nameKO: backendMenuItem.nameKo,
                  nameVN: backendMenuItem.nameVn,
                  nameEN: backendMenuItem.nameEn,
                  priceVND: backendMenuItem.priceVnd,
                  category: 'food', // 기본값, 실제로는 categoryId로 확인 필요
                  imageQuery: backendMenuItem.imageUrl || '',
                  descriptionKO: backendMenuItem.descriptionKo,
                  descriptionVN: backendMenuItem.descriptionVn,
                  descriptionEN: backendMenuItem.descriptionEn,
                  options: options.length > 0 ? options : undefined,
                };

                orders.push({
                  ...frontendMenuItem,
                  quantity: item.quantity || 1,
                  selectedOptions,
                  notes: Array.isArray(item.notes) ? item.notes : [],
                });
              });
            } else {
              console.warn('Order items not found or not an array:', order);
            }
          });
        } else {
          console.warn('Session orders not found or not an array:', session);
        }
        
        console.log('Parsed orders:', orders); // 디버깅용
        setSessionOrders(orders);
        setConfirmedOrders(orders);
      } else {
        console.warn('Bill API response not successful:', response);
        setSessionOrders([]);
        setConfirmedOrders([]);
      }
    } catch (error) {
      console.error('Failed to load session orders:', error);
      setSessionOrders([]);
      setConfirmedOrders([]);
    }
  };

  // 세션 상태 변경 감지 및 자동 초기화
  useEffect(() => {
    if (!session || sessionLoading) return;

    // 세션 상태가 ENDED이면 데이터 초기화
    if (session.status === 'ENDED') {
      console.log('Session ended detected, resetting data');
      resetAllData();
    }
  }, [session?.status, sessionLoading]);

  // 채팅 히스토리 로드
  useEffect(() => {
    if (!sessionId || sessionLoading || showIntro) return;

    const loadChatHistory = async () => {
      setIsLoadingChat(true);
      try {
        const response = await apiClient.getChatHistory(sessionId);
        if (response.success && response.data) {
          const backendMessages = response.data;
          const convertedMessages = backendMessages.map(convertBackendMessage);
          
          // 메시지가 없으면 환영 메시지 추가
          if (convertedMessages.length === 0) {
            convertedMessages.push({
              id: 'init-1',
              sender: 'system',
              textKO: '안녕하세요! 무엇을 도와드릴까요?',
              textVN: 'Xin chào! Tôi có thể giúp gì cho bạn?',
              textEN: 'Hello! How can I help you?',
              timestamp: new Date(),
              type: 'text'
            });
          }
          
          setMessages(convertedMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChatHistory();
  }, [sessionId, sessionLoading, showIntro]);

  // 세션의 주문 목록 로드
  useEffect(() => {
    if (!sessionId || sessionLoading) return;
    refreshSessionOrders();
  }, [sessionId, sessionLoading]);

  // SSE 연결 설정
  useEffect(() => {
    if (!sessionId || sessionLoading || showIntro) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // SSE 클라이언트 생성 및 연결
    const sseUrl = `${API_URL}/api/sse/session/${sessionId}`;
    const sseClient = new SSEClient({
      onMessage: (event: SSEEvent) => {
        handleSSEEvent(event);
      },
      onError: (error) => {
        console.error('SSE connection error:', error);
      },
      onConnect: () => {
        console.log('SSE connected for session:', sessionId);
      },
      onDisconnect: () => {
        console.log('SSE disconnected for session:', sessionId);
      },
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
    });

    sseClient.connect(sseUrl);
    sseClientRef.current = sseClient;

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
        sseClientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionLoading, showIntro]);

  // Initial Welcome Message & Coach Mark Check
  useEffect(() => {
    if (!showIntro && !isLoadingChat) {
      // Check for coach mark
      const hasSeen = localStorage.getItem('hasSeenCoachMark');
      if (!hasSeen) {
        // Small delay to ensure UI is ready
        setTimeout(() => setShowCoachMark(true), 500);
      }
    }
  }, [showIntro, isLoadingChat]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showIntro]);

  const dismissCoachMark = () => {
    setShowCoachMark(false);
    localStorage.setItem('hasSeenCoachMark', 'true');
  };

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleQuickAction = async (chip: QuickChip) => {
    if (!sessionId || chip.action !== 'message' || !chip.messageKO || !chip.messageVN) return;

    try {
      const response = await apiClient.sendMessage({
        sessionId,
        senderType: 'USER',
        textKo: chip.messageKO,
        textVn: chip.messageVN,
        textEn: chip.messageEN,
        messageType: 'REQUEST',
      });

      if (response.success) {
        // Don't add message to local state here - wait for SSE event to reload chat history
        // This prevents duplicate messages (one from local state, one from SSE reload)
        // SSE event will trigger handleChatMessage which will reload the full chat history
      }
    } catch (error) {
      console.error('Failed to send quick action message:', error);
      toast.error('메시지 전송에 실패했습니다.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if (!sessionId || (!inputText.trim() && !previewImage)) return;

    const messageText = inputText || (previewImage 
      ? (userLang === 'ko' ? '사진을 보냈습니다.' : userLang === 'vn' ? 'Đã gửi ảnh' : 'Photo sent')
      : '');

    try {
      const response = await apiClient.sendMessage({
        sessionId,
        senderType: 'USER',
        textKo: userLang === 'ko' ? messageText : '',
        textVn: userLang === 'vn' ? messageText : '',
        textEn: userLang === 'en' ? messageText : undefined,
        messageType: previewImage ? 'IMAGE' : 'TEXT',
        imageUrl: previewImage || undefined,
      });

      if (response.success) {
        // Don't add message to local state here - wait for SSE event to reload chat history
        // This prevents duplicate messages (one from local state, one from SSE reload)
        setInputText('');
        setPreviewImage(null);
        // SSE event will trigger handleChatMessage which will reload the full chat history
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('메시지 전송에 실패했습니다.');
    }
  };

  const handlePlaceOrder = async (items: CartItem[]) => {
    if (!sessionId || !tableId || !restaurantId) {
      toast.error('세션 정보가 없습니다.');
      return;
    }

    try {
      // CartItem을 백엔드 OrderItem 형식으로 변환
      const orderItems = items.map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        options: item.selectedOptions?.map(opt => ({
          optionId: opt.id,
          quantity: 1,
        })),
        notes: item.notes,
      }));

      const response = await apiClient.createOrder({
        sessionId,
        tableId,
        restaurantId,
        items: orderItems,
      });

      if (response.success && response.data) {
        setConfirmedOrders(prev => [...prev, ...items]);
        setCart([]);
        
        // 세션의 주문 목록 새로고침
        await refreshSessionOrders();
        
        const orderTextKO = items.map(i => `${i.nameKO} x${i.quantity}`).join(', ');
        const orderTextVN = items.map(i => `${i.nameVN} x${i.quantity}`).join(', ');
        const orderTextEN = items.map(i => `${i.nameEN || i.nameKO} x${i.quantity}`).join(', ');
        
        // 주문 메시지 전송
        await apiClient.sendMessage({
          sessionId,
          senderType: 'USER',
          textKo: `주문합니다: ${orderTextKO}`,
          textVn: `Đặt món: ${orderTextVN}`,
          textEn: `Order: ${orderTextEN}`,
          messageType: 'ORDER',
          metadata: items,
        });

        // 채팅 히스토리 새로고침
        const chatResponse = await apiClient.getChatHistory(sessionId);
        if (chatResponse.success && chatResponse.data) {
          const backendMessages = chatResponse.data;
          const convertedMessages = backendMessages.map(convertBackendMessage);
          setMessages(convertedMessages);
        }

        toast.success(userLang === 'ko' ? '주문이 전달되었습니다.' : userLang === 'vn' ? 'Đơn hàng đã được gửi.' : 'Order sent.');
      } else {
        throw new Error(response.error?.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error(userLang === 'ko' ? '주문에 실패했습니다.' : userLang === 'vn' ? 'Đặt hàng thất bại.' : 'Failed to place order.');
    }
  };

  const handlePaymentRequest = async (method: string) => {
    if (!sessionId) return;

    try {
      const methodTextKO = method === '현금' ? '현금' : '신용카드';
      const methodTextVN = method === '현금' ? 'tiền mặt' : 'thẻ tín dụng';
      const methodTextEN = method === '현금' ? 'cash' : 'card';

      await apiClient.sendMessage({
        sessionId,
        senderType: 'USER',
        textKo: `${methodTextKO}로 계산하겠습니다.`,
        textVn: `Tôi muốn thanh toán bằng ${methodTextVN}.`,
        textEn: `I'd like to pay with ${methodTextEN}.`,
        messageType: 'REQUEST',
      });

      // 채팅 히스토리 새로고침
      const chatResponse = await apiClient.getChatHistory(sessionId);
      if (chatResponse.success && chatResponse.data) {
        const backendMessages = chatResponse.data;
        const convertedMessages = backendMessages.map(convertBackendMessage);
        setMessages(convertedMessages);
      }

      setIsBillOpen(false);
    } catch (error) {
      console.error('Failed to send payment request:', error);
    }
  };

  const handleTransferComplete = async () => {
    if (!sessionId) return;

    try {
      // Determine payment method based on language
      const paymentMethod = userLang === 'ko' ? '계좌이체' : userLang === 'vn' ? 'Chuyển khoản' : 'Bank Transfer';

      // Send chat message (existing behavior)
      await apiClient.sendMessage({
        sessionId,
        senderType: 'USER',
        textKo: '계좌이체 완료했습니다.',
        textVn: 'Tôi đã chuyển khoản xong.',
        textEn: 'Transfer complete.',
        messageType: 'REQUEST',
      });

      // Complete payment via API
      const paymentResponse = await apiClient.completePayment(sessionId, paymentMethod);
      if (!paymentResponse.success) {
        console.error('Failed to complete payment:', paymentResponse.error);
        toast.error(userLang === 'ko' ? '결제 완료 처리에 실패했습니다.' : userLang === 'vn' ? 'Xử lý thanh toán thất bại.' : 'Failed to complete payment.');
      }

      // 채팅 히스토리 새로고침
      const chatResponse = await apiClient.getChatHistory(sessionId);
      if (chatResponse.success && chatResponse.data) {
        const backendMessages = chatResponse.data;
        const convertedMessages = backendMessages.map(convertBackendMessage);
        setMessages(convertedMessages);
      }

      setIsBillOpen(false);
    } catch (error) {
      console.error('Failed to send transfer complete:', error);
      toast.error(userLang === 'ko' ? '결제 완료 처리에 실패했습니다.' : userLang === 'vn' ? 'Xử lý thanh toán thất bại.' : 'Failed to complete payment.');
    }
  };

  // 로딩 및 에러 상태 처리
  if (sessionLoading) {
    return <LoadingScreen />;
  }

  if (sessionError) {
    return (
      <ErrorPage
        title={userLang === 'ko' ? '세션을 불러올 수 없습니다' : userLang === 'vn' ? 'Không thể tải phiên' : 'Failed to load session'}
        message={sessionError}
        onRetry={refreshSession}
      />
    );
  }

  if (!sessionId) {
    return (
      <ErrorPage
        title={userLang === 'ko' ? '세션이 없습니다' : userLang === 'vn' ? 'Không có phiên' : 'No session'}
        message={userLang === 'ko' ? '세션을 생성할 수 없습니다.' : userLang === 'vn' ? 'Không thể tạo phiên.' : 'Cannot create session.'}
      />
    );
  }

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100]"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
          >
            <LanguageSelector 
              onComplete={() => setShowIntro(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col h-[100dvh] w-full bg-slate-50 fixed inset-0 overflow-hidden font-sans">
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* Coach Mark Overlay */}
      {showCoachMark && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-end pb-[90px] animate-in fade-in duration-500"
          onClick={dismissCoachMark}
        >
          <div className="bg-white px-5 py-3 rounded-2xl relative shadow-xl mb-4 text-center max-w-[250px] animate-bounce cursor-pointer">
            <p className="font-bold text-slate-900 text-sm">여기서 주문을 시작하세요!</p>
            <p className="text-xs text-gray-500 mt-0.5">터치하면 메뉴가 열립니다</p>
            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 transform border-r border-b border-gray-100"></div>
          </div>
        </div>
      )}

      {/* Header - Fixed Height, No Sticky needed in Flex Col */}
      <header className="flex-none flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 z-20 shadow-sm h-14">
        <h1 className="font-bold text-xl tracking-tight text-slate-900">
          BLYNK
        </h1>
        
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2.5 rounded-full text-gray-600 hover:bg-gray-100 font-bold text-xs gap-1.5 border border-gray-100">
                <Globe size={14} />
                {userLang.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[120px]">
              <DropdownMenuItem onClick={() => setUserLang('ko')} className="font-medium text-xs">
                한국어 (KO)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserLang('en')} className="font-medium text-xs">
                English (EN)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserLang('vn')} className="font-medium text-xs">
                Tiếng Việt (VN)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cart Button with Badge */}
          <button 
             onClick={() => {
               setActiveTab('cart');
               setMenuStartCart(true);
               setIsMenuOpen(true);
             }}
             className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors"
          >
             <ShoppingBag size={24} />
             {cartItemCount > 0 && (
               <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white animate-in zoom-in duration-200">
                 {cartItemCount}
               </span>
             )}
          </button>
        </div>
      </header>

      {/* Chat Area - Scrollable */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 pb-40 overscroll-contain" 
      >
        <div className="text-center py-4">
           <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
             {new Date().toLocaleDateString(
               userLang === 'ko' ? 'ko-KR' : userLang === 'vn' ? 'vi-VN' : 'en-US'
             )}
           </span>
        </div>
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Floating Input Area (Above Tabs) */}
      <div className="absolute bottom-[60px] left-0 right-0 z-30 bg-gradient-to-t from-white via-white to-white/0 pt-4 pb-2">
         {/* Quick Chips Row */}
         <div className="mb-2">
            <QuickActions chips={quickChips} onChipClick={handleQuickAction} />
         </div>

         {/* Input Row */}
         <div className="px-4 pb-2">
            {previewImage && (
              <div className="relative inline-block mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-1 shadow-sm hover:bg-gray-700"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            
            <div className="flex gap-2 items-end bg-white p-2 rounded-3xl border border-gray-200 shadow-lg shadow-gray-200/50">
               <Button 
                 onClick={() => fileInputRef.current?.click()}
                 variant="ghost"
                 size="icon"
                 className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full h-10 w-10 shrink-0 transition-colors"
               >
                 <Camera size={20} />
               </Button>
               <Input 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 placeholder={getTranslation('input.placeholder', userLang)}
                 className="flex-1 border-none focus-visible:ring-0 bg-transparent h-10 px-0 text-base placeholder:text-gray-400"
               />
               <Button 
                 onClick={handleSendMessage}
                 size="icon"
                 className={`rounded-full h-10 w-10 shrink-0 transition-all ${
                   inputText.trim() || previewImage 
                     ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                     : 'bg-gray-100 text-gray-400'
                 }`}
                 disabled={!inputText.trim() && !previewImage}
               >
                 <Send size={18} className={inputText.trim() || previewImage ? 'ml-0.5' : ''} />
               </Button>
            </div>
         </div>
      </div>

      {/* Bottom Tab Bar (Fixed) */}
      <div className={`h-[60px] bg-white border-t border-gray-100 flex justify-around items-center pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.02)] transition-all flex-none z-40 relative`}>
         <button 
           onClick={() => {
             setActiveTab('event');
             setIsEventOpen(true);
             if (showCoachMark) dismissCoachMark();
           }}
           className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'event' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'} ${showCoachMark ? 'opacity-30' : ''}`}
         >
           <PartyPopper size={22} strokeWidth={activeTab === 'event' ? 2.5 : 2} />
           <span className="text-[10px] font-medium">{getTranslation('tabs.event', userLang)}</span>
         </button>
         
         <button 
           onClick={() => {
             setActiveTab('menu');
             setMenuStartCart(false);
             setIsMenuOpen(true);
             if (showCoachMark) dismissCoachMark();
           }}
           className="group relative flex flex-col items-center justify-end w-full h-full pb-1"
         >
           <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/10 transition-all duration-300 ${
             activeTab === 'menu' 
             ? 'bg-slate-900 text-white scale-110 ring-4 ring-white' 
             : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 ring-4 ring-white'
           }`}>
             <UtensilsCrossed size={24} strokeWidth={2.5} />
           </div>
           <span className={`text-[10px] font-bold mt-8 transition-colors ${activeTab === 'menu' ? 'text-slate-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
             {getTranslation('tabs.menu', userLang)}
           </span>
         </button>

         <button 
           onClick={() => {
             setActiveTab('bill');
             setIsBillOpen(true);
             if (showCoachMark) dismissCoachMark();
           }}
           className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'bill' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'} ${showCoachMark ? 'opacity-30' : ''}`}
         >
           <Receipt size={22} strokeWidth={activeTab === 'bill' ? 2.5 : 2} />
           <span className="text-[10px] font-medium">{getTranslation('tabs.bill', userLang)}</span>
         </button>
      </div>

      {/* Modals */}
      <MenuModal 
        isOpen={isMenuOpen} 
        onClose={() => {
          setIsMenuOpen(false);
          setActiveTab('chat'); // Return to chat tab when closed
        }}
        onPlaceOrder={handlePlaceOrder}
        defaultShowCart={menuStartCart}
        cart={cart}
        setCart={setCart}
        lang={userLang}
        menuItems={menuItems}
        menuCategories={menuCategories}
        isLoadingMenu={isLoadingMenu}
      />
      <BillModal
        isOpen={isBillOpen}
        onClose={() => {
          setIsBillOpen(false);
          setActiveTab('chat'); // Return to chat tab when closed
        }}
        orders={sessionOrders.length > 0 ? sessionOrders : confirmedOrders}
        onPaymentRequest={handlePaymentRequest}
        onTransferComplete={handleTransferComplete}
      />
      <EventModal
        isOpen={isEventOpen}
        onClose={() => {
          setIsEventOpen(false);
          setActiveTab('chat');
        }}
        lang={userLang}
        menuItems={menuItems}
      />
      </div>
    </>
  );
};