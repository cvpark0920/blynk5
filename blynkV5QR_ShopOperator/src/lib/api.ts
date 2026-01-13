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
} from '../app/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getSSEUrl = (endpoint: string, token?: string | null): string => {
  const url = `${API_URL}${endpoint}`;
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

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
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
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle token expiration
      if (response.status === 401 && token) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Retry with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
          });
          const result: ApiResponse<T> = await retryResponse.json();
          return result;
        } else {
          // Refresh failed, clear tokens
          this.clearTokens();
          window.location.href = '/';
          throw new Error('Authentication failed');
        }
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
    const params = new URLSearchParams({ appType });
    if (restaurantId) {
      params.append('restaurantId', restaurantId);
    }
    window.location.href = `${API_URL}/api/auth/google?${params.toString()}`;
  }

  // PIN login
  async loginWithPin(staffId: string, pinCode: string) {
    const result = await this.request<{
      user: { id: string; email: string; role: string };
      accessToken: string;
      refreshToken: string;
      restaurantId?: string;
    }>('/api/auth/pin', {
      method: 'POST',
      body: JSON.stringify({ staffId, pinCode }),
    });

    if (result.success && result.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
    }

    return result;
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

  async setStaffPin(restaurantId: string, staffId: string, pinCode: string) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/staff/${staffId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinCode }),
    });
  }

  async setPosPin(restaurantId: string, pinCode: string) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/pos-pin`, {
      method: 'POST',
      body: JSON.stringify({ pinCode }),
    });
  }

  async createStaff(restaurantId: string, data: { name: string; email: string; role: string; pinCode?: string; phone?: string; avatarUrl?: string }) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStaff(restaurantId: string, staffId: string, data: { name?: string; email?: string; role?: string; pinCode?: string; phone?: string; avatarUrl?: string; status?: string }) {
    return this.request<any>(`/api/staff/restaurant/${restaurantId}/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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

  async updateTable(restaurantId: string, tableId: string, data: { tableNumber?: number; floor?: number; capacity?: number }) {
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

  async createCategory(restaurantId: string, data: { nameKo: string; nameVn: string; nameEn?: string; displayOrder: number }) {
    return this.request<any>(`/api/staff/menu/categories?restaurantId=${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(restaurantId: string, categoryId: string, data: { nameKo?: string; nameVn?: string; nameEn?: string; displayOrder?: number }) {
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
  async getRestaurantPublic(restaurantId: string) {
    return this.request<any>(`/api/public/restaurant/${restaurantId}`);
  }

  async getStaffListPublic(restaurantId: string) {
    return this.request<any[]>(`/api/public/restaurant/${restaurantId}/staff-list`);
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

  // Chat API
  async getChatHistory(sessionId: string) {
    return this.request<BackendChatMessage[]>(`/api/staff/chat/${sessionId}`);
  }

  async sendMessage(data: {
    sessionId: string;
    senderType: 'USER' | 'STAFF' | 'SYSTEM';
    textKo?: string;
    textVn?: string;
    textEn?: string;
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
    icon: string;
    labelKo: string;
    labelVn: string;
    labelEn?: string;
    messageKo?: string;
    messageVn?: string;
    messageEn?: string;
    displayOrder: number;
    isActive: boolean;
  }>>> {
    const params = new URLSearchParams();
    if (restaurantId) params.append('restaurantId', restaurantId);
    if (type) params.append('type', type);
    return this.request(`/api/public/quick-chips?${params.toString()}`);
  }
}

export const apiClient = new ApiClient();
