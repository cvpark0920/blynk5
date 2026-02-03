import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, QuickChip, CartItem, MenuItem as FrontendMenuItem, MenuOption } from '../types';
import ChatBubble from './chat/ChatBubble';
import { QuickActions } from './chat/QuickActions';
import { MenuModal } from './menu/MenuModal';
import { BillModal } from './order/BillModal';
import { EventModal } from './event/EventModal';
import { PromotionPopup } from './promotion/PromotionPopup';
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
import { apiClient, Menu, MenuItem as BackendMenuItem, ChatMessage as BackendChatMessage, Restaurant, Promotion } from '../../lib/api';
import { SSEClient, SSEEvent } from '../../lib/sseClient';
import { toast } from 'sonner';
import { getTranslation } from '../i18n/translations';

type LangType = 'ko' | 'vn' | 'en' | 'zh' | 'ru';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const normalized = envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const hostWithoutPort = window.location.host.split(':')[0];
      const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
      const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
      const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
      if (!isLocalhost && !isLocalSubdomain && isEnvLocalhost) {
        return '';
      }
    }
    return normalized;
  }

  if (typeof window !== 'undefined') {
    const hostWithoutPort = window.location.host.split(':')[0];
    const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
    const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');

    if (!isLocalhost || isLocalSubdomain) {
      return '';
    }
  }

  return 'http://localhost:3000';
};

// 백엔드 ChatMessage를 프론트엔드 ChatMessage로 변환
const convertBackendMessage = (msg: BackendChatMessage): ChatMessage => {
  return {
    id: msg.id,
    sender: msg.senderType === 'USER' ? 'user' : msg.senderType === 'STAFF' ? 'staff' : 'system',
    textKO: msg.textKo || '',
    textVN: msg.textVn || '',
    textEN: msg.textEn,
    textZH: msg.textZH,
    textRU: msg.textRU,
    detectedLanguage: msg.detectedLanguage ?? null,
    timestamp: new Date(msg.createdAt),
    type: msg.messageType === 'TEXT' ? 'text' : msg.messageType === 'IMAGE' ? 'image' : msg.messageType === 'ORDER' ? 'order' : 'request',
    metadata: msg.metadata,
    imageUrl: msg.imageUrl,
  };
};

// 백엔드 MenuItem을 프론트엔드 MenuItem으로 변환
const convertBackendMenuItem = (item: BackendMenuItem, category: string, categoryId: string): FrontendMenuItem => {
  // optionGroups를 평탄화하여 options 배열로 변환
  const options = (item.optionGroups && Array.isArray(item.optionGroups) 
    ? item.optionGroups.flatMap(group => 
        (group.options && Array.isArray(group.options)
          ? group.options.map(opt => ({
              id: opt.id,
              labelKO: opt.nameKo,
              labelVN: opt.nameVn,
              labelEN: opt.nameEn,
              labelZH: (opt as any).nameZh,
              labelRU: (opt as any).nameRu,
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
    nameZH: (item as any).nameZh,
    nameRU: (item as any).nameRu,
    priceVND: item.priceVnd,
    category: category as 'food' | 'drink' | 'dessert', // 하위 호환성을 위해 유지
    categoryId: categoryId, // 실제 카테고리 ID 추가
    imageQuery: item.imageUrl || '',
    descriptionKO: item.descriptionKo,
    descriptionVN: item.descriptionVn,
    descriptionRU: (item as any).descriptionRu,
    descriptionEN: item.descriptionEn,
    descriptionZH: (item as any).descriptionZh,
    options: options.length > 0 ? options : undefined,
  };
};

export const BlynkApp: React.FC = () => {
  const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV || localStorage.getItem('customer_debug') === '1') {
      console.log('[BlynkApp]', ...args);
    }
  };
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
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showPromotionPopup, setShowPromotionPopup] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState<Promotion | null>(null);
  
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
  const hasAutoOpenedMenuRef = useRef(false);

  // Calculate cart item count for badge
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // 식당 정보 로드
  useEffect(() => {
    if (!restaurantId || sessionLoading) {
      setRestaurant(null);
      return;
    }

    const loadRestaurant = async () => {
      try {
        debugLog('Loading restaurant for ID:', restaurantId); // 디버깅용
        const response = await apiClient.getRestaurant(restaurantId);
        debugLog('Restaurant API Response:', response); // 디버깅용
        if (response.success && response.data) {
          debugLog('Restaurant data loaded:', response.data); // 디버깅용
          setRestaurant(response.data);
        } else {
          console.error('Failed to load restaurant - API error:', response.error);
          setRestaurant(null);
        }
      } catch (error) {
        console.error('Failed to load restaurant - Exception:', error);
        setRestaurant(null);
      }
    };

    loadRestaurant();
  }, [restaurantId, sessionLoading]);

  // 프로모션 로드
  useEffect(() => {
    if (!restaurantId || sessionLoading) return;

    const loadPromotions = async () => {
      try {
        console.log('[BlynkApp] 프로모션 로드 시작:', { restaurantId });
        debugLog('[BlynkApp] 프로모션 로드 시작:', { restaurantId });
        const response = await apiClient.getPromotions(restaurantId);
        console.log('[BlynkApp] 프로모션 API 응답:', response);
        debugLog('[BlynkApp] 프로모션 API 응답:', response);
        
        if (response.success && response.data) {
          // 원본 데이터 전체 구조 확인
          console.log('[BlynkApp] 원본 프로모션 데이터 (전체):', JSON.stringify(response.data, null, 2));
          
          console.log('[BlynkApp] 원본 프로모션 데이터 (요약):', {
            count: response.data.length,
            promotions: response.data.map(p => ({
              id: p.id,
              titleKo: p.titleKo,
              hasPromotionMenuItems: !!p.promotionMenuItems,
              promotionMenuItemsLength: p.promotionMenuItems?.length || 0,
              promotionMenuItems: p.promotionMenuItems?.map(pmi => ({
                id: pmi.id,
                menuItemId: pmi.menuItemId,
                hasMenuItem: !!pmi.menuItem,
                menuItemName: pmi.menuItem?.nameKo,
                menuItemImageUrl: pmi.menuItem?.imageUrl,
              })) || [],
              hasMenuItems: !!p.menuItems,
              menuItemsLength: p.menuItems?.length || 0,
              menuItems: p.menuItems?.map(mi => ({
                id: mi.id,
                nameKo: mi.nameKo,
                imageUrl: mi.imageUrl,
              })) || [],
            })),
          });
          
          // Map promotionMenuItems to menuItems for convenience
          const mappedPromotions = response.data.map(promo => ({
            ...promo,
            menuItems: promo.promotionMenuItems?.map(pmi => pmi.menuItem).filter(Boolean) || promo.menuItems || [],
          }));
          
          console.log('[BlynkApp] 매핑된 프로모션:', {
            count: mappedPromotions.length,
            promotions: mappedPromotions.map(p => ({
              id: p.id,
              titleKo: p.titleKo,
              isActive: p.isActive,
              showOnLoad: p.showOnLoad,
              startDate: p.startDate,
              endDate: p.endDate,
              menuItemsCount: p.menuItems?.length || 0,
              menuItems: p.menuItems?.map(mi => ({
                id: mi.id,
                nameKo: mi.nameKo,
                imageUrl: mi.imageUrl,
              })) || [],
            })),
          });
          debugLog('[BlynkApp] 매핑된 프로모션:', {
            count: mappedPromotions.length,
            promotions: mappedPromotions.map(p => ({
              id: p.id,
              titleKo: p.titleKo,
              isActive: p.isActive,
              showOnLoad: p.showOnLoad,
              startDate: p.startDate,
              endDate: p.endDate,
              menuItemsCount: p.menuItems?.length || 0,
            })),
          });
          
          setPromotions(mappedPromotions);
          
          // 로딩 시 팝업으로 표시할 프로모션 확인
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayStr = today.toISOString().split('T')[0];
          
          const popupPromotions = mappedPromotions.filter(promo => {
            if (!promo.showOnLoad) {
              console.log('[BlynkApp] 프로모션 제외 (showOnLoad=false):', promo.id, promo.titleKo);
              return false;
            }
            if (!promo.isActive) {
              console.log('[BlynkApp] 프로모션 제외 (isActive=false):', promo.id, promo.titleKo);
              return false;
            }
            
            const startDate = new Date(promo.startDate);
            const endDate = new Date(promo.endDate);
            endDate.setHours(23, 59, 59, 999); // 종료일 끝까지 포함
            
            if (now < startDate) {
              console.log('[BlynkApp] 프로모션 제외 (시작일 전):', {
                id: promo.id,
                titleKo: promo.titleKo,
                now: now.toISOString(),
                startDate: startDate.toISOString(),
              });
              return false;
            }
            if (now > endDate) {
              console.log('[BlynkApp] 프로모션 제외 (종료일 후):', {
                id: promo.id,
                titleKo: promo.titleKo,
                now: now.toISOString(),
                endDate: endDate.toISOString(),
              });
              return false;
            }
            
            // 오늘 하루 안보이기 체크
            const hiddenKey = `promotion_hidden_${promo.id}_${todayStr}`;
            const isHidden = localStorage.getItem(hiddenKey);
            if (isHidden) {
              console.log('[BlynkApp] 프로모션 제외 (오늘 하루 안보기):', promo.id, promo.titleKo);
              return false;
            }
            
            console.log('[BlynkApp] 프로모션 팝업 표시 대상:', promo.id, promo.titleKo);
            return true;
          });
          
          console.log('[BlynkApp] 팝업 표시 대상 프로모션:', {
            count: popupPromotions.length,
            promotions: popupPromotions.map(p => ({ id: p.id, titleKo: p.titleKo, displayOrder: p.displayOrder })),
          });
          
          // displayOrder 순서대로 정렬하고 첫 번째 프로모션 표시
          if (popupPromotions.length > 0) {
            const sortedPromotions = popupPromotions.sort((a, b) => a.displayOrder - b.displayOrder);
            console.log('[BlynkApp] 프로모션 팝업 표시:', sortedPromotions[0].id, sortedPromotions[0].titleKo);
            setCurrentPromotion(sortedPromotions[0]);
            setShowPromotionPopup(true);
          } else {
            console.log('[BlynkApp] 표시할 프로모션 없음 - 모든 프로모션:', mappedPromotions.map(p => ({
              id: p.id,
              titleKo: p.titleKo,
              isActive: p.isActive,
              showOnLoad: p.showOnLoad,
              startDate: p.startDate,
              endDate: p.endDate,
            })));
          }
        } else {
          console.error('[BlynkApp] 프로모션 로드 실패:', response.error);
        }
      } catch (error) {
        console.error('[BlynkApp] 프로모션 로드 중 오류:', error);
        debugLog('[BlynkApp] 프로모션 로드 중 오류:', error);
      }
    };

    loadPromotions();
  }, [restaurantId, sessionLoading]);

  // 메뉴 로드
  useEffect(() => {
    if (!restaurantId || sessionLoading) return;

    const loadMenu = async () => {
      setIsLoadingMenu(true);
      try {
        const response = await apiClient.getMenu(restaurantId);
        debugLog('Menu API Response:', response); // 디버깅용
        if (response.success && response.data) {
          // 백엔드가 categories 배열을 직접 반환하는지 확인
          // response.data가 배열인 경우와 객체인 경우 모두 처리
          const categories = Array.isArray(response.data) 
            ? response.data 
            : (response.data as Menu).categories || [];
          
          debugLog('Categories:', categories); // 디버깅용
          debugLog('Categories length:', categories.length); // 디버깅용
          
          // 카테고리별로 메뉴 아이템 변환 및 평탄화
          const allItems: FrontendMenuItem[] = [];
          
          // categories가 존재하고 배열인지 확인
          if (categories && Array.isArray(categories) && categories.length > 0) {
            categories.forEach((category, index) => {
              debugLog(`Category ${index}:`, category); // 디버깅용
              debugLog(`Category ${index} menuItems:`, category.menuItems); // 디버깅용
              const categoryName = category.nameKo.toLowerCase().includes('음식') || category.nameKo.toLowerCase().includes('food') 
                ? 'food' 
                : category.nameKo.toLowerCase().includes('음료') || category.nameKo.toLowerCase().includes('drink')
                ? 'drink'
                : 'dessert';
              
              // menuItems가 존재하고 배열인지 확인
              if (category.menuItems && Array.isArray(category.menuItems)) {
                category.menuItems.forEach(item => {
                  if (!item.isSoldOut) {
                    allItems.push(convertBackendMenuItem(item, categoryName, category.id));
                  }
                });
              }
            });
          }
          
          debugLog('All menu items:', allItems); // 디버깅용
          debugLog('Menu items count:', allItems.length); // 디버깅용
          
          // API에서 받은 카테고리 데이터 저장
          setMenuCategories(categories);
          setMenuItems(allItems);

          // Load quick chips from API
          try {
            console.log('🔄 [QuickChips] Loading quick chips for restaurant:', restaurantId);
            const quickChipsResponse = await apiClient.getQuickChips(restaurantId, 'CUSTOMER_REQUEST');
            console.log('🔄 [QuickChips] API response:', quickChipsResponse);
            // 디버깅: API 응답의 첫 번째 칩 확인
            if (quickChipsResponse.success && quickChipsResponse.data && quickChipsResponse.data.length > 0) {
              console.log('🔍 [QuickChips] First chip from API:', {
                id: quickChipsResponse.data[0].id,
                labelKo: quickChipsResponse.data[0].labelKo,
                labelZh: (quickChipsResponse.data[0] as any).labelZh,
                labelEn: quickChipsResponse.data[0].labelEn,
                allKeys: Object.keys(quickChipsResponse.data[0]),
              });
            }
            
            if (quickChipsResponse.success && quickChipsResponse.data) {
              // Convert backend format to frontend format
              const convertedChips: QuickChip[] = quickChipsResponse.data.map((chip: { labelZh?: string; messageZh?: string; labelRu?: string; messageRu?: string; [k: string]: unknown }, index: number) => {
                // labelZh/messageZh/labelRu/messageRu 추출 (camelCase와 snake_case 모두 지원)
                const rawLabelZh = chip.labelZh ?? (chip as { label_zh?: string }).label_zh;
                const rawMessageZh = chip.messageZh ?? (chip as { message_zh?: string }).message_zh;
                const rawLabelRu = chip.labelRu ?? (chip as { label_ru?: string }).label_ru;
                const rawMessageRu = chip.messageRu ?? (chip as { message_ru?: string }).message_ru;
                
                // 디버깅: 첫 번째 칩의 데이터 확인
                if (index === 0) {
                  console.log('🔍 [QuickChips] Raw API chip (index 0):', {
                    id: chip.id,
                    labelKo: chip.labelKo,
                    labelZh: chip.labelZh,
                    label_zh: (chip as { label_zh?: string }).label_zh,
                    rawLabelZh: rawLabelZh,
                    labelEn: chip.labelEn,
                    hasLabelZh: 'labelZh' in chip,
                    allKeys: Object.keys(chip),
                  });
                }
                
                // labelZh/messageZh/labelRu/messageRu가 유효한 문자열이면 사용, 아니면 undefined
                const labelZH = rawLabelZh && typeof rawLabelZh === 'string' && rawLabelZh.trim() ? rawLabelZh.trim() : undefined;
                const messageZH = rawMessageZh && typeof rawMessageZh === 'string' && rawMessageZh.trim() ? rawMessageZh.trim() : undefined;
                const labelRU = rawLabelRu && typeof rawLabelRu === 'string' && rawLabelRu.trim() ? rawLabelRu.trim() : undefined;
                const messageRU = rawMessageRu && typeof rawMessageRu === 'string' && rawMessageRu.trim() ? rawMessageRu.trim() : undefined;
                
                const converted = {
                  id: chip.id,
                  templateKey: chip.templateKey || undefined,
                  icon: chip.icon,
                  labelKO: chip.labelKo,
                  labelVN: chip.labelVn,
                  labelEN: chip.labelEn,
                  labelZH: labelZH,
                  labelRU: labelRU,
                  action: 'message' as const,
                  messageKO: chip.messageKo,
                  messageVN: chip.messageVn,
                  messageEN: chip.messageEn,
                  messageZH: messageZH,
                  messageRU: messageRU,
                };
                
                // 디버깅: 첫 번째 칩의 변환 결과 확인
                if (index === 0) {
                  console.log('🔍 [QuickChips] Converted chip (index 0):', {
                    labelKO: converted.labelKO,
                    labelZH: converted.labelZH,
                    labelEN: converted.labelEN,
                    rawLabelZh: rawLabelZh,
                    labelZHResult: labelZH,
                  });
                }
                
                return converted;
              });
              console.log('✅ [QuickChips] Converted chips:', convertedChips.length, 'chips');
              setQuickChips(convertedChips);
            } else {
              console.error('❌ [QuickChips] Failed to load quick chips:', quickChipsResponse.error);
              // Fallback to empty array if API fails
              setQuickChips([]);
            }
          } catch (error) {
            console.error('❌ [QuickChips] Exception loading quick chips:', error);
            // Fallback to empty array on error
            setQuickChips([]);
          }
        } else if (response.error) {
          // API 응답은 받았지만 에러가 있는 경우
          console.error('Failed to load menu:', response.error);
          toast.error(response.error.message || getTranslation('toast.menuLoadFailed', userLang));
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
            ? getTranslation('toast.networkError', userLang)
            : error.message
          : getTranslation('toast.menuLoadFailed', userLang);
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
    
    debugLog('All data reset completed');
  };

  // 세션 종료 처리 함수
  const handleSessionEnded = async () => {
    debugLog('Session ended event received');
    
    // 모든 데이터 초기화
    resetAllData();
    
    // 새 세션 생성 트리거
    if (refreshSession) {
      await refreshSession();
    }
    
    // 사용자에게 알림 표시
    toast.info(getTranslation('toast.tableReset', userLang));
  };

  // SSE 이벤트 핸들러
  const handleSSEEvent = (event: SSEEvent) => {
    debugLog('SSE Event received:', event);
    
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
        debugLog('SSE connected at:', event.timestamp);
        break;
      
      default:
        debugLog('Unknown SSE event type:', event.type);
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
    // SERVED 상태는 고객에게 알릴 필요 없음
    const statusMessages = {
      PENDING: getTranslation('toast.orderReceived', userLang),
      COOKING: getTranslation('toast.cookingStarted', userLang),
      PAID: getTranslation('toast.paymentCompleted', userLang),
      CANCELLED: getTranslation('toast.orderCancelled', userLang),
    };

    // 채팅 히스토리를 다시 로드하여 DB에 저장된 메시지 표시 (중복 방지)
    // DB에 이미 저장된 메시지가 있으므로 SSE 이벤트로 메시지를 추가하지 않음
    // SERVED 상태 메시지는 필터링하여 표시하지 않음
    if (sessionId && !reloadingChatRef.current) {
      reloadingChatRef.current = true;
      try {
        const response = await apiClient.getChatHistory(sessionId);
        if (response.success && response.data) {
          const convertedMessages = response.data
            .map(convertBackendMessage)
            .filter(msg => {
              // SERVED 상태 메시지 필터링 (서빙 완료 메시지는 고객에게 표시하지 않음)
              if (msg.type === 'text' && msg.metadata?.orderStatus === 'SERVED') {
                return false;
              }
              // "서빙이 완료되었습니다" 텍스트가 포함된 메시지도 필터링
              const text = userLang === 'ko' ? msg.textKO : userLang === 'vn' ? msg.textVN : msg.textEN || msg.textKO;
              if (text && (text.includes('서빙이 완료되었습니다') || text.includes('서빙 완료') || text.includes('Đã phục vụ xong') || text.includes('Order has been served'))) {
                return false;
              }
              return true;
            });
          setMessages(convertedMessages);
        }
      } catch (error) {
        console.error('Failed to reload chat history:', error);
      } finally {
        reloadingChatRef.current = false;
      }
    }

    // 토스트 알림 표시 (SERVED 상태는 제외)
    if (status !== 'SERVED') {
      const message = statusMessages[status as keyof typeof statusMessages];
      if (message) {
        toast.info(message);
      }
    }
  };

  // Prevent duplicate chat history reloads
  const reloadingChatRef = useRef(false);
  // 최근에 전송한 메시지 ID와 시간을 추적하여 중복 리로드 방지
  const recentlySentMessagesRef = useRef<Map<string, number>>(new Map());
  // 메시지 전송 시점을 추적하여 SSE 이벤트 무시 기간 설정
  const lastMessageSendTimeRef = useRef<number>(0);

  // 채팅 메시지 수신 처리
  const handleChatMessage = async (event: SSEEvent) => {
    const { sender, text, messageType, imageUrl } = event;
    
    // 디버깅: SSE 이벤트 정보 로깅
    console.log('[SSE] handleChatMessage called', { 
      sender, 
      senderType: typeof sender,
      text: text?.substring(0, 50), 
      messageType,
      timeSinceLastSend: Date.now() - lastMessageSendTimeRef.current 
    });
    
    // 근본 원인 해결: 자신이 보낸 메시지에 대한 SSE 이벤트는 무시
    // 고객앱은 자신이 보낸 메시지가 아닌 경우에만 리로드해야 함
    const senderNormalized = sender?.toUpperCase();
    if (senderNormalized === 'USER' || senderNormalized === 'CUSTOMER') {
      console.log('[SSE] Skipping own message SSE event', { sender, senderNormalized, text: text?.substring(0, 50) });
      debugLog('SSE event received for own message, skipping reload to prevent flicker', { sender, text });
      return;
    }
    
    // Prevent duplicate reloads if already reloading
    if (reloadingChatRef.current) {
      debugLog('Chat history reload already in progress, skipping duplicate SSE event');
      return;
    }

    // 추가 안전장치: 최근에 메시지를 전송한 경우 (3초 이내) SSE 이벤트 무시
    const now = Date.now();
    const timeSinceLastSend = now - lastMessageSendTimeRef.current;
    if (timeSinceLastSend < 3000) {
      debugLog(`SSE event received ${timeSinceLastSend}ms after message send, skipping reload to prevent flicker`);
      return;
    }

    // 최근에 전송한 메시지 ID가 있는지 확인 (추가 안전장치)
    const recentMessageIds = Array.from(recentlySentMessagesRef.current.entries());
    const hasRecentMessage = recentMessageIds.some(([messageId, timestamp]) => {
      return now - timestamp < 3000; // 3초 이내
    });

    if (hasRecentMessage) {
      debugLog('SSE event received for recently sent message, skipping reload to prevent flicker');
      // 최근 메시지 목록 정리 (3초 이상 지난 메시지 제거)
      recentMessageIds.forEach(([messageId, timestamp]) => {
        if (now - timestamp >= 3000) {
          recentlySentMessagesRef.current.delete(messageId);
        }
      });
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
      debugLog('Bill API Response:', response); // 디버깅용
      
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
                        labelZH: (opt.option as any).nameZh,
                        priceVND: (opt.option.priceVnd !== undefined && opt.option.priceVnd !== null) ? opt.option.priceVnd : 0,
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
                            labelZH: (opt as any).nameZh,
                            priceVND: (opt.priceVnd !== undefined && opt.priceVnd !== null) ? opt.priceVnd : 0,
                          }))
                        : [])
                    )
                  : [];

                // 프론트엔드 MenuItem 형식으로 변환
                // priceVnd 필드가 없거나 null/undefined인 경우를 대비
                const priceVND = (backendMenuItem.priceVnd !== undefined && backendMenuItem.priceVnd !== null) 
                  ? backendMenuItem.priceVnd 
                  : (backendMenuItem.priceVND !== undefined && backendMenuItem.priceVND !== null)
                    ? backendMenuItem.priceVND
                    : 0;
                
                const frontendMenuItem: FrontendMenuItem = {
                  id: backendMenuItem.id,
                  nameKO: backendMenuItem.nameKo,
                  nameVN: backendMenuItem.nameVn,
                  nameEN: backendMenuItem.nameEn,
                  nameZH: (backendMenuItem as any).nameZh,
                  priceVND: priceVND,
                  category: 'food', // 기본값, 실제로는 categoryId로 확인 필요
                  imageQuery: backendMenuItem.imageUrl || '',
                  descriptionKO: backendMenuItem.descriptionKo,
                  descriptionVN: backendMenuItem.descriptionVn,
                  descriptionEN: backendMenuItem.descriptionEn,
                  options: options.length > 0 ? options : undefined,
                };
                
                // 디버깅: priceVND 값 확인
                if (priceVND === 0 && backendMenuItem.priceVnd === undefined && backendMenuItem.priceVND === undefined) {
                  console.warn('MenuItem priceVND is missing or zero:', {
                    id: backendMenuItem.id,
                    name: backendMenuItem.nameKo,
                    priceVnd: backendMenuItem.priceVnd,
                    priceVND: backendMenuItem.priceVND,
                    backendMenuItem,
                  });
                }

                orders.push({
                  ...frontendMenuItem,
                  quantity: item.quantity || 1,
                  selectedOptions: selectedOptions.map(opt => ({
                    ...opt,
                    quantity: item.options?.find((o: any) => o.option?.id === opt.id)?.quantity || 1,
                  })),
                  notes: Array.isArray(item.notes) ? item.notes : [],
                  // 백엔드에서 받은 unitPrice와 totalPrice 사용
                  unitPrice: item.unitPrice || priceVND, // 순수 메뉴 항목 단가
                  totalPrice: item.totalPrice || (priceVND * (item.quantity || 1)), // 총액 (옵션 포함)
                });
              });
            } else {
              console.warn('Order items not found or not an array:', order);
            }
          });
        } else {
          console.warn('Session orders not found or not an array:', session);
        }
        
        debugLog('Parsed orders:', orders); // 디버깅용
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
      debugLog('Session ended detected, resetting data');
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

    const API_URL = getApiBaseUrl();
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
        debugLog('SSE connected for session:', sessionId);
      },
      onDisconnect: () => {
        debugLog('SSE disconnected for session:', sessionId);
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

  // Initial Welcome Message & Coach Mark Check & Auto-open menu for tables without orders
  useEffect(() => {
    if (!showIntro && !isLoadingChat && !sessionLoading) {
      let autoOpenTimer: ReturnType<typeof setTimeout> | null = null;
      let coachMarkTimer: ReturnType<typeof setTimeout> | null = null;

      // Check if table has no orders (no session orders, no confirmed orders, no cart)
      const hasNoOrders = sessionOrders.length === 0 && confirmedOrders.length === 0 && cart.length === 0;
      
      // Only auto-open menu on initial load (first time when there are no orders)
      // Don't auto-open after placing an order
      if (hasNoOrders && !hasAutoOpenedMenuRef.current) {
        // Small delay to ensure UI is ready, then open menu
        autoOpenTimer = setTimeout(() => {
          setIsMenuOpen(true);
          setActiveTab('menu');
          hasAutoOpenedMenuRef.current = true; // Mark as opened
        }, 300);
      }
      
      // Check for coach mark
      const hasSeen = localStorage.getItem('hasSeenCoachMark');
      if (!hasSeen) {
        // Small delay to ensure UI is ready
        coachMarkTimer = setTimeout(() => setShowCoachMark(true), 500);
      }

      return () => {
        if (autoOpenTimer) {
          clearTimeout(autoOpenTimer);
        }
        if (coachMarkTimer) {
          clearTimeout(coachMarkTimer);
        }
      };
    }
  }, [showIntro, isLoadingChat, sessionLoading, sessionOrders, confirmedOrders, cart]);

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
    const hasMessage = chip.messageKO || chip.messageVN || chip.messageEN || chip.messageZH || chip.messageRU;
    if (!sessionId || chip.action !== 'message' || !hasMessage) return;

    // "요청" 접두사 제거 (메시지 시작 부분의 "요청" 제거)
    const removeRequestPrefix = (text: string): string => {
      return text.replace(/^요청\s+/, '').trim();
    };

    // 선택된 언어에 따라 적절한 메시지 선택
    let textKo = '';
    let textVn = '';
    let textEn: string | undefined = undefined;
    let textZh: string | undefined = undefined;
    let textRu: string | undefined = undefined;

    if (userLang === 'ko') {
      // 한국어 선택 시: 한국어 메시지 사용, 없으면 영어, 그것도 없으면 베트남어
      textKo = chip.messageKO ? removeRequestPrefix(chip.messageKO) : 
               (chip.messageEN ? removeRequestPrefix(chip.messageEN) : 
               (chip.messageVN ? removeRequestPrefix(chip.messageVN) : ''));
    } else if (userLang === 'vn') {
      // 베트남어 선택 시: 베트남어 메시지 사용, 없으면 영어, 그것도 없으면 한국어
      textVn = chip.messageVN ? removeRequestPrefix(chip.messageVN) : 
               (chip.messageEN ? removeRequestPrefix(chip.messageEN) : 
               (chip.messageKO ? removeRequestPrefix(chip.messageKO) : ''));
    } else if (userLang === 'zh') {
      // 중국어 선택 시: 중국어 메시지 전달
      textZh = chip.messageZH ? removeRequestPrefix(chip.messageZH) : 
               (chip.messageEN ? removeRequestPrefix(chip.messageEN) : 
               (chip.messageKO ? removeRequestPrefix(chip.messageKO) : undefined));
    } else if (userLang === 'ru') {
      // 러시아어 선택 시: 러시아어 메시지 전달
      textRu = chip.messageRU ? removeRequestPrefix(chip.messageRU) : 
               (chip.messageEN ? removeRequestPrefix(chip.messageEN) : 
               (chip.messageKO ? removeRequestPrefix(chip.messageKO) : undefined));
    } else {
      // 영어 선택 시: 영어 메시지 사용, 없으면 한국어
      textEn = chip.messageEN ? removeRequestPrefix(chip.messageEN) : 
               (chip.messageKO ? removeRequestPrefix(chip.messageKO) : undefined);
    }

    // 메시지 전송 시점 기록 (SSE 이벤트 무시 기간 설정)
    lastMessageSendTimeRef.current = Date.now();

    // 낙관적 업데이트: 메시지를 즉시 UI에 추가
    const tempId = `temp-${Date.now()}`;
    const messageText = textKo || textVn || textEn || textZh || textRu || '';
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender: 'user',
      textKO: textKo || '',
      textVN: textVn || '',
      textEN: textEn,
      textZH: textZh,
      textRU: textRu,
      timestamp: new Date(),
      type: 'request',
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // 자동 스크롤
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);

    try {
      const response = await apiClient.sendMessage({
        sessionId,
        senderType: 'USER',
        textKo,
        textVn,
        textEn,
        textZh,
        textRu,
        messageType: 'REQUEST',
      });

      if (response.success && response.data) {
        // 서버 응답으로 받은 실제 메시지로 낙관적 메시지 교체
        const realMessage = convertBackendMessage(response.data);
        // 최근 전송한 메시지로 기록 (SSE 이벤트로 인한 중복 리로드 방지)
        recentlySentMessagesRef.current.set(realMessage.id, Date.now());
        
        // 메시지 교체 시 깜빡임 방지: 같은 위치의 메시지만 교체하고 애니메이션 건너뛰기
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === tempId);
          if (index !== -1) {
            // 같은 위치의 메시지를 교체하여 리렌더링 최소화
            // 메시지에 _isUpdating 플래그를 추가하여 애니메이션 건너뛰기
            const updatedMessage = { ...realMessage, _isUpdating: true };
            const newMessages = [...prev];
            newMessages[index] = updatedMessage;
            // 플래그 제거를 위한 지연 처리
            setTimeout(() => {
              setMessages(current => {
                const currentIndex = current.findIndex(msg => msg.id === realMessage.id);
                if (currentIndex !== -1 && current[currentIndex]._isUpdating) {
                  const cleanedMessages = [...current];
                  const { _isUpdating, ...cleanedMessage } = cleanedMessages[currentIndex] as any;
                  cleanedMessages[currentIndex] = cleanedMessage;
                  return cleanedMessages;
                }
                return current;
              });
            }, 100);
            return newMessages;
          } else {
            // 임시 메시지를 찾을 수 없으면 필터링 후 추가
            const filtered = prev.filter(msg => msg.id !== tempId);
            return [...filtered, realMessage];
          }
        });
        
        // 3초 후 추적 목록에서 제거
        setTimeout(() => {
          recentlySentMessagesRef.current.delete(realMessage.id);
        }, 3000);
      } else {
        // 서버 응답이 없으면 채팅 히스토리 다시 로드
        try {
          const chatResponse = await apiClient.getChatHistory(sessionId);
          if (chatResponse.success && chatResponse.data) {
            const backendMessages = chatResponse.data;
            const convertedMessages = backendMessages.map(convertBackendMessage);
            setMessages(convertedMessages);
          }
        } catch (chatError) {
          console.error('Failed to reload chat history after quick action:', chatError);
          // 실패 시 낙관적 메시지 제거
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          toast.error(getTranslation('toast.messageSendFailed', userLang));
        }
      }
    } catch (error) {
      console.error('Failed to send quick action message:', error);
      // 실패 시 낙관적 메시지 제거
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast.error(getTranslation('toast.messageSendFailed', userLang));
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
      ? getTranslation('toast.photoSent', userLang)
      : '');

    // 메시지 전송 시점 기록 (SSE 이벤트 무시 기간 설정)
    lastMessageSendTimeRef.current = Date.now();

    // 낙관적 업데이트: 메시지를 즉시 UI에 추가
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender: 'user',
      textKO: userLang === 'ko' ? messageText : '',
      textVN: userLang === 'vn' ? messageText : '',
      textEN: userLang === 'en' ? messageText : undefined,
      textZH: userLang === 'zh' ? messageText : undefined,
      textRU: userLang === 'ru' ? messageText : undefined,
      timestamp: new Date(),
      type: previewImage ? 'image' : 'text',
      imageUrl: previewImage || undefined,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    setPreviewImage(null);
    
    // 자동 스크롤
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);

    try {
      const response = await apiClient.sendMessage({
        sessionId,
        senderType: 'USER',
        textKo: userLang === 'ko' ? messageText : '',
        textVn: userLang === 'vn' ? messageText : '',
        textEn: userLang === 'en' ? messageText : undefined,
        textZh: userLang === 'zh' ? messageText : undefined,
        textRu: userLang === 'ru' ? messageText : undefined,
        messageType: previewImage ? 'IMAGE' : 'TEXT',
        imageUrl: previewImage || undefined,
      });

      if (response.success && response.data) {
        // 서버 응답으로 받은 실제 메시지로 낙관적 메시지 교체
        const realMessage = convertBackendMessage(response.data);
        // 최근 전송한 메시지로 기록 (SSE 이벤트로 인한 중복 리로드 방지)
        recentlySentMessagesRef.current.set(realMessage.id, Date.now());
        
        // 메시지 교체 시 깜빡임 방지: 같은 위치의 메시지만 교체하고 애니메이션 건너뛰기
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === tempId);
          if (index !== -1) {
            // 같은 위치의 메시지를 교체하여 리렌더링 최소화
            // 메시지에 _isUpdating 플래그를 추가하여 애니메이션 건너뛰기
            const updatedMessage = { ...realMessage, _isUpdating: true };
            const newMessages = [...prev];
            newMessages[index] = updatedMessage;
            // 플래그 제거를 위한 지연 처리
            setTimeout(() => {
              setMessages(current => {
                const currentIndex = current.findIndex(msg => msg.id === realMessage.id);
                if (currentIndex !== -1 && current[currentIndex]._isUpdating) {
                  const cleanedMessages = [...current];
                  const { _isUpdating, ...cleanedMessage } = cleanedMessages[currentIndex] as any;
                  cleanedMessages[currentIndex] = cleanedMessage;
                  return cleanedMessages;
                }
                return current;
              });
            }, 100);
            return newMessages;
          } else {
            // 임시 메시지를 찾을 수 없으면 필터링 후 추가
            const filtered = prev.filter(msg => msg.id !== tempId);
            return [...filtered, realMessage];
          }
        });
        
        // 3초 후 추적 목록에서 제거
        setTimeout(() => {
          recentlySentMessagesRef.current.delete(realMessage.id);
        }, 3000);
      } else {
        // 서버 응답이 없으면 채팅 히스토리 다시 로드
        try {
          const chatResponse = await apiClient.getChatHistory(sessionId);
          if (chatResponse.success && chatResponse.data) {
            const backendMessages = chatResponse.data;
            const convertedMessages = backendMessages.map(convertBackendMessage);
            setMessages(convertedMessages);
          }
        } catch (chatError) {
          console.error('Failed to reload chat history after send message:', chatError);
          // 실패 시 낙관적 메시지 제거
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          toast.error(getTranslation('toast.messageSendFailed', userLang));
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // 실패 시 낙관적 메시지 제거
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast.error(getTranslation('toast.messageSendFailed', userLang));
    }
  };

  const handlePlaceOrder = async (items: CartItem[]) => {
    if (!sessionId || !tableId || !restaurantId) {
      toast.error(getTranslation('toast.sessionInfoMissing', userLang));
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
        
        // 주문 완료 후 메뉴 닫기
        setIsMenuOpen(false);
        setActiveTab('chat');
        
        // 세션의 주문 목록 새로고침
        await refreshSessionOrders();
        
        // 백엔드에서 생성된 주문 정보를 사용하여 메시지 metadata 구성
        const orderData = response.data;
        const orderItemsForMessage = orderData.items?.map((orderItem: any) => {
          const cartItem = items.find(item => item.id === orderItem.menuItem?.id);
          const selectedOptions = orderItem.options?.map((opt: any) => ({
            id: opt.option?.id,
            labelKO: opt.option?.nameKo,
            labelVN: opt.option?.nameVn,
            labelEN: opt.option?.nameEn,
            labelZH: (opt.option as any)?.nameZh,
            priceVND: opt.price,
            quantity: opt.quantity,
          })) || [];
          
          return {
            id: orderItem.id,
            menuItemId: orderItem.menuItem?.id,
            nameKO: orderItem.menuItem?.nameKo || cartItem?.nameKO,
            nameVN: orderItem.menuItem?.nameVn || cartItem?.nameVN,
            nameEN: orderItem.menuItem?.nameEn || cartItem?.nameEN,
            nameZH: (orderItem.menuItem as any)?.nameZh || cartItem?.nameZH,
            imageQuery: orderItem.menuItem?.imageUrl || cartItem?.imageQuery,
            imageUrl: orderItem.menuItem?.imageUrl || cartItem?.imageQuery,
            quantity: orderItem.quantity,
            unitPrice: orderItem.unitPrice, // 순수 메뉴 항목 단가
            priceVND: orderItem.unitPrice, // 단가 (옵션 제외)
            totalPrice: orderItem.totalPrice, // 총액 (옵션 포함)
            selectedOptions,
          };
        }) || items; // 백엔드 응답이 없으면 기존 items 사용
        
        const orderTextKO = orderItemsForMessage.map((i: any) => `${i.nameKO || i.nameKO} x${i.quantity}`).join(', ');
        const orderTextVN = orderItemsForMessage.map((i: any) => `${i.nameVN || i.nameVN} x${i.quantity}`).join(', ');
        const orderTextEN = orderItemsForMessage.map((i: any) => `${i.nameEN || i.nameKO} x${i.quantity}`).join(', ');
        
        // 주문 메시지 전송 (백엔드 주문 정보 사용)
        await apiClient.sendMessage({
          sessionId,
          senderType: 'USER',
          textKo: `주문합니다: ${orderTextKO}`,
          textVn: `Đặt món: ${orderTextVN}`,
          textEn: `Order: ${orderTextEN}`,
          messageType: 'ORDER',
          metadata: orderItemsForMessage,
        });

        // 채팅 히스토리 새로고침
        const chatResponse = await apiClient.getChatHistory(sessionId);
        if (chatResponse.success && chatResponse.data) {
          const backendMessages = chatResponse.data;
          const convertedMessages = backendMessages.map(convertBackendMessage);
          setMessages(convertedMessages);
        }

        // Don't show toast here - SSE event will trigger toast notification
        // This prevents duplicate toast messages (order creation + SSE event)
      } else {
        throw new Error(response.error?.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error(getTranslation('toast.orderFailed', userLang));
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
        toast.error(getTranslation('toast.paymentFailed', userLang));
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
      toast.error(getTranslation('toast.paymentFailed', userLang));
    }
  };

  // 로딩 및 에러 상태 처리
  if (sessionLoading) {
    return <LoadingScreen lang={userLang} />;
  }

  if (sessionError) {
    return (
      <ErrorPage
        title={getTranslation('error.sessionLoadFailed', userLang)}
        message={sessionError}
        onRetry={refreshSession}
      />
    );
  }

  if (!sessionId) {
    return (
      <ErrorPage
        title={getTranslation('error.noSession', userLang)}
        message={getTranslation('error.cannotCreateSession', userLang)}
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
              splashImageUrl={restaurant?.splashImageUrl}
              onComplete={() => setShowIntro(false)}
              restaurantName={restaurant?.nameKo || restaurant?.nameVn || null}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col h-[100dvh] w-full bg-background fixed inset-0 overflow-hidden font-sans text-foreground">
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
          <div className="bg-card px-5 py-3 rounded-2xl relative shadow-xl mb-4 text-center max-w-[250px] animate-bounce cursor-pointer">
            <p className="font-bold text-foreground text-sm">{getTranslation('coachMark.title', userLang)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{getTranslation('coachMark.subtitle', userLang)}</p>
            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45 transform border-r border-b border-border"></div>
          </div>
        </div>
      )}

      {/* Header - Fixed Height, No Sticky needed in Flex Col */}
      <header className="flex-none flex items-center justify-between px-5 py-3 bg-card border-b border-border z-20 shadow-sm h-14">
        <div className="flex items-center gap-3">
          {/* 식당 상호 및 테이블 번호 */}
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base tracking-tight text-foreground leading-tight">
              {restaurant 
                ? (userLang === 'ko' ? restaurant.nameKo : userLang === 'vn' ? restaurant.nameVn : restaurant.nameEn || restaurant.nameKo)
                : 'QOODLE'}
            </h1>
            {tableNumber && (
              <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {tableNumber}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2.5 rounded-full text-muted-foreground hover:bg-muted font-bold text-xs gap-1.5 border border-border">
                <Globe size={14} />
                {userLang.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[140px]">
              <DropdownMenuItem onClick={() => setUserLang('ko')} className="font-medium text-xs focus:bg-zinc-100 focus:text-zinc-900 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900">
                🇰🇷 한국어
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserLang('en')} className="font-medium text-xs focus:bg-zinc-100 focus:text-zinc-900 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900">
                🇺🇸 English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserLang('vn')} className="font-medium text-xs focus:bg-zinc-100 focus:text-zinc-900 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900">
                🇻🇳 Tiếng Việt
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserLang('zh')} className="font-medium text-xs focus:bg-zinc-100 focus:text-zinc-900 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900">
                🇨🇳 简体中文
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserLang('ru')} className="font-medium text-xs focus:bg-zinc-100 focus:text-zinc-900 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900">
                🇷🇺 Русский
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
             className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
          >
             <ShoppingBag size={24} />
             {cartItemCount > 0 && (
               <span className="absolute top-0 right-0 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full border border-background animate-in zoom-in duration-200">
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
        style={{ backgroundColor: '#5C7285' }}
      >
        <div className="text-center py-4">
           <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
             {new Date().toLocaleDateString(
               userLang === 'ko' ? 'ko-KR' : userLang === 'vn' ? 'vi-VN' : userLang === 'zh' ? 'zh-CN' : 'en-US'
             )}
           </span>
        </div>
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} promotions={promotions} />
        ))}
      </div>

      {/* Floating Input Area (Above Tabs) */}
      <div className="absolute bottom-[60px] left-0 right-0 z-30 bg-gradient-to-t from-background via-background to-background/0 pt-4 pb-2">
         {/* Quick Chips Row */}
         <div className="mb-2">
            <QuickActions chips={quickChips} onChipClick={handleQuickAction} />
         </div>

         {/* Input Row */}
         <div className="px-4 pb-2">
            {previewImage && (
              <div className="relative inline-block mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-border shadow-sm">
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-1.5 -right-1.5 bg-foreground text-background rounded-full p-1 shadow-sm hover:bg-foreground/80"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            
            <div className="flex gap-2 items-end bg-card p-2 rounded-3xl border border-border shadow-lg shadow-black/10">
               <Button 
                 onClick={() => fileInputRef.current?.click()}
                 variant="ghost"
                 size="icon"
                 className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10 shrink-0 transition-colors"
               >
                 <Camera size={20} />
               </Button>
               <Input 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 placeholder={getTranslation('input.placeholder', userLang)}
                 className="flex-1 border-none focus-visible:ring-0 bg-transparent h-10 px-0 text-base placeholder:text-muted-foreground/70"
               />
               <Button 
                 onClick={handleSendMessage}
                 size="icon"
                 className={`rounded-full h-10 w-10 shrink-0 transition-all ${
                   inputText.trim() || previewImage 
                     ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90' 
                     : 'bg-muted text-muted-foreground'
                 }`}
                 disabled={!inputText.trim() && !previewImage}
               >
                 <Send size={18} className={inputText.trim() || previewImage ? 'ml-0.5' : ''} />
               </Button>
            </div>
         </div>
      </div>

      {/* Bottom Tab Bar (Fixed) */}
      <div className={`h-[60px] bg-card border-t border-border flex justify-around items-center pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.02)] transition-all flex-none z-40 relative`}>
         <button 
           onClick={() => {
             setActiveTab('event');
             setIsEventOpen(true);
             if (showCoachMark) dismissCoachMark();
           }}
           className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'event' ? 'text-purple-600' : 'text-purple-400'} ${showCoachMark ? 'opacity-30' : ''}`}
         >
           <motion.div
             animate={{
               opacity: [0.3, 1, 0.3],
               scale: [1, 1.2, 1],
               rotate: [0, 5, -5, 0],
             }}
             transition={{
               duration: 1.5,
               repeat: Infinity,
               ease: "easeInOut",
             }}
           >
             <PartyPopper size={22} strokeWidth={activeTab === 'event' ? 2.5 : 2} />
           </motion.div>
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
          <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-black/10 transition-all duration-300 ${
             activeTab === 'menu' 
            ? 'bg-primary text-primary-foreground scale-110 ring-4 ring-background' 
            : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 ring-4 ring-background'
           }`}>
             <UtensilsCrossed size={24} strokeWidth={2.5} />
           </div>
          <span className={`text-[10px] font-bold mt-8 transition-colors ${activeTab === 'menu' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
             {getTranslation('tabs.menu', userLang)}
           </span>
         </button>

         <button 
           onClick={() => {
             setActiveTab('bill');
             setIsBillOpen(true);
             if (showCoachMark) dismissCoachMark();
           }}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'bill' ? 'text-blue-600' : 'text-blue-400'} ${showCoachMark ? 'opacity-30' : ''}`}
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
        promotions={promotions}
      />
      <BillModal
        isOpen={isBillOpen}
        onClose={() => {
          setIsBillOpen(false);
          setActiveTab('chat'); // Return to chat tab when closed
        }}
        orders={sessionOrders.length > 0 ? sessionOrders : confirmedOrders}
        restaurantId={restaurantId}
        tableNumber={tableNumber}
        onPaymentRequest={handlePaymentRequest}
        onTransferComplete={handleTransferComplete}
        promotions={promotions}
      />
      <EventModal
        isOpen={isEventOpen}
        onClose={() => {
          setIsEventOpen(false);
          setActiveTab('chat');
        }}
        lang={userLang}
        menuItems={menuItems}
        promotions={promotions}
      />
      {currentPromotion && (
        <PromotionPopup
          isOpen={showPromotionPopup}
          onClose={() => {
            setShowPromotionPopup(false);
            setCurrentPromotion(null);
          }}
          onHideToday={() => {
            if (currentPromotion) {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const todayStr = today.toISOString().split('T')[0];
              const hiddenKey = `promotion_hidden_${currentPromotion.id}_${todayStr}`;
              localStorage.setItem(hiddenKey, 'true');
            }
            setShowPromotionPopup(false);
            setCurrentPromotion(null);
          }}
          promotion={currentPromotion}
          lang={userLang}
          menuItems={currentPromotion.menuItems || []}
          cart={cart}
          setCart={setCart}
          onAddToCart={(frontendItem, options) => {
            // 옵션 선택 후 장바구니에 추가
            setCart(prev => {
              const optionsKey = (opts?: MenuOption[]) => 
                (opts || []).map(o => o.id).sort().join(',');
              
              const newKey = optionsKey(options);
              
              const existing = prev.find(i => 
                i.id === frontendItem.id && 
                optionsKey(i.selectedOptions) === newKey
              );
              
              if (existing) {
                return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
              }
              return [...prev, { ...frontendItem, quantity: 1, selectedOptions: options }];
            });
          }}
          onMenuClick={(backendMenuItem) => {
            // Convert backend MenuItem to frontend MenuItem
            const options = (backendMenuItem.optionGroups && Array.isArray(backendMenuItem.optionGroups) 
              ? backendMenuItem.optionGroups.flatMap(group => 
                  (group.options && Array.isArray(group.options)
                    ? group.options.map(opt => ({
                        id: opt.id,
                        labelKO: opt.nameKo,
                        labelVN: opt.nameVn,
                        labelEN: opt.nameEn,
                        labelZH: (opt as any).nameZh,
                        labelRU: (opt as any).nameRu,
                        priceVND: opt.priceVnd,
                      }))
                    : [])
                )
              : []).filter(Boolean);

            const frontendMenuItem: FrontendMenuItem = {
              id: backendMenuItem.id,
              nameKO: backendMenuItem.nameKo,
              nameVN: backendMenuItem.nameVn,
              nameEN: backendMenuItem.nameEn,
              nameZH: (backendMenuItem as any).nameZh,
              nameRU: (backendMenuItem as any).nameRu,
              priceVND: backendMenuItem.priceVnd,
              category: 'food', // 기본값
              categoryId: backendMenuItem.categoryId || '',
              imageQuery: backendMenuItem.imageUrl || '',
              descriptionKO: backendMenuItem.descriptionKo,
              descriptionVN: backendMenuItem.descriptionVn,
              descriptionRU: (backendMenuItem as any).descriptionRu,
              descriptionEN: backendMenuItem.descriptionEn,
              descriptionZH: (backendMenuItem as any).descriptionZh,
              options: options.length > 0 ? options : undefined,
            };

            // Open MenuModal and scroll to the menu item
            setIsMenuOpen(true);
            setActiveTab('menu');
            // Small delay to ensure modal is open before scrolling
            setTimeout(() => {
              const element = document.getElementById(`menu-item-${frontendMenuItem.id}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
        />
      )}
      </div>
    </>
  );
};