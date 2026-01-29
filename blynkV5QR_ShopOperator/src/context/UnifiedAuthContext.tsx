import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSubdomain, isReservedSubdomain } from '../../../src/utils/subdomain';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const normalized = envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const hostWithoutPort = window.location.host.split(':')[0];
      const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
      const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
      const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
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

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV || (typeof window !== 'undefined' && window.localStorage.getItem('shop_debug') === '1')) {
    console.log('[UnifiedAuth]', ...args);
  }
};

// Types
interface AdminUser {
  id: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'ADMIN';
  name?: string;
  avatarUrl?: string;
}

interface ShopStaff {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF' | 'KITCHEN' | 'HALL';
  status: 'active' | 'inactive' | 'pending';
  phone?: string;
  joinedAt: Date;
  avatarUrl?: string;
}

interface ShopOwnerInfo {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface UnifiedAuthContextType {
  // Admin 앱용
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  
  // Shop 앱용
  shopUser: ShopStaff | null;
  shopRestaurantId: string | null;
  shopRestaurantName: string | null;
  isShopAuthenticated: boolean;
  shopStaffList: ShopStaff[];
  shopUserRole: 'OWNER' | 'MANAGER' | 'STAFF' | null;
  shopOwnerInfo: ShopOwnerInfo | null;
  
  // 공통 함수
  loginAdmin: () => Promise<void>;
  loginShop: (restaurantId: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  logoutShop: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  
  // Shop 앱 전용
  setShopStaffList: React.Dispatch<React.SetStateAction<ShopStaff[]>>;
  setShopRestaurantId: React.Dispatch<React.SetStateAction<string | null>>;
  setShopRestaurantName: React.Dispatch<React.SetStateAction<string | null>>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

// Token management helpers
const getUnifiedToken = (key: 'accessToken' | 'refreshToken'): string | null => {
  return localStorage.getItem(`unified_${key}`);
};

const setUnifiedTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('unified_accessToken', accessToken);
  localStorage.setItem('unified_refreshToken', refreshToken);
};

const getDeviceToken = (): string | null => {
  return localStorage.getItem('device_token');
};

const getDeviceId = (): string | null => {
  return localStorage.getItem('device_id');
};

const clearDeviceToken = (): void => {
  localStorage.removeItem('device_token');
};

const clearUnifiedTokens = (): void => {
  localStorage.removeItem('unified_accessToken');
  localStorage.removeItem('unified_refreshToken');
  localStorage.removeItem('unified_appType');
  localStorage.removeItem('unified_shopRestaurantId');
};

const setAppType = (appType: 'admin' | 'shop' | null): void => {
  if (appType) {
    localStorage.setItem('unified_appType', appType);
  } else {
    localStorage.removeItem('unified_appType');
  }
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: { message: string } }> {
  const token = getUnifiedToken('accessToken');
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

    if (response.status === 401 && token) {
      // Try to refresh token
      const refreshToken = getUnifiedToken('refreshToken');
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success && refreshResult.data?.accessToken) {
            setUnifiedTokens(refreshResult.data.accessToken, refreshToken);
            headers['Authorization'] = `Bearer ${refreshResult.data.accessToken}`;
            const retryResponse = await fetch(`${API_URL}${endpoint}`, {
              ...options,
              headers,
            });
            return retryResponse.json();
          }
        }
      }
      clearUnifiedTokens();
      throw new Error('Authentication failed');
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  debugLog('🔵 UnifiedAuthProvider component rendered');
  const location = useLocation();
  const navigate = useNavigate();
  
  // Admin state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  
  // Shop state
  const [shopUser, setShopUser] = useState<ShopStaff | null>(null);
  const [shopRestaurantId, setShopRestaurantId] = useState<string | null>(null);
  const [shopRestaurantName, setShopRestaurantName] = useState<string | null>(null);
  const [shopStaffList, setShopStaffList] = useState<ShopStaff[]>([]);
  const [shopUserRole, setShopUserRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | null>(null);
  const [shopOwnerInfo, setShopOwnerInfo] = useState<ShopOwnerInfo | null>(null);

  const exchangeDeviceToken = useCallback(async () => {
    const deviceToken = getDeviceToken();
    const deviceId = getDeviceId();
    if (!deviceToken || !deviceId) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken, deviceId }),
      });
      const result = await response.json();
      if (result.success && result.data?.accessToken && result.data?.refreshToken) {
        setUnifiedTokens(result.data.accessToken, result.data.refreshToken);
        setAppType('shop');
        return true;
      }
    } catch (error) {
      console.error('Failed to exchange device token:', error);
    }

    clearDeviceToken();
    return false;
  }, []);

  // Refresh admin user info
  const refreshAdminUser = useCallback(async () => {
    if (!getUnifiedToken('accessToken')) return;

    try {
      const result = await apiRequest<AdminUser>('/api/auth/me');
      if (result.success && result.data) {
        const role = result.data.role;
        if (role === 'PLATFORM_ADMIN' || role === 'ADMIN') {
          setAdminUser(result.data);
          setAppType('admin');
        } else {
          clearUnifiedTokens();
          setAdminUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to refresh admin user:', error);
      clearUnifiedTokens();
      setAdminUser(null);
    }
  }, []);

  // Refresh shop user info
  const refreshShopUser = useCallback(async () => {
    if (!getUnifiedToken('accessToken')) {
      debugLog('No access token found, skipping refreshShopUser');
      return;
    }

    try {
      debugLog('Calling /api/auth/me...');
      const result = await apiRequest<{
        id: string;
        email: string;
        role: string;
        name?: string | null;
        avatarUrl?: string | null;
        ownerRestaurantId?: string | null;
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

      debugLog('API response:', result);

      if (result.success && result.data) {
        const data = result.data;
        debugLog('User data:', { role: data.role, ownerRestaurantId: data.ownerRestaurantId, hasStaff: !!data.staff });
        
        // Check if this is a PIN login (has staff data)
        if (data.staff) {
          debugLog('PIN login detected');
          const staff = data.staff;
          const mappedStaff: ShopStaff = {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            role: staff.role.toLowerCase() as ShopStaff['role'],
            status: 'active',
            phone: staff.phone || '',
            joinedAt: new Date(),
            avatarUrl: staff.avatarUrl || '',
          };
          
          setShopUser(mappedStaff);
          setShopUserRole(staff.role as 'OWNER' | 'MANAGER' | 'STAFF');
          
          if (staff.restaurantId) {
            setShopRestaurantId(staff.restaurantId);
            // Load restaurant name
            try {
              const restaurantResult = await apiRequest<any>(`/api/staff/my-restaurant?restaurantId=${staff.restaurantId}`);
              if (restaurantResult.success && restaurantResult.data) {
                const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || null;
                setShopRestaurantName(restaurantName);
              }
            } catch (error) {
              console.error('Failed to get restaurant:', error);
            }
          }
        } else if (data.role === 'ADMIN') {
          debugLog('ADMIN role detected, checking for restaurant ownership');
          const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
          const urlRestaurantId = urlMatch ? urlMatch[1] : null;
          
          let userRestaurantId = data.ownerRestaurantId;
          
          // If ownerRestaurantId is not in response, try to get it from URL or API
          if (!userRestaurantId && urlRestaurantId) {
            try {
              debugLog('Trying to get restaurant info from URL:', urlRestaurantId);
              const restaurantResult = await apiRequest<any>(`/api/staff/my-restaurant?restaurantId=${urlRestaurantId}`);
              if (restaurantResult.success && restaurantResult.data) {
                userRestaurantId = restaurantResult.data.id;
                debugLog('Found restaurant from URL:', userRestaurantId);
              }
            } catch (error) {
              console.error('Failed to get restaurant by URL:', error);
            }
          }
          
          // If still no restaurantId, try to find restaurant by owner email
          if (!userRestaurantId) {
            try {
              debugLog('Trying to find restaurant by owner email:', data.email);
              // We need to check if this user is the owner of any restaurant
              // This requires a backend API endpoint, but for now we'll use the URL restaurantId
              if (urlRestaurantId) {
                userRestaurantId = urlRestaurantId;
              }
            } catch (error) {
              console.error('Failed to find restaurant by email:', error);
            }
          }
          
          if (userRestaurantId) {
            debugLog('Setting shop user as OWNER with restaurantId:', userRestaurantId);
            setShopUserRole('OWNER');
            setShopOwnerInfo({
              name: data.name || data.email.split('@')[0],
              email: data.email,
              avatarUrl: data.avatarUrl || undefined,
            });
            setShopUser(null);
            setShopRestaurantId(userRestaurantId);
            
            // Load restaurant name
            try {
              const restaurantResult = await apiRequest<any>(`/api/staff/my-restaurant?restaurantId=${userRestaurantId}`);
              if (restaurantResult.success && restaurantResult.data) {
                const apiRestaurantId = restaurantResult.data.id;
                if (urlRestaurantId && urlRestaurantId !== 'unknown' && apiRestaurantId !== urlRestaurantId) {
                  toast.error('이 식당에 대한 접근 권한이 없습니다.');
                  logoutShop();
                  navigate(`/shop/restaurant/${urlRestaurantId}/login`);
                  return;
                }
                setShopRestaurantId(apiRestaurantId);
                const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || null;
                setShopRestaurantName(restaurantName);
                debugLog('Restaurant name set:', restaurantName);
              }
            } catch (error) {
              console.error('Failed to get restaurant name:', error);
            }
          } else {
            console.warn(`${data.role} user but no restaurant found`);
          }
        } else {
          debugLog('User role is not ADMIN and no staff data:', data.role);
        }
      } else {
        console.error('API request failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to refresh shop user:', error);
      throw error; // Re-throw to be caught by caller
    }
  }, [location.pathname, navigate]);

  // Handle OAuth callback
  useEffect(() => {
    debugLog('=== UnifiedAuthProvider useEffect triggered ===');
    debugLog('pathname:', location.pathname);
    debugLog('search:', location.search);
    debugLog('hasToken in localStorage:', !!getUnifiedToken('accessToken'));
    
    const urlParams = new URLSearchParams(location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    
    debugLog('accessToken from URL:', accessToken ? 'exists' : 'missing');
    debugLog('refreshToken from URL:', refreshToken ? 'exists' : 'missing');

    if (accessToken && refreshToken) {
      debugLog('✅ OAuth callback detected, setting tokens');
      setUnifiedTokens(accessToken, refreshToken);
      
      // Determine app type from path
      if (location.pathname.startsWith('/admin')) {
        setAppType('admin');
        // Clear URL params
        window.history.replaceState({}, '', location.pathname);
        refreshAdminUser().then(() => {
          toast.success('Successfully logged in');
        }).catch((error) => {
          console.error('Auth callback error:', error);
          toast.error('Authentication failed');
        });
      } else if (location.pathname.startsWith('/shop')) {
        console.log('✅ [OAuth Callback] Shop app detected in OAuth callback');
        setAppType('shop');
        
        // 서브도메인 기반인지 확인
        const subdomain = getSubdomain();
        const useSubdomain = subdomain && !isReservedSubdomain(subdomain);
        const host = window.location.host;
        console.log('🔄 [OAuth Callback] Subdomain check:', { 
          subdomain, 
          useSubdomain, 
          host,
          pathname: location.pathname,
          search: location.search,
          reserved: subdomain ? isReservedSubdomain(subdomain) : false
        });
        
        // 서브도메인 기반일 때는 백엔드에서 restaurantId 가져오기
        if (useSubdomain) {
          console.log('🔄 [OAuth Callback] Fetching restaurantId from subdomain:', subdomain);
          const apiUrl = API_URL || '';
          const fetchUrl = `${apiUrl}/api/public/restaurant`;
          console.log('🔄 [OAuth Callback] API URL:', fetchUrl);
          
          fetch(fetchUrl)
            .then(res => {
              console.log('🔄 [OAuth Callback] Response status:', res.status);
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })
            .then(data => {
              console.log('🔄 [OAuth Callback] Response data:', data);
              if (data.success && data.data) {
                const fetchedRestaurantId = data.data.id;
                console.log('✅ [OAuth Callback] Restaurant fetched:', fetchedRestaurantId);
                setShopRestaurantId(fetchedRestaurantId);
                
                // Clear URL params for subdomain-based routing
                console.log('🔄 [OAuth Callback] Clearing URL params for subdomain-based routing');
                window.history.replaceState({}, '', '/shop');
                
                console.log('🔄 [OAuth Callback] Calling refreshShopUser');
                refreshShopUser().then(() => {
                  console.log('✅ [OAuth Callback] refreshShopUser completed successfully');
                  toast.success('Successfully logged in');
                }).catch((error) => {
                  console.error('❌ [OAuth Callback] Auth callback error:', error);
                  toast.error('Authentication failed');
                });
              } else {
                console.error('❌ [OAuth Callback] Invalid response data:', data);
                throw new Error('Failed to fetch restaurant: invalid response');
              }
            })
            .catch(err => {
              console.error('❌ [OAuth Callback] Failed to fetch restaurant from subdomain:', err);
              console.error('❌ [OAuth Callback] Subdomain:', subdomain, 'Host:', host);
              toast.error(`식당을 찾을 수 없습니다. (서브도메인: ${subdomain || '없음'})`);
              clearUnifiedTokens();
              navigate('/shop/login');
            });
          return; // 서브도메인 기반일 때는 여기서 종료
        }
        
        // 기존 URL 형식: URL에서 restaurantId 추출
        const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
        const urlRestaurantId = urlMatch ? urlMatch[1] : null;
        console.log('🔄 [OAuth Callback] URL-based extraction:', { 
          pathname: location.pathname, 
          urlRestaurantId,
          subdomain,
          useSubdomain
        });
        
        if (!urlRestaurantId || urlRestaurantId === 'unknown') {
          console.error('❌ [OAuth Callback] No valid restaurantId found', {
            pathname: location.pathname,
            subdomain,
            useSubdomain,
            host
          });
          toast.error(`식당 ID가 필요합니다. (서브도메인: ${subdomain || '없음'}, 경로: ${location.pathname})`);
          clearUnifiedTokens();
          navigate('/shop/restaurant/unknown/login');
          return;
        }
        
        // Set restaurantId immediately before clearing URL params
        setShopRestaurantId(urlRestaurantId);
        
        // Clear URL params but preserve restaurantId path
        const newPath = `/shop/restaurant/${urlRestaurantId}/dashboard`;
        debugLog('Clearing URL params, navigating to:', newPath);
        window.history.replaceState({}, '', newPath);
        
        debugLog('🔄 Calling refreshShopUser after OAuth callback');
        refreshShopUser().then(() => {
          debugLog('✅ refreshShopUser completed successfully');
          toast.success('Successfully logged in');
        }).catch((error) => {
          console.error('❌ Auth callback error:', error);
          toast.error('Authentication failed');
        });
      }
    } else if (getUnifiedToken('accessToken')) {
      debugLog('✅ Existing token found in localStorage, checking authentication');
      // Check existing authentication
      const appType = localStorage.getItem('unified_appType');
      debugLog('App type from localStorage:', appType);
      
      // If path is /shop, always refresh shop user (even if appType is not set)
      if (location.pathname.startsWith('/shop')) {
        debugLog('🔄 Shop path detected, refreshing shop user');
        setAppType('shop');
        
        // 서브도메인 기반인지 확인
        const subdomain = getSubdomain();
        const useSubdomain = subdomain && !isReservedSubdomain(subdomain);
        
        // 서브도메인 기반일 때는 백엔드에서 restaurantId 가져오기
        if (useSubdomain && !shopRestaurantId) {
          debugLog('🔄 Fetching restaurantId from subdomain for existing token...');
          fetch(`${API_URL || ''}/api/public/restaurant`)
            .then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })
            .then(data => {
              if (data.success && data.data) {
                const fetchedRestaurantId = data.data.id;
                debugLog('Restaurant fetched from subdomain:', fetchedRestaurantId);
                setShopRestaurantId(fetchedRestaurantId);
                refreshShopUser().catch((error) => {
                  console.error('❌ Failed to refresh shop user:', error);
                });
              } else {
                throw new Error('Failed to fetch restaurant');
              }
            })
            .catch(err => {
              console.error('Failed to fetch restaurant from subdomain:', err);
              refreshShopUser().catch((error) => {
                console.error('❌ Failed to refresh shop user:', error);
              });
            });
        } else {
          // 기존 URL 형식: URL에서 restaurantId 추출
          const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
          const urlRestaurantId = urlMatch ? urlMatch[1] : null;
          if (urlRestaurantId && urlRestaurantId !== shopRestaurantId) {
            debugLog('Setting restaurantId from URL:', urlRestaurantId);
            setShopRestaurantId(urlRestaurantId);
          }
          
          refreshShopUser().catch((error) => {
            console.error('❌ Failed to refresh shop user:', error);
          });
        }
      } else if (appType === 'admin') {
        debugLog('🔄 Refreshing admin user');
        refreshAdminUser();
      } else if (appType === 'shop') {
        debugLog('🔄 Refreshing shop user');
        refreshShopUser().catch((error) => {
          console.error('❌ Failed to refresh shop user:', error);
        });
      } else {
        console.warn('⚠️ No app type found in localStorage');
      }
    } else if (getDeviceToken() && getDeviceId()) {
      debugLog('🔄 Device token found, exchanging for session');
      exchangeDeviceToken().then((success) => {
        if (success) {
          setAppType('shop');
          refreshShopUser().catch((error) => {
            console.error('❌ Failed to refresh shop user:', error);
          });
        }
      });
    } else {
      debugLog('ℹ️ No tokens found in URL or localStorage');
    }
  }, [location.pathname, location.search, refreshAdminUser, refreshShopUser, navigate, exchangeDeviceToken]);

  // Login functions
  const loginAdmin = async () => {
    const appType = 'admin';
    window.location.href = `${API_URL}/api/auth/google?appType=${appType}`;
  };

  const loginShop = async (restaurantId: string) => {
    const appType = 'shop';
    const subdomain = getSubdomain();
    const params = new URLSearchParams({ appType, restaurantId });
    if (subdomain && !isReservedSubdomain(subdomain)) {
      params.append('subdomain', subdomain);
    }
    console.log('🔄 [loginShop] Redirecting to Google OAuth:', {
      url: `${API_URL}/api/auth/google?${params.toString()}`,
      restaurantId,
      subdomain
    });
    window.location.href = `${API_URL}/api/auth/google?${params.toString()}`;
  };


  const logoutAdmin = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    clearUnifiedTokens();
    setAdminUser(null);
    toast.success('Logged out successfully');
  };

  const logoutShop = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    clearUnifiedTokens();
    setShopUser(null);
    setShopUserRole(null);
    setShopRestaurantId(null);
    setShopRestaurantName(null);
    setShopOwnerInfo(null);
    toast.success('Logged out successfully');
  };

  const refreshTokens = async () => {
    const refreshToken = getUnifiedToken('refreshToken');
    if (!refreshToken) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.accessToken) {
          setUnifiedTokens(result.data.accessToken, refreshToken);
          window.dispatchEvent(new CustomEvent('tokenRefreshed'));
        }
      }
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
    }
  };

  // Calculate isShopAuthenticated - consider authenticated if:
  // 1. Has shopUser (PIN login) OR
  // 2. Has shopUserRole (Google login owner/admin) OR  
  // 3. Has token and shopRestaurantId (fallback for async state updates)
  const isShopAuthenticated = !!shopUser || !!shopUserRole || (!!getUnifiedToken('accessToken') && !!shopRestaurantId);

  return (
    <UnifiedAuthContext.Provider
      value={{
        adminUser,
        isAdminAuthenticated: !!adminUser,
        shopUser,
        shopRestaurantId,
        shopRestaurantName,
        isShopAuthenticated,
        shopStaffList,
        shopUserRole,
        shopOwnerInfo,
        loginAdmin,
        loginShop,
        logoutAdmin,
        logoutShop,
        refreshTokens,
        setShopStaffList,
        setShopRestaurantId,
        setShopRestaurantName,
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
}

export function useUnifiedAuth(): UnifiedAuthContextType {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth must be used within UnifiedAuthProvider');
  }
  return context;
}
