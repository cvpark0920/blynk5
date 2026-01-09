// Backend API Response Types

export type BackendTableStatus = 'EMPTY' | 'ORDERING' | 'DINING' | 'CLEANING';
export type BackendOrderStatus = 'PENDING' | 'COOKING' | 'SERVED' | 'PAID' | 'CANCELLED';
export type BackendWaitingStatus = 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED';
export type BackendStaffRole = 'OWNER' | 'MANAGER' | 'KITCHEN' | 'HALL' | 'STAFF';
export type BackendStaffStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type BackendNotificationType = 'ORDER_NEW' | 'ORDER_STATUS_CHANGED' | 'CHAT_NEW' | 'PAYMENT_CONFIRMED' | 'WATER_REQUEST' | 'CUSTOMER_REQUEST' | 'SHIFT_ALERT';

// Backend Table Response
export interface BackendTable {
  id: string;
  tableNumber: number;
  floor: number;
  capacity: number;
  qrCode: string;
  status: BackendTableStatus;
  currentSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
  sessions?: Array<{
    id: string;
    guestCount: number;
    createdAt: string;
    orders?: Array<{
      totalAmount: number;
    }>;
  }>;
}

// Backend Order Response
export interface BackendOrder {
  id: string;
  sessionId: string;
  tableId: string;
  restaurantId: string;
  status: BackendOrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  table?: {
    tableNumber: number;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    menuItem: {
      id: string;
      nameKo?: string;
      nameVn?: string;
      nameEn?: string;
      name?: string;
    };
    options?: Array<{
      option: {
        id: string;
        nameKo?: string;
        nameVn?: string;
        nameEn?: string;
      };
    }>;
  }>;
}

// Backend Menu Category Response
export interface BackendMenuCategory {
  id: string;
  restaurantId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string | null;
  displayOrder: number;
  menuItems?: BackendMenuItem[];
}

// Backend Menu Item Response
export interface BackendMenuItem {
  id: string;
  categoryId: string;
  restaurantId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string | null;
  descriptionKo?: string | null;
  descriptionVn?: string | null;
  descriptionEn?: string | null;
  priceVnd: number;
  imageUrl?: string | null;
  isSoldOut: boolean;
  displayOrder: number;
  optionGroups?: BackendMenuOptionGroup[];
}

// Backend Menu Option Group Response
export interface BackendMenuOptionGroup {
  id: string;
  menuItemId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string | null;
  minSelect: number;
  maxSelect: number;
  options?: BackendMenuOption[];
}

// Backend Menu Option Response
export interface BackendMenuOption {
  id: string;
  optionGroupId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string | null;
  priceVnd: number;
}

// Backend Staff Response
export interface BackendStaff {
  id: string;
  restaurantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: BackendStaffRole;
  status: BackendStaffStatus;
  avatarUrl?: string | null;
  hasPin?: boolean;
  createdAt: string;
  joinedAt: string;
}

// Backend Waiting List Entry Response
export interface BackendWaitingEntry {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  guestCount: number;
  status: BackendWaitingStatus;
  note?: string | null;
  timestamp: string;
}

// Backend Restaurant Response
export interface BackendRestaurant {
  id: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string | null;
  ownerId: string;
  qrCode: string;
  status: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    email: string;
  };
}

// Backend User Response (from getMe)
export interface BackendUser {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  staff?: {
    id: string;
    restaurantId: string;
    role: BackendStaffRole;
  };
}

// Backend Sales Report Response
export interface BackendSalesStatistics {
  today: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
  };
  yesterday: {
    revenue: number;
    orders: number;
  };
  weekly: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  turnoverRate: number;
}

export interface BackendCategoryDistribution {
  categoryId: string;
  categoryName: string;
  revenue: number;
  percentage: number;
}

export interface BackendTopMenuItem {
  menuItemId: string;
  menuItemName: string;
  orderCount: number;
  revenue: number;
}

export interface BackendHourlyOrderData {
  time: string;
  orders: number;
}

export interface BackendSalesReport {
  statistics: BackendSalesStatistics;
  hourlyOrders: BackendHourlyOrderData[];
  categoryDistribution: BackendCategoryDistribution[];
  topMenuItems: BackendTopMenuItem[];
}

export interface BackendSalesHistoryItem {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BackendSalesHistoryEntry {
  orderId: string;
  orderNumber: number;
  tableNumber: number;
  createdAt: string;
  totalAmount: number;
  status: BackendOrderStatus;
  items: BackendSalesHistoryItem[];
}

// Backend Chat Message Response
export interface BackendChatMessage {
  id: string;
  sessionId: string;
  senderType: 'USER' | 'STAFF' | 'SYSTEM';
  textKo?: string | null;
  textVn?: string | null;
  textEn?: string | null;
  messageType: 'TEXT' | 'ORDER' | 'REQUEST' | 'IMAGE';
  imageUrl?: string | null;
  metadata?: any;
  createdAt: string;
}

// Backend Notification Response
export interface BackendNotification {
  id: string;
  restaurantId: string;
  type: BackendNotificationType;
  titleKo?: string | null;
  titleVn?: string | null;
  titleEn?: string | null;
  descriptionKo?: string | null;
  descriptionVn?: string | null;
  descriptionEn?: string | null;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
