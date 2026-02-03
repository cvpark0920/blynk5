import {
  BackendStaff,
  BackendRestaurant,
  BackendTable,
  BackendOrder,
  BackendMenuCategory,
  BackendWaitingEntry,
  BackendUser,
  BackendSalesReport,
  BackendSalesHistoryEntry,
  BackendNotification,
  BackendChatMessage,
  BackendPromotion,
} from '../app/types/api';

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/$/, '');
  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/$/, '');
    const stripSegments = ['api', 'shop', 'admin', 'customer'];
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0 && stripSegments.includes(parts[parts.length - 1])) {
      parts.pop();
      url.pathname = parts.length ? `/${parts.join('/')}` : '';
    }
    if (url.pathname === '/') {
      url.pathname = '';
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return trimmed.replace(/\/(api|shop|admin|customer)\/?$/, '');
  }
};

const joinUrl = (base: string, path: string): string => {
  if (!base) return path;
  const baseClean = base.replace(/\/$/, '');
  const pathClean = path.startsWith('/') ? path : `/${path}`;
  return `${baseClean}${pathClean}`;
};

// 서브도메인 기반일 때는 상대 경로 사용, 그렇지 않으면 절대 URL 사용
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const normalized = normalizeApiBaseUrl(envUrl);
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
    if (isLocalSubdomain) {
      return envHost !== currentHost ? normalized : '';
    }
    if (!isLocalhost && !isLocalSubdomain && isEnvLocalhost) {
      return '';
    }
    return normalized;
  }
  
  const host = window.location.host;
  const hostWithoutPort = host.split(':')[0];
  const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
  const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');

  // 로컬 서브도메인이거나 운영 도메인이면 같은 origin 사용
  if (!isLocalhost || isLocalSubdomain) {
    return ''; // 상대 경로
  }

  return 'http://localhost:3000';
};

const API_URL = getApiBaseUrl();

export const getSSEUrl = (endpoint: string, token?: string | null): string => {
  const url = joinUrl(API_URL, endpoint);
  if (token) {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
  return url;
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

class ApiClient {
  // 서브도메인 추출 함수
  private getSubdomainFromHost(): string | null {
    if (typeof window === 'undefined') return null;
    
    const host = window.location.host;
    const hostWithoutPort = host.split(':')[0];
    
    if (hostWithoutPort.includes('localhost')) {
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 2 && parts[0] !== 'localhost') {
        return parts[0]; // shop_1.localhost → shop_1
      }
    } else {
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 3) {
        return parts[0]; // shop_1.qoodle.top → shop_1
      }
    }
    return null;
  }

  // Base64 인코딩 (브라우저 환경)
  private encodeBase64(data: object): string {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('unified_accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('unified_refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('unified_accessToken', accessToken);
    localStorage.setItem('unified_refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('unified_accessToken');
    localStorage.removeItem('unified_refreshToken');
    localStorage.removeItem('unified_appType');
    localStorage.removeItem('unified_shopRestaurantId');
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    // 서브도메인일 때는 상대 경로 사용
    const getRefreshUrl = (): string => {
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        const normalized = normalizeApiBaseUrl(envUrl);
        const hostWithoutPort = window.location.host.split(':')[0];
        const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
        const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
        const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
        if (isLocalSubdomain) {
          return '/api/auth/refresh';
        }
        if (!isLocalhost && !isLocalSubdomain && isEnvLocalhost) {
          return '/api/auth/refresh';
        }
        return joinUrl(normalized, '/api/auth/refresh');
      }
      
      if (typeof window !== 'undefined') {
        const host = window.location.host;
        if (host.includes('.localhost:') || host.match(/^shop_\d+\.localhost:/)) {
          return '/api/auth/refresh'; // 상대 경로
        }
      }
      
      return joinUrl('http://localhost:3000', '/api/auth/refresh');
    };

    try {
      const response = await fetch(getRefreshUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const result: ApiResponse<{ accessToken: string }> = await response.json();
      if (result.success && result.data?.accessToken) {
        localStorage.setItem('unified_accessToken', result.data.accessToken);
        // Dispatch event to notify token refresh
        window.dispatchEvent(new CustomEvent('tokenRefreshed'));
        return result.data.accessToken;
      }

      return null;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    forceRelative: boolean = false
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 서브도메인일 때는 상대 경로 사용 (런타임 체크)
    const getRequestUrl = (): string => {
      if (forceRelative) {
        return endpoint;
      }
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        const normalized = normalizeApiBaseUrl(envUrl);
        const hostWithoutPort = window.location.host.split(':')[0];
        const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
        const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
        const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
        if (isLocalSubdomain) {
          return endpoint;
        }
        if (!isLocalhost && !isLocalSubdomain && isEnvLocalhost) {
          return endpoint;
        }
        return joinUrl(normalized, endpoint);
      }
      
      // 런타임에 서브도메인 체크
      if (typeof window !== 'undefined') {
        const host = window.location.host;
        if (host.includes('.localhost:') || host.match(/^shop_\d+\.localhost:/)) {
          return endpoint; // 상대 경로
        }
      }
      
      return joinUrl('http://localhost:3000', endpoint);
    };

    const requestUrl = getRequestUrl();
    try {
      const response = await fetch(requestUrl, {
        ...options,
        headers,
      });

      // Handle token expiration
      if (response.status === 401 && token) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Retry with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(requestUrl, {
            ...options,
            headers,
          });
          const retryContentType = retryResponse.headers.get('content-type') || '';
          if (!retryContentType.includes('application/json')) {
            const retryText = await retryResponse.text();
            throw new Error(
              retryText.trim().startsWith('<')
                ? `API 응답이 HTML입니다. API URL 또는 라우팅을 확인하세요. (${retryResponse.status} ${retryResponse.url})`
                : `API 응답이 JSON이 아닙니다. API URL 또는 라우팅을 확인하세요. (${retryResponse.status} ${retryResponse.url})`
            );
          }
          const result: ApiResponse<T> = await retryResponse.json();
          return result;
        } else {
          // Refresh failed, clear tokens
          this.clearTokens();
          window.location.href = '/';
          throw new Error('Authentication failed');
        }
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (!forceRelative && API_URL) {
          return this.request<T>(endpoint, options, true);
        }
        throw new Error(
          text.trim().startsWith('<')
            ? `API 응답이 HTML입니다. API URL 또는 라우팅을 확인하세요. (${response.status} ${response.url})`
            : `API 응답이 JSON이 아닙니다. API URL 또는 라우팅을 확인하세요. (${response.status} ${response.url})`
        );
      }
      const result: ApiResponse<T> = await response.json();
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async getMe() {
    return this.request<BackendUser>('/api/auth/me');
  }

  async logout() {
    const result = await this.request('/api/auth/logout', {
      method: 'POST',
    });
    this.clearTokens();
    return result;
  }

  // Google OAuth redirect
  googleAuth(restaurantId?: string) {
    const appType = 'shop';
    const subdomain = this.getSubdomainFromHost();
    const params = new URLSearchParams({ appType });
    if (restaurantId) {
      params.append('restaurantId', restaurantId);
    }
    
    // state 생성 (서브도메인이 있으면 포함, 없어도 생성)
    const stateData: { appType: string; restaurantId?: string; subdomain?: string } = { 
      appType
    };
    if (restaurantId) {
      stateData.restaurantId = restaurantId;
    }
    if (subdomain) {
      stateData.subdomain = subdomain;
    }
    
    const state = this.encodeBase64(stateData);
    params.append('state', state);
    
    const redirectUrl = `${API_URL}/api/auth/google?${params.toString()}`;
    window.location.href = redirectUrl;
  }

  // Set tokens from callback
  setTokensFromCallback(accessToken: string, refreshToken: string): void {
    this.setTokens(accessToken, refreshToken);
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Staff API methods
  async getStaffList(restaurantId: string) {
    return this.request<BackendStaff[]>(`/api/staff/restaurant/${restaurantId}/staff-list`);
  }

  async createStaff(restaurantId: string, data: { name: string; email: string; role: string; phone?: string; avatarUrl?: string }) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStaff(restaurantId: string, staffId: string, data: { name?: string; email?: string; role?: string; phone?: string; avatarUrl?: string; status?: string }) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createDeviceRegistrationCode(restaurantId: string, staffId: string, label?: string) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/device-registration-codes`, {
      method: 'POST',
      body: JSON.stringify({ staffId, label }),
    });
  }

  async getDeviceTokens(restaurantId: string) {
    return this.request<any[]>(`/api/staff/restaurant/${restaurantId}/device-tokens`);
  }

  async revokeDeviceToken(restaurantId: string, deviceTokenId: string) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/device-tokens/${deviceTokenId}/revoke`, {
      method: 'POST',
    });
  }

  async redeemDeviceRegistrationCode(code: string, deviceId: string, label?: string) {
    return this.request<any>('/api/auth/device/redeem', {
      method: 'POST',
      body: JSON.stringify({ code, deviceId, label }),
    });
  }

  async deleteStaff(restaurantId: string, staffId: string) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/staff/${staffId}`, {
      method: 'DELETE',
    });
  }

  // Restaurant API methods
  async getRestaurant(id: string) {
    return this.request<any>(`/api/admin/restaurants/${id}`);
  }

  async getMyRestaurant(restaurantId?: string) {
    const url = restaurantId 
      ? `/api/staff/my-restaurant?restaurantId=${restaurantId}`
      : '/api/staff/my-restaurant';
    return this.request<BackendRestaurant>(url);
  }

  // Payment Methods API
  async getPaymentMethods() {
    return this.request<any>('/api/staff/payment-methods');
  }

  async updatePaymentMethods(data: {
    cash: { enabled: boolean };
    card: { enabled: boolean };
    bankTransfer: {
      enabled: boolean;
      bankName?: string;
      accountHolder?: string;
      accountNumber?: string;
    };
  }) {
    return this.request<any>('/api/staff/payment-methods', {
      method: 'PUT',
      body: JSON.stringify({ paymentMethods: data }),
    });
  }

  // Customer API methods (for staff order entry)
  async createSession(restaurantId: string, tableId: string, guestCount?: number) {
    return this.request<any>('/api/customer/session', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId,
        tableId,
        guestCount: guestCount || 1,
      }),
    });
  }

  // Waiting List API methods
  async getWaitingList(restaurantId: string) {
    return this.request<BackendWaitingEntry[]>(`/api/staff/waiting-list?restaurantId=${restaurantId}`);
  }

  async addToWaitingList(restaurantId: string, data: {
    name: string;
    phone: string;
    guestCount?: number;
    note?: string;
  }) {
    return this.request<any>('/api/staff/waiting-list', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId,
        ...data,
      }),
    });
  }

  async updateWaitingListStatus(waitingListId: string, status: 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED') {
    return this.request<any>(`/api/staff/waiting-list/${waitingListId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async createOrder(sessionId: string, tableId: string, restaurantId: string, items: Array<{
    menuItemId: string;
    quantity: number;
    options?: Array<{
      optionId: string;
      quantity: number;
    }>;
    notes?: string[];
  }>) {
    return this.request<any>('/api/customer/orders', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        tableId,
        restaurantId,
        items,
      }),
    });
  }

  // Tables API
  async getTables(restaurantId: string) {
    return this.request<BackendTable[]>(`/api/staff/tables?restaurantId=${restaurantId}`);
  }

  async createTable(restaurantId: string, data: { tableNumber: number; floor: number; capacity: number }) {
    return this.request<any>(`/api/staff/tables?restaurantId=${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTable(restaurantId: string, tableId: string, data: { tableNumber?: number; floor?: number; capacity?: number; isActive?: boolean }) {
    return this.request<any>(`/api/staff/tables/${tableId}/info?restaurantId=${restaurantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTable(restaurantId: string, tableId: string) {
    return this.request<any>(`/api/staff/tables/${tableId}?restaurantId=${restaurantId}`, {
      method: 'DELETE',
    });
  }

  async updateTableStatus(tableId: string, status: string) {
    return this.request<any>(`/api/staff/tables/${tableId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async resetTable(tableId: string) {
    return this.request<any>(`/api/staff/tables/${tableId}/reset`, {
      method: 'PUT',
    });
  }

  async updateTableGuestCount(tableId: string, restaurantId: string, guestCount: number) {
    return this.request<any>(`/api/staff/tables/${tableId}/guests?restaurantId=${restaurantId}&guestCount=${guestCount}`, {
      method: 'PUT',
    });
  }

  // Orders API
  async getOrders(restaurantId: string, filters?: { status?: string; tableId?: string }) {
    const params = new URLSearchParams({ restaurantId });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tableId) params.append('tableId', filters.tableId);
    return this.request<BackendOrder[]>(`/api/staff/orders?${params.toString()}`);
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request<any>(`/api/staff/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Menu API
  async getMenu(restaurantId: string) {
    return this.request<BackendMenuCategory[]>(`/api/staff/menu?restaurantId=${restaurantId}`);
  }

  async createMenuItem(restaurantId: string, data: any) {
    return this.request<any>(`/api/staff/menu?restaurantId=${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMenuItem(restaurantId: string, itemId: string, data: any) {
    return this.request<any>(`/api/staff/menu/${itemId}?restaurantId=${restaurantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMenuItem(restaurantId: string, itemId: string) {
    return this.request<any>(`/api/staff/menu/${itemId}?restaurantId=${restaurantId}`, {
      method: 'DELETE',
    });
  }

  async createCategory(restaurantId: string, data: { nameKo: string; nameVn: string; nameEn?: string; nameZh?: string; nameRu?: string; displayOrder: number }) {
    return this.request<any>(`/api/staff/menu/categories?restaurantId=${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(restaurantId: string, categoryId: string, data: { nameKo?: string; nameVn?: string; nameEn?: string; nameZh?: string; nameRu?: string; displayOrder?: number }) {
    return this.request<any>(`/api/staff/menu/categories/${categoryId}?restaurantId=${restaurantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(restaurantId: string, categoryId: string) {
    return this.request<any>(`/api/staff/menu/categories/${categoryId}?restaurantId=${restaurantId}`, {
      method: 'DELETE',
    });
  }

  // Public API methods (no authentication required)
  async getRestaurantPublic(restaurantId?: string) {
    // 서브도메인 기반인 경우 restaurantId 없이 호출 (백엔드에서 서브도메인으로 식당 조회)
    if (!restaurantId) {
      return this.request<any>(`/api/public/restaurant`);
    }
    return this.request<any>(`/api/public/restaurant/${restaurantId}`);
  }

  // Generate QR code for bank transfer
  async generateQRCode(data: {
    bankId: string;
    accountNo: string;
    accountName?: string;
    amount?: number;
    memo?: string;
  }) {
    return this.request<any>('/api/staff/generate-qr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get list of banks (public endpoint)
  async getBanks() {
    return this.request<Array<{
      id: number;
      name: string;
      code: string;
      shortName: string;
      logo: string | null;
      swiftCode: string | null;
      bin: string;
    }>>('/api/public/banks');
  }

  // Get sales report
  async getSalesReport(
    restaurantId: string, 
    period: 'today' | 'week' | 'month' = 'today', 
    language: 'ko' | 'vn' | 'en' = 'ko',
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams({
      restaurantId,
      period,
      language,
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.request<BackendSalesReport>(`/api/staff/reports/sales?${params.toString()}`);
  }

  // Get sales history (detailed order list)
  async getSalesHistory(
    restaurantId: string, 
    period: 'today' | 'week' | 'month' = 'today', 
    language: 'ko' | 'vn' | 'en' = 'ko',
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams({
      restaurantId,
      period,
      language,
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.request<BackendSalesHistoryEntry[]>(`/api/staff/reports/sales-history?${params.toString()}`);
  }

  // Notification methods
  async getNotifications(limit: number = 50) {
    return this.request<BackendNotification[]>(`/api/staff/notifications?limit=${limit}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request<void>(`/api/staff/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead() {
    return this.request<void>('/api/staff/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  async getUnreadNotificationCount() {
    return this.request<number>('/api/staff/notifications/unread-count');
  }

  async getNotificationPreferences(restaurantId?: string) {
    const params = new URLSearchParams();
    if (restaurantId) {
      params.append('restaurantId', restaurantId);
    }
    const query = params.toString();
    return this.request<{ soundEnabled: boolean }>(`/api/staff/notification-preferences${query ? `?${query}` : ''}`);
  }

  async updateNotificationPreferences(restaurantId: string, soundEnabled: boolean) {
    return this.request<{ soundEnabled: boolean }>(`/api/staff/notification-preferences?restaurantId=${encodeURIComponent(restaurantId)}`, {
      method: 'PUT',
      body: JSON.stringify({ soundEnabled }),
    });
  }

  // Web Push methods
  async getVapidPublicKey() {
    return this.request<{ publicKey: string }>(`/api/staff/push/vapid-public-key`);
  }

  async subscribePush(restaurantId: string, subscription: any) {
    return this.request(`/api/staff/push/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ restaurantId, subscription }),
    });
  }

  async unsubscribePush(endpoint: string) {
    return this.request(`/api/staff/push/unsubscribe`, {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  }

  // Chat API
  async getChatHistory(sessionId: string) {
    return this.request<BackendChatMessage[]>(`/api/staff/chat/${sessionId}`);
  }

  async getChatReadStatus(sessionIds: string[]) {
    const params = new URLSearchParams();
    params.append('sessionIds', sessionIds.join(','));
    return this.request<Record<string, string>>(`/api/staff/chat/read-status?${params.toString()}`);
  }

  async markChatRead(sessionId: string, lastReadMessageId: string) {
    return this.request<boolean>(`/api/staff/chat/${sessionId}/read`, {
      method: 'POST',
      body: JSON.stringify({ lastReadMessageId }),
    });
  }

  async sendMessage(data: {
    sessionId: string;
    senderType: 'USER' | 'STAFF' | 'SYSTEM';
    textKo?: string;
    textVn?: string;
    textEn?: string;
    textZh?: string;
    textRu?: string;
    messageType: 'TEXT' | 'ORDER' | 'REQUEST' | 'IMAGE';
    imageUrl?: string;
    metadata?: any;
  }) {
    return this.request('/api/staff/chat', {
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

  // Quick Chip management (staff API)
  async getQuickChipTemplates(type?: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE', includeInactive: boolean = false) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (includeInactive) params.append('includeInactive', 'true');
    const queryString = params.toString();
    return this.request<Array<{
      id: string;
      restaurantId: string | null;
      type: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';
      templateKey?: string | null;
      icon: string;
      labelKo: string;
      labelVn: string;
      labelEn?: string;
      labelZh?: string;
      messageKo?: string;
      messageVn?: string;
      messageEn?: string;
      messageZh?: string;
      displayOrder: number;
      isActive: boolean;
    }>>(`/api/staff/quick-chips/templates${queryString ? `?${queryString}` : ''}`);
  }

  async getRestaurantQuickChips(restaurantId: string, type?: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE', includeInactive: boolean = true) {
    const params = new URLSearchParams();
    params.append('restaurantId', restaurantId);
    if (type) params.append('type', type);
    if (includeInactive) params.append('includeInactive', 'true');
    return this.request<Array<{
      id: string;
      restaurantId: string | null;
      type: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';
      templateKey?: string | null;
      icon: string;
      labelKo: string;
      labelVn: string;
      labelEn?: string;
      labelZh?: string;
      messageKo?: string;
      messageVn?: string;
      messageEn?: string;
      messageZh?: string;
      displayOrder: number;
      isActive: boolean;
    }>>(`/api/staff/quick-chips?${params.toString()}`);
  }

  async createRestaurantQuickChip(data: {
    restaurantId: string;
    type: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';
    templateKey?: string;
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
    messageRu?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    return this.request('/api/staff/quick-chips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRestaurantQuickChip(
    id: string,
    restaurantId: string,
    data: {
      templateKey?: string;
      icon?: string;
      labelKo?: string;
      labelVn?: string;
      labelEn?: string;
      labelZh?: string;
      labelRu?: string;
      messageKo?: string;
      messageVn?: string;
      messageEn?: string;
      messageZh?: string;
      messageRu?: string;
      displayOrder?: number;
      isActive?: boolean;
    }
  ) {
    return this.request(`/api/staff/quick-chips/${id}?restaurantId=${encodeURIComponent(restaurantId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRestaurantQuickChip(id: string, restaurantId: string) {
    return this.request(`/api/staff/quick-chips/${id}?restaurantId=${encodeURIComponent(restaurantId)}`, {
      method: 'DELETE',
    });
  }

  async reorderRestaurantQuickChips(restaurantId: string, ids: string[]) {
    return this.request(`/api/staff/quick-chips/reorder?restaurantId=${encodeURIComponent(restaurantId)}`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // Promotion methods
  async getPromotions(restaurantId: string) {
    return this.request<BackendPromotion[]>(`/api/staff/restaurant/${restaurantId}/promotions`);
  }

  async createPromotion(restaurantId: string, data: {
    titleKo: string;
    titleVn: string;
    titleEn?: string;
    titleZh?: string;
    titleRu?: string;
    descriptionKo?: string;
    descriptionVn?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionRu?: string;
    imageUrl?: string;
    discountPercent?: number;
    startDate: string;
    endDate: string;
    displayOrder?: number;
    isActive?: boolean;
    showOnLoad?: boolean;
    menuItemIds?: string[];
  }) {
    return this.request<BackendPromotion>(`/api/staff/restaurant/${restaurantId}/promotions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePromotion(restaurantId: string, promotionId: string, data: {
    titleKo?: string;
    titleVn?: string;
    titleEn?: string;
    titleZh?: string;
    titleRu?: string;
    descriptionKo?: string;
    descriptionVn?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionRu?: string;
    imageUrl?: string;
    discountPercent?: number;
    startDate?: string;
    endDate?: string;
    displayOrder?: number;
    isActive?: boolean;
    showOnLoad?: boolean;
    menuItemIds?: string[];
  }) {
    return this.request<BackendPromotion>(`/api/staff/restaurant/${restaurantId}/promotions/${promotionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePromotion(restaurantId: string, promotionId: string) {
    return this.request(`/api/staff/restaurant/${restaurantId}/promotions/${promotionId}`, {
      method: 'DELETE',
    });
  }

  // Splash image methods
  async uploadSplashImage(restaurantId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = this.getAuthToken();
    const endpoint = `/api/staff/restaurant/${restaurantId}/splash-image`;
    
    // Use the same URL generation logic as request() method
    const getRequestUrl = (): string => {
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        const normalized = normalizeApiBaseUrl(envUrl);
        const hostWithoutPort = window.location.host.split(':')[0];
        const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
        const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
        const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
        if (isLocalSubdomain) {
          return endpoint;
        }
        if (!isLocalhost && !isLocalSubdomain && isEnvLocalhost) {
          return endpoint;
        }
        return joinUrl(normalized, endpoint);
      }
      
      // Runtime subdomain check
      if (typeof window !== 'undefined') {
        const host = window.location.host;
        if (host.includes('.localhost:') || host.match(/^shop_\d+\.localhost:/)) {
          return endpoint; // 상대 경로
        }
      }
      
      return joinUrl('http://localhost:3000', endpoint);
    };
    
    const url = getRequestUrl();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Note: Don't set Content-Type header for FormData - browser will set it automatically with boundary
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteSplashImage(restaurantId: string) {
    return this.request(`/api/staff/restaurant/${restaurantId}/splash-image`, {
      method: 'DELETE',
    });
  }

  // Promotion image methods
  async uploadPromotionImage(restaurantId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = this.getAuthToken();
    const endpoint = `/api/staff/restaurant/${restaurantId}/promotion-image`;
    
    // Use the same URL generation logic as request() method
    const getRequestUrl = (): string => {
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        const normalized = normalizeApiBaseUrl(envUrl);
        const hostWithoutPort = window.location.host.split(':')[0];
        const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
        const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
        const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
        if (isLocalSubdomain) {
          return endpoint;
        }
        if (!isLocalhost && !isLocalSubdomain && isEnvLocalhost) {
          return endpoint;
        }
        return joinUrl(normalized, endpoint);
      }
      
      // Runtime subdomain check
      if (typeof window !== 'undefined') {
        const host = window.location.host;
        if (host.includes('.localhost:') || host.match(/^shop_\d+\.localhost:/)) {
          return endpoint; // 상대 경로
        }
      }
      
      return joinUrl('http://localhost:3000', endpoint);
    };
    
    const url = getRequestUrl();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Note: Don't set Content-Type header for FormData - browser will set it automatically with boundary
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Translation methods
  async detectLanguage(text: string): Promise<ApiResponse<{ language: string }>> {
    return this.request('/api/staff/translate/detect', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async translateText(
    text: string,
    targetLang: string,
    sourceLang?: string
  ): Promise<ApiResponse<{ translated: string }>> {
    return this.request('/api/staff/translate', {
      method: 'POST',
      body: JSON.stringify({ text, targetLang, sourceLang }),
    });
  }

  async translateToAllLanguages(
    text: string,
    sourceLang: string
  ): Promise<ApiResponse<{ translations: Record<string, string> }>> {
    return this.request('/api/staff/translate/all', {
      method: 'POST',
      body: JSON.stringify({ text, sourceLang }),
    });
  }
}

export const apiClient = new ApiClient();
