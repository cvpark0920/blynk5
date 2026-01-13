// Common mapping functions for converting backend data to frontend format

import { Table, Order, MenuCategory, MenuItem, MenuOptionGroup, MenuOption, Staff, WaitingEntry } from '../data';
import {
  BackendTable,
  BackendOrder,
  BackendMenuCategory,
  BackendMenuItem,
  BackendMenuOptionGroup,
  BackendMenuOption,
  BackendStaff,
  BackendWaitingEntry,
  BackendTableStatus,
  BackendChatMessage,
} from '../types/api';

type Language = 'ko' | 'en' | 'vn';

// Table Mappers
export function mapBackendTableToFrontend(backendTable: BackendTable): Table {
  const activeSession = backendTable.sessions?.[0];
  
  // Map backend status to frontend status
  const statusMap: Record<BackendTableStatus, Table['status']> = {
    'EMPTY': 'empty',
    'ORDERING': 'ordering',
    'DINING': 'dining',
    'CLEANING': 'cleaning',
  };
  
  const frontendStatus = statusMap[backendTable.status] || 'empty';
  
  // 공석 테이블(EMPTY)은 항상 guests를 0으로 설정
  // 활성 세션이 있는 경우에만 세션의 guestCount 사용
  const guests = frontendStatus === 'empty' ? 0 : (activeSession?.guestCount || 0);
  const orderTime = activeSession?.createdAt ? new Date(activeSession.createdAt) : undefined;
  
  // Calculate total amount from orders
  const totalAmount = activeSession?.orders?.reduce((sum: number, order) => {
    return sum + (order.totalAmount || 0);
  }, 0) || 0;

  return {
    id: backendTable.tableNumber, // Use tableNumber as id for frontend
    tableId: backendTable.id, // Store actual UUID
    currentSessionId: backendTable.currentSessionId, // 활성 세션 ID 저장
    floor: backendTable.floor,
    status: frontendStatus,
    guests,
    capacity: backendTable.capacity,
    totalAmount,
    orderTime,
  };
}

export function mapFrontendTableToBackend(frontendTable: Partial<Table>): { tableNumber: number; floor: number; capacity: number } {
  return {
    tableNumber: frontendTable.id || 0,
    floor: frontendTable.floor || 1,
    capacity: frontendTable.capacity || 4,
  };
}

// Order Mappers
export function mapBackendOrderToFrontend(backendOrder: BackendOrder, language: Language, tableNumber?: number): Order {
  // Get menu item name based on language
  const getMenuItemName = (menuItem: BackendOrder['items'][0]['menuItem']): string => {
    if (language === 'ko') return menuItem.nameKo || menuItem.nameEn || menuItem.nameVn || menuItem.name || '';
    if (language === 'vn') return menuItem.nameVn || menuItem.nameKo || menuItem.nameEn || menuItem.name || '';
    return menuItem.nameEn || menuItem.nameKo || menuItem.nameVn || menuItem.name || '';
  };

  // Get option name based on language
  const getOptionName = (option: BackendOrder['items'][0]['options'] extends Array<infer T> ? T : never): string => {
    const opt = option as { option: { nameKo?: string; nameVn?: string; nameEn?: string } };
    if (language === 'ko') return opt.option.nameKo || opt.option.nameEn || opt.option.nameVn || '';
    if (language === 'vn') return opt.option.nameVn || opt.option.nameKo || opt.option.nameEn || '';
    return opt.option.nameEn || opt.option.nameKo || opt.option.nameVn || '';
  };

  return {
    id: backendOrder.id,
    tableId: tableNumber || backendOrder.table?.tableNumber || 0,
    sessionId: backendOrder.sessionId, // 활성 세션 필터링을 위해 추가
    items: backendOrder.items.map((item) => ({
      name: getMenuItemName(item.menuItem),
      quantity: item.quantity,
      price: item.totalPrice, // 합계 금액
      unitPrice: item.unitPrice, // 단가
      options: item.options?.map((opt) => getOptionName(opt as any)) || [],
    })),
    status: backendOrder.status.toLowerCase() as Order['status'],
    timestamp: new Date(backendOrder.createdAt),
    type: 'order',
    totalAmount: backendOrder.totalAmount || 0, // 백엔드에서 받은 totalAmount 추가
  };
}

// Menu Category Mappers
export function mapBackendCategoryToFrontend(backendCategory: BackendMenuCategory, language: Language): MenuCategory {
  const nameMap: Record<Language, string> = {
    ko: backendCategory.nameKo || '',
    vn: backendCategory.nameVn || '',
    en: backendCategory.nameEn || backendCategory.nameKo || '',
  };
  
  return {
    id: backendCategory.id,
    name: nameMap[language] || backendCategory.nameKo || '',
    order: backendCategory.displayOrder || 0,
  };
}

export function mapFrontendCategoryToBackend(frontendCategory: MenuCategory, language: Language): { nameKo: string; nameVn: string; nameEn?: string; displayOrder: number } {
  // For now, use the same name for all languages (can be enhanced later)
  const name = frontendCategory.name || '';
  return {
    nameKo: name,
    nameVn: name,
    nameEn: language === 'en' ? name : undefined,
    displayOrder: frontendCategory.order || 0,
  };
}

// Menu Item Mappers
export function mapBackendMenuItemToFrontend(backendItem: BackendMenuItem, language: Language): MenuItem {
  const nameMap: Record<Language, string> = {
    ko: backendItem.nameKo || '',
    vn: backendItem.nameVn || '',
    en: backendItem.nameEn || backendItem.nameKo || '',
  };
  
  const descMap: Record<Language, string | undefined> = {
    ko: backendItem.descriptionKo || undefined,
    vn: backendItem.descriptionVn || undefined,
    en: backendItem.descriptionEn || undefined,
  };

  const optionGroups: MenuOptionGroup[] = (backendItem.optionGroups || []).map((og: BackendMenuOptionGroup) => {
    const ogNameMap: Record<Language, string> = {
      ko: og.nameKo || '',
      vn: og.nameVn || '',
      en: og.nameEn || og.nameKo || '',
    };
    
    const options: MenuOption[] = (og.options || []).map((opt: BackendMenuOption) => {
      const optNameMap: Record<Language, string> = {
        ko: opt.nameKo || '',
        vn: opt.nameVn || '',
        en: opt.nameEn || opt.nameKo || '',
      };
      
      return {
        id: opt.id,
        name: optNameMap[language] || opt.nameKo || '',
        price: opt.priceVnd || 0,
      };
    });
    
    return {
      id: og.id,
      name: ogNameMap[language] || og.nameKo || '',
      minSelect: og.minSelect || 0,
      maxSelect: og.maxSelect || 1,
      options,
    };
  });

  return {
    id: backendItem.id,
    categoryId: backendItem.categoryId,
    name: nameMap[language] || backendItem.nameKo || '',
    description: descMap[language],
    price: backendItem.priceVnd || 0,
    imageUrl: backendItem.imageUrl || null,
    isSoldOut: backendItem.isSoldOut || false,
    optionGroups,
  };
}

export function mapFrontendMenuItemToBackend(frontendItem: MenuItem, restaurantId: string, language: Language): {
  categoryId: string;
  restaurantId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
  descriptionKo: string;
  descriptionVn: string;
  descriptionEn?: string;
  priceVnd: number;
  imageUrl?: string | null;
  isSoldOut: boolean;
  displayOrder: number;
  optionGroups: Array<{
    nameKo: string;
    nameVn: string;
    nameEn?: string;
    minSelect: number;
    maxSelect: number;
    options: Array<{
      nameKo: string;
      nameVn: string;
      nameEn?: string;
      priceVnd: number;
    }>;
  }>;
} {
  const name = frontendItem.name || '';
  const description = frontendItem.description || '';
  
  const optionGroups = frontendItem.optionGroups.map((og) => {
    const ogName = og.name || '';
    return {
      nameKo: ogName,
      nameVn: ogName,
      nameEn: language === 'en' ? ogName : undefined,
      minSelect: og.minSelect || 0,
      maxSelect: og.maxSelect || 1,
      options: og.options.map((opt) => {
        const optName = opt.name || '';
        return {
          nameKo: optName,
          nameVn: optName,
          nameEn: language === 'en' ? optName : undefined,
          priceVnd: opt.price || 0,
        };
      }),
    };
  });

  return {
    categoryId: frontendItem.categoryId,
    restaurantId,
    nameKo: name,
    nameVn: name,
    nameEn: language === 'en' ? name : undefined,
    descriptionKo: description,
    descriptionVn: description,
    descriptionEn: language === 'en' ? description : undefined,
    priceVnd: frontendItem.price || 0,
    imageUrl: frontendItem.imageUrl,
    isSoldOut: frontendItem.isSoldOut || false,
    displayOrder: 0, // Can be enhanced later
    optionGroups,
  };
}

// Staff Mappers
export function mapBackendStaffToFrontend(backendStaff: BackendStaff): Staff {
  return {
    id: backendStaff.id,
    name: backendStaff.name,
    email: backendStaff.email || undefined,
    phone: backendStaff.phone || undefined,
    role: backendStaff.role.toLowerCase() as Staff['role'],
    status: backendStaff.status.toLowerCase() as Staff['status'],
    avatarUrl: backendStaff.avatarUrl || undefined,
    pinCode: backendStaff.hasPin ? '••••' : undefined,
    joinedAt: new Date(backendStaff.joinedAt),
  };
}

// Waiting List Mappers
export function mapBackendWaitingEntryToFrontend(backendEntry: BackendWaitingEntry): WaitingEntry {
  return {
    id: backendEntry.id,
    name: backendEntry.name,
    phone: backendEntry.phone,
    guests: backendEntry.guestCount,
    status: backendEntry.status.toLowerCase() as WaitingEntry['status'],
    timestamp: new Date(backendEntry.timestamp),
    note: backendEntry.note || undefined,
  };
}

// Chat Message to Order Mapper
export function mapChatMessageToOrder(
  chatMessage: BackendChatMessage,
  tableNumber: number,
  language: Language
): Order {
  // Get message text based on language
  const getMessageText = (): string => {
    if (language === 'ko') return chatMessage.textKo || '';
    if (language === 'vn') return chatMessage.textVn || '';
    return chatMessage.textEn || '';
  };

  const messageText = getMessageText();

  return {
    id: `chat-${chatMessage.id}`, // Prefix to distinguish from real orders
    tableId: tableNumber,
    sessionId: chatMessage.sessionId,
    items: [], // Request messages don't have items
    status: 'pending', // Always pending until handled
    timestamp: new Date(chatMessage.createdAt),
    type: 'request',
    requestDetail: messageText,
    totalAmount: 0, // Request messages don't have amounts
  };
}
