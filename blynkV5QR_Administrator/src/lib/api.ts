const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
        localStorage.setItem('accessToken', result.data.accessToken);
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
    window.location.href = `${API_URL}/api/auth/google?appType=${appType}`;
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
}

export const apiClient = new ApiClient();
