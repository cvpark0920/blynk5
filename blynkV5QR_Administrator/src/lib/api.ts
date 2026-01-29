// 서브도메인 기반일 때는 상대 경로 사용, 그렇지 않으면 절대 URL 사용
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
    const host = window.location.host;
    const hostWithoutPort = host.split(':')[0];
    const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
    const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');

    // 로컬 서브도메인이거나 운영 도메인이면 같은 origin 사용
    if (!isLocalhost || isLocalSubdomain) {
      return '';
    }
  }

  return 'http://localhost:3000';
};

export const API_URL = getApiBaseUrl();

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
        return parts[0]; // admin.localhost → admin
      }
    } else {
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 3) {
        return parts[0]; // admin.qoodle.top → admin
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
  }

  private async refreshAccessToken(): Promise<string | null> {
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
    return this.request<{
      id: string;
      email: string;
      role: string;
      createdAt: string;
    }>('/api/auth/me');
  }

  async logout() {
    const result = await this.request('/api/auth/logout', {
      method: 'POST',
    });
    this.clearTokens();
    return result;
  }

  // Google OAuth redirect
  googleAuth() {
    const appType = 'admin';
    const subdomain = this.getSubdomainFromHost();
    const state = this.encodeBase64({ 
      appType, 
      subdomain: subdomain || 'admin' // admin 앱은 기본값 'admin'
    });
    window.location.href = `${API_URL}/api/auth/google?appType=${appType}&state=${state}`;
  }

  // Set tokens from callback
  setTokensFromCallback(accessToken: string, refreshToken: string): void {
    this.setTokens(accessToken, refreshToken);
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Admin API methods
  async getRestaurants() {
    return this.request<any[]>('/api/admin/restaurants');
  }

  async getRestaurant(id: string) {
    return this.request<any>(`/api/admin/restaurants/${id}`);
  }

  async createRestaurant(data: any) {
    return this.request<any>('/api/admin/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRestaurant(id: string, data: any) {
    return this.request<any>(`/api/admin/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRestaurant(id: string) {
    return this.request(`/api/admin/restaurants/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadNotificationSound(restaurantId: string, file: File) {
    const token = this.getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/admin/restaurants/${restaurantId}/notification-sound`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    const result: ApiResponse<{ notificationSoundUrl: string }> = await response.json();
    return result;
  }

  async getTablesByRestaurant(restaurantId: string) {
    return this.request<any[]>(`/api/admin/restaurants/${restaurantId}/tables`);
  }

  // Category methods
  async getCategories() {
    return this.request<any[]>('/api/admin/categories');
  }

  async createCategory(data: { nameKo: string; nameVn: string; nameEn?: string }) {
    return this.request<any>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: { nameKo?: string; nameVn?: string; nameEn?: string }) {
    return this.request<any>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/api/admin/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Region methods
  async getRegions() {
    return this.request<any[]>('/api/admin/regions');
  }

  async createRegion(data: { nameKo: string; nameVn: string; nameEn?: string }) {
    return this.request<any>('/api/admin/regions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRegion(id: string, data: { nameKo?: string; nameVn?: string; nameEn?: string }) {
    return this.request<any>(`/api/admin/regions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRegion(id: string) {
    return this.request(`/api/admin/regions/${id}`, {
      method: 'DELETE',
    });
  }

  // Quick Chip methods
  async getQuickChips(restaurantId?: string | null, type?: string) {
    const params = new URLSearchParams();
    // restaurantId가 null이면 쿼리 파라미터에 포함하지 않음 (백엔드에서 null로 처리)
    // restaurantId가 undefined가 아닌 실제 값이면 포함
    if (restaurantId !== null && restaurantId !== undefined) {
      params.append('restaurantId', restaurantId);
    }
    if (type) params.append('type', type);
    const queryString = params.toString();
    return this.request<any[]>(`/api/admin/quick-chips${queryString ? `?${queryString}` : ''}`);
  }

  async getQuickChip(id: string) {
    return this.request<any>(`/api/admin/quick-chips/${id}`);
  }

  async createQuickChip(data: {
    restaurantId?: string | null;
    type: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';
    templateKey?: string;
    icon: string;
    labelKo: string;
    labelVn: string;
    labelEn?: string;
    messageKo?: string;
    messageVn?: string;
    messageEn?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    return this.request<any>('/api/admin/quick-chips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuickChip(id: string, data: {
    templateKey?: string;
    icon?: string;
    labelKo?: string;
    labelVn?: string;
    labelEn?: string;
    messageKo?: string;
    messageVn?: string;
    messageEn?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    return this.request<any>(`/api/admin/quick-chips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuickChip(id: string) {
    return this.request(`/api/admin/quick-chips/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderQuickChips(ids: string[]) {
    return this.request('/api/admin/quick-chips/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }
}

export const apiClient = new ApiClient();
