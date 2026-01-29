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
      if (isLocalSubdomain) {
        return envHost !== currentHost ? normalized : '';
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
      return ''; // 상대 경로
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

class UnifiedApiClient {
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
    const subdomain = this.getSubdomainFromHost();
    const stateData = { 
      appType, 
      subdomain: subdomain || 'admin' // admin 앱은 기본값 'admin'
    };
    const state = this.encodeBase64(stateData);
    const redirectUrl = `${API_URL}/api/auth/google?appType=${appType}&state=${state}`;
    console.log('🔵 [UnifiedApiClient] Google Auth Admin', {
      currentHost: window.location.host,
      subdomain,
      stateData,
      redirectUrl,
    });
    window.location.href = redirectUrl;
  }

  // Google OAuth redirect (Shop)
  googleAuthShop(restaurantId?: string) {
    const appType = 'shop';
    const subdomain = this.getSubdomainFromHost();
    const params = new URLSearchParams({ appType });
    if (restaurantId) {
      params.append('restaurantId', restaurantId);
    }
    if (subdomain) {
      const stateData = { 
        appType, 
        restaurantId, 
        subdomain 
      };
      const state = this.encodeBase64(stateData);
      params.append('state', state);
      console.log('🔵 [UnifiedApiClient] Google Auth Shop', {
        currentHost: window.location.host,
        subdomain,
        restaurantId,
        stateData,
      });
    }
    const redirectUrl = `${API_URL}/api/auth/google?${params.toString()}`;
    console.log('🔵 [UnifiedApiClient] Redirect URL', { redirectUrl });
    window.location.href = redirectUrl;
  }

}

export const unifiedApiClient = new UnifiedApiClient();
