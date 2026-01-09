const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  priceVnd: number;
}

export interface MenuOptionGroup {
  id: string;
  menuItemId: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
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
  descriptionKo?: string;
  descriptionVn?: string;
  descriptionEn?: string;
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
  displayOrder: number;
  menuItems: MenuItem[];
}

export interface Menu {
  categories: MenuCategory[];
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
  messageType: 'TEXT' | 'IMAGE' | 'ORDER' | 'REQUEST';
  imageUrl?: string;
  metadata?: any;
  createdAt: string;
}

export interface SendMessageRequest {
  sessionId: string;
  senderType: 'USER' | 'STAFF' | 'SYSTEM';
  textKo: string;
  textVn: string;
  textEn?: string;
  messageType: 'TEXT' | 'IMAGE' | 'ORDER' | 'REQUEST';
  imageUrl?: string;
  metadata?: any;
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
}

export const apiClient = new ApiClient();
