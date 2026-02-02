const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const normalized = envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const hostWithoutPort = window.location.host.split(':')[0];
      const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
      const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
      const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
      const envHost = (() => {
        try {
          return new URL(normalized).host;
        } catch {
          return normalized.replace(/^https?:\/\//, '').split('/')[0];
        }
      })();
      const currentHost = window.location.host;
      if (isLocalSubdomain && envHost !== currentHost) {
        return normalized;
      }
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

const API_URL = getApiBaseUrl();

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

// Table 타입
export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  floor: number;
  capacity: number;
  qrCode: string;
  status: string;
  currentSessionId?: string | null;
}

// Session 타입
export interface Session {
  id: string;
  tableId: string;
  restaurantId: string;
  status: string;
  guestCount: number;
  startedAt: string;
  endedAt?: string | null;
}

// MenuItem 타입 (백엔드 구조에 맞춤)
export interface MenuOption {
  id: string;
  optionGroupId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
  nameZh?: string;
  nameRu?: string;
  priceVnd: number;
}

export interface MenuOptionGroup {
  id: string;
  menuItemId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
  nameZh?: string;
  nameRu?: string;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  restaurantId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
  nameZh?: string;
  nameRu?: string;
  descriptionKo?: string;
  descriptionVn?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionRu?: string;
  priceVnd: number;
  imageUrl?: string;
  isSoldOut: boolean;
  displayOrder: number;
  optionGroups: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
  nameZh?: string;
  nameRu?: string;
  displayOrder: number;
  menuItems: MenuItem[];
}

export interface Menu {
  categories: MenuCategory[];
}

// Restaurant 타입
export interface Restaurant {
  id: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
  status: string;
  qrCode: string;
  createdAt: string;
}

// Order 타입 (백엔드 구조에 맞춤)
export interface OrderItemOption {
  optionId: string;
  quantity: number;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  options?: OrderItemOption[];
  notes?: string[];
}

export interface CreateOrderRequest {
  sessionId: string;
  tableId: string;
  restaurantId: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  sessionId: string;
  tableId: string;
  restaurantId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

// Chat Message 타입
export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'USER' | 'STAFF' | 'SYSTEM';
  textKo: string;
  textVn: string;
  textEn?: string;
  textZH?: string;
  textRU?: string;
  detectedLanguage?: 'ko' | 'vn' | 'en' | 'zh' | 'ru' | null;
  messageType: 'TEXT' | 'IMAGE' | 'ORDER' | 'REQUEST';
  imageUrl?: string;
  metadata?: any;
  createdAt: string;
}

export interface SendMessageRequest {
  sessionId: string;
  senderType: 'USER' | 'STAFF' | 'SYSTEM';
  textKo?: string;
  textVn?: string;
  textEn?: string;
  textZh?: string;
  textRu?: string;
  messageType: 'TEXT' | 'IMAGE' | 'ORDER' | 'REQUEST';
  imageUrl?: string;
  metadata?: any;
}

// Promotion 타입
export interface Promotion {
  id: string;
  restaurantId: string;
  titleKo: string;
  titleVn: string;
  titleEn?: string | null;
  titleZh?: string | null;
  titleRu?: string | null;
  descriptionKo?: string | null;
  descriptionVn?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  descriptionRu?: string | null;
  imageUrl?: string | null;
  discountPercent?: number | null;
  startDate: string;
  endDate: string;
  displayOrder: number;
  isActive: boolean;
  showOnLoad: boolean;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          error: { message: `HTTP ${response.status}: ${response.statusText}` },
        }));
        return errorData;
      }

      const result: ApiResponse<T> = await response.json();
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // Restaurant methods
  async getRestaurant(restaurantId: string): Promise<ApiResponse<Restaurant>> {
    return this.request<Restaurant>(`/api/public/restaurant/${restaurantId}`);
  }

  // Table methods
  async getTableByNumber(restaurantId: string, tableNumber: number): Promise<ApiResponse<Table>> {
    return this.request<Table>(`/api/customer/restaurant/${restaurantId}/tables/${tableNumber}`);
  }

  // Session methods
  async createSession(data: {
    tableId: string;
    restaurantId: string;
    guestCount?: number;
  }): Promise<ApiResponse<Session>> {
    return this.request<Session>('/api/customer/session', {
      method: 'POST',
      body: JSON.stringify({
        tableId: data.tableId,
        restaurantId: data.restaurantId,
        guestCount: data.guestCount || 1,
      }),
    });
  }

  async getSession(sessionId: string): Promise<ApiResponse<Session>> {
    return this.request<Session>(`/api/customer/session/${sessionId}`);
  }

  // Menu methods
  async getMenu(restaurantId: string): Promise<ApiResponse<Menu>> {
    return this.request<Menu>(`/api/customer/menu/${restaurantId}`);
  }

  // Order methods
  async createOrder(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return this.request<Order>('/api/customer/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/api/customer/orders/${orderId}`);
  }

  // Chat methods
  async sendMessage(data: SendMessageRequest): Promise<ApiResponse<ChatMessage>> {
    return this.request<ChatMessage>('/api/customer/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChatHistory(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
    return this.request<ChatMessage[]>(`/api/customer/chat/${sessionId}`);
  }

  // Bill methods
  async getBill(sessionId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/customer/bill/${sessionId}`);
  }

  // Payment methods
  async completePayment(sessionId: string, paymentMethod: string): Promise<ApiResponse<any>> {
    return this.request('/api/customer/payment/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId, paymentMethod }),
    });
  }

  // Get payment methods for restaurant (public API)
  async getPaymentMethods(restaurantId: string): Promise<ApiResponse<{
    bankTransfer: {
      enabled: boolean;
      bankName?: string;
      accountHolder?: string;
      accountNumber?: string;
    };
  }>> {
    return this.request(`/api/customer/payment-methods/${restaurantId}`);
  }

  // Generate QR code for bank transfer (public API)
  async generateQRCode(data: {
    restaurantId: string;
    amount: number;
    memo?: string;
    tableNumber?: number;
  }): Promise<ApiResponse<{
    qrCodeUrl: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    amount: number | null;
  }>> {
    return this.request('/api/customer/generate-qr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Quick Chip methods (public API)
  async getQuickChips(restaurantId?: string, type?: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE'): Promise<ApiResponse<Array<{
    id: string;
    restaurantId: string | null;
    type: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';
    templateKey?: string | null;
    icon: string;
    labelKo: string;
    labelVn: string;
    labelEn?: string;
    labelZh?: string;
    labelRu?: string;
    messageKo?: string;
    messageVn?: string;
    messageEn?: string;
    messageZh?: string;
    displayOrder: number;
    isActive: boolean;
  }>>> {
    const params = new URLSearchParams();
    if (restaurantId) params.append('restaurantId', restaurantId);
    if (type) params.append('type', type);
    return this.request(`/api/public/quick-chips?${params.toString()}`);
  }

  // Promotion methods (public API)
  async getPromotions(restaurantId: string, showOnLoadOnly?: boolean): Promise<ApiResponse<Promotion[]>> {
    const params = new URLSearchParams();
    if (showOnLoadOnly) params.append('showOnLoadOnly', 'true');
    return this.request(`/api/public/promotions/${restaurantId}${params.toString() ? `?${params.toString()}` : ''}`);
  }
}

export const apiClient = new ApiClient();
