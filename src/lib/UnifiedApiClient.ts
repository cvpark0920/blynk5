const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

class UnifiedApiClient {
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
        this.setTokens(result.data.accessToken, refreshToken);
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
    return this.request<{
      id: string;
      email: string;
      role: string;
      name?: string | null;
      avatarUrl?: string | null;
      createdAt: string;
      staff?: {
        id: string;
        name: string;
        email: string;
        role: string;
        avatarUrl?: string | null;
        phone?: string | null;
        restaurantId: string;
      };
    }>('/api/auth/me');
  }

  async logout() {
    const result = await this.request('/api/auth/logout', {
      method: 'POST',
    });
    this.clearTokens();
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

  // Google OAuth redirect (Admin)
  googleAuthAdmin() {
    const appType = 'admin';
    window.location.href = `${API_URL}/api/auth/google?appType=${appType}`;
  }

  // Google OAuth redirect (Shop)
  googleAuthShop(restaurantId?: string) {
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
      localStorage.setItem('unified_appType', 'shop');
    }

    return result;
  }
}

export const unifiedApiClient = new UnifiedApiClient();
