import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSubdomain, isReservedSubdomain } from '../utils/subdomain';

// 서브도메인 기반일 때는 상대 경로 사용, 그렇지 않으면 절대 URL 사용
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    const hostWithoutPort = host.split(':')[0];
    const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
    const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
    
    // 서브도메인 기반인 경우 (예: okchiken7.localhost) 항상 상대 경로 사용
    if (isLocalSubdomain || (!isLocalhost && hostWithoutPort.includes('.'))) {
      const subdomain = hostWithoutPort.split('.')[0];
      const isReserved = ['api', 'admin', 'www'].includes(subdomain);
      if (!isReserved) {
        console.log('🔵 [getApiBaseUrl] Subdomain-based, using relative path');
        return ''; // 상대 경로 - 같은 origin 사용
      }
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const normalized = envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const hostWithoutPort = window.location.host.split(':')[0];
      const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
      const isLocalSubdomain = hostWithoutPort.endsWith('.localhost');
      const isEnvLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
      if (!isLocalhost && !isLocalSubdomain && isEnvLocalhost) {
        console.warn('⚠️ [getApiBaseUrl] Ignoring localhost VITE_API_URL on non-local host:', normalized);
        return '';
      }
    }
    console.log('🔵 [getApiBaseUrl] Using VITE_API_URL:', normalized);
    return normalized;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.host;
    const hostWithoutPort = host.split(':')[0];
    const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
    
    // 운영 도메인 또는 로컬 서브도메인이면 같은 origin 사용
    if (!isLocalhost) {
      console.log('🔵 [getApiBaseUrl] Returning empty string (relative path)');
      return ''; // 상대 경로
    }
  }

  console.log('🔵 [getApiBaseUrl] Returning http://localhost:3000');
  return 'http://localhost:3000';
};

const API_URL = getApiBaseUrl();

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

const clearUnifiedTokens = (): void => {
  localStorage.removeItem('unified_accessToken');
  localStorage.removeItem('unified_refreshToken');
  localStorage.removeItem('unified_appType');
  localStorage.removeItem('unified_shopRestaurantId');
};

const clearDeviceTokens = (): void => {
  localStorage.removeItem('device_token');
  localStorage.removeItem('device_id');
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

  // 런타임에 동적으로 API URL 결정 (서브도메인 유지)
  const apiBaseUrl = getApiBaseUrl();
  const fullUrl = `${apiBaseUrl}${endpoint}`;
  console.log('🔵 [apiRequest] Making request to:', fullUrl, 'from host:', typeof window !== 'undefined' ? window.location.host : 'N/A');

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (response.status === 401 && token) {
      // Try to refresh token
      const refreshToken = getUnifiedToken('refreshToken');
      if (refreshToken) {
        const refreshResponse = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success && refreshResult.data?.accessToken) {
            setUnifiedTokens(refreshResult.data.accessToken, refreshToken);
            headers['Authorization'] = `Bearer ${refreshResult.data.accessToken}`;
            const retryResponse = await fetch(`${apiBaseUrl}${endpoint}`, {
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
  console.log('🔵 UnifiedAuthProvider component rendered');
  console.log('🔵 About to call useLocation()');
  let location, navigate;
  try {
    location = useLocation();
    console.log('🔵 useLocation() called successfully, pathname:', location.pathname);
    navigate = useNavigate();
    console.log('🔵 useNavigate() called successfully');
  } catch (error) {
    console.error('🔴 UnifiedAuthProvider: Router hook error:', error);
    throw error;
  }
  
  // Admin state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  
  // Shop state
  const [shopUser, setShopUser] = useState<ShopStaff | null>(null);
  const [shopRestaurantId, setShopRestaurantId] = useState<string | null>(null);
  const [shopRestaurantName, setShopRestaurantName] = useState<string | null>(null);
  const [shopStaffList, setShopStaffList] = useState<ShopStaff[]>([]);
  const [shopUserRole, setShopUserRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | null>(null);
  const [shopOwnerInfo, setShopOwnerInfo] = useState<ShopOwnerInfo | null>(null);

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
    // 함수 시작 시점에 urlRestaurantId를 함수 스코프 상단에서 정의 (스코프 문제 해결)
    // 서브도메인 기반일 때는 URL에서 restaurantId를 추출하지 않음
    let urlRestaurantId: string | null = null;
    const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
    if (urlMatch) {
      urlRestaurantId = urlMatch[1];
    }
    
    console.log('🔄 [refreshShopUser] START', {
      shopRestaurantId,
      pathname: location.pathname,
      urlRestaurantId,
      hasToken: !!getUnifiedToken('accessToken')
    });
    
    if (!getUnifiedToken('accessToken')) {
      console.log('❌ [refreshShopUser] No access token found, skipping');
      return;
    }

    try {
      console.log('📞 [refreshShopUser] Calling /api/auth/me...');
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

      console.log('📥 [refreshShopUser] API response:', result);

      if (result.success && result.data) {
        const data = result.data;
        console.log('👤 [refreshShopUser] User data:', { 
          role: data.role, 
          ownerRestaurantId: data.ownerRestaurantId, 
          hasStaff: !!data.staff,
          currentShopRestaurantId: shopRestaurantId,
          urlRestaurantId 
        });
        
        // Check if this is a PIN login (has staff data)
        if (data.staff) {
          console.log('✅ [refreshShopUser] PIN login detected');
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
            console.log('🏪 [refreshShopUser] Setting restaurantId from staff:', staff.restaurantId);
            setShopRestaurantId(staff.restaurantId);
            // Load restaurant name
            try {
              const restaurantResult = await apiRequest<any>(`/api/staff/my-restaurant?restaurantId=${staff.restaurantId}`);
              if (restaurantResult.success && restaurantResult.data) {
                const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || null;
                setShopRestaurantName(restaurantName);
              }
            } catch (error) {
              console.error('❌ [refreshShopUser] Failed to get restaurant:', error);
            }
          }
        } else if (data.role === 'ADMIN') {
          console.log('👑 [refreshShopUser] ADMIN role detected, checking for restaurant ownership');
          
          // 서브도메인 기반일 때는 shopRestaurantId를 우선 사용
          const effectiveRestaurantId = shopRestaurantId || urlRestaurantId;
          console.log('🎯 [refreshShopUser] Effective restaurantId:', {
            shopRestaurantId,
            urlRestaurantId,
            effectiveRestaurantId
          });
          
          let userRestaurantId = data.ownerRestaurantId;
          console.log('👤 [refreshShopUser] Initial userRestaurantId from API:', userRestaurantId);
          
          // If ownerRestaurantId is not in response, try to get it from effectiveRestaurantId or API
          if (!userRestaurantId && effectiveRestaurantId) {
            try {
              console.log('🔍 [refreshShopUser] Trying to get restaurant info from effectiveRestaurantId:', effectiveRestaurantId);
              const restaurantResult = await apiRequest<any>(`/api/staff/my-restaurant?restaurantId=${effectiveRestaurantId}`);
              if (restaurantResult.success && restaurantResult.data) {
                userRestaurantId = restaurantResult.data.id;
                console.log('✅ [refreshShopUser] Found restaurant from effectiveRestaurantId:', userRestaurantId);
              }
            } catch (error) {
              console.error('❌ [refreshShopUser] Failed to get restaurant by effectiveRestaurantId:', error);
            }
          }
          
          // If still no restaurantId, use effectiveRestaurantId as fallback
          // This is a workaround for when backend doesn't return ownerRestaurantId
          if (!userRestaurantId && effectiveRestaurantId) {
            console.log('⚠️ [refreshShopUser] Using effectiveRestaurantId as fallback:', effectiveRestaurantId);
            userRestaurantId = effectiveRestaurantId;
          }
          
          console.log('🎯 [refreshShopUser] Final userRestaurantId:', userRestaurantId);
          
          if (userRestaurantId) {
            console.log('✅ [refreshShopUser] Setting shop user as OWNER with restaurantId:', userRestaurantId);
            setShopUserRole('OWNER');
            setShopOwnerInfo({
              name: data.name || data.email.split('@')[0],
              email: data.email,
              avatarUrl: data.avatarUrl || undefined,
            });
            setShopUser(null);
            setShopRestaurantId(userRestaurantId);
            
            // Try to load restaurant name, but don't fail if API returns 403
            // (user might not have access yet, but we'll set restaurantId anyway)
            try {
              console.log('🔍 [refreshShopUser] Loading restaurant name for:', userRestaurantId);
              const restaurantResult = await apiRequest<any>(`/api/staff/my-restaurant?restaurantId=${userRestaurantId}`);
              if (restaurantResult.success && restaurantResult.data) {
                const apiRestaurantId = restaurantResult.data.id;
                console.log('🔍 [refreshShopUser] API restaurantId:', apiRestaurantId, 'effectiveRestaurantId:', effectiveRestaurantId);
                
                // effectiveRestaurantId가 있고 API restaurantId와 다르면 에러
                if (effectiveRestaurantId && effectiveRestaurantId !== 'unknown' && apiRestaurantId !== effectiveRestaurantId) {
                  console.error('❌ [refreshShopUser] Restaurant ID mismatch!', {
                    apiRestaurantId,
                    effectiveRestaurantId,
                    urlRestaurantId
                  });
                  toast.error('이 식당에 대한 접근 권한이 없습니다.');
                  logoutShop();
                  // 서브도메인 기반이면 /shop/login으로, 아니면 기존 URL 형식으로
                  // urlRestaurantId는 함수 스코프 상단에서 정의되었으므로 사용 가능
                  const loginPath = urlRestaurantId ? `/shop/restaurant/${urlRestaurantId}/login` : '/shop/login';
                  console.log('🔄 [refreshShopUser] Redirecting to:', loginPath);
                  navigate(loginPath);
                  return;
                }
                setShopRestaurantId(apiRestaurantId);
                const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || null;
                setShopRestaurantName(restaurantName);
                console.log('✅ [refreshShopUser] Restaurant name set:', restaurantName);
              }
            } catch (error: any) {
              console.warn('⚠️ [refreshShopUser] Failed to get restaurant name (might be 403):', error);
              // Don't throw error - user might not have access yet, but we'll set restaurantId anyway
              // The API will handle authorization checks when user tries to access resources
            }
          } else {
            console.warn('⚠️ [refreshShopUser]', data.role, 'user but no restaurant found');
          }
        } else {
          console.log('ℹ️ [refreshShopUser] User role is not ADMIN and no staff data:', data.role);
        }
      } else {
        console.error('❌ [refreshShopUser] API request failed:', result.error);
      }
      
      console.log('✅ [refreshShopUser] END');
    } catch (error) {
      console.error('❌ [refreshShopUser] Exception:', error);
      throw error; // Re-throw to be caught by caller
    }
  }, [location.pathname, navigate, shopRestaurantId]);

  // Handle OAuth callback
  useEffect(() => {
    console.log('=== UnifiedAuthProvider useEffect triggered ===');
    console.log('pathname:', location.pathname);
    console.log('search:', location.search);
    console.log('hasToken in localStorage:', !!getUnifiedToken('accessToken'));
    
    const urlParams = new URLSearchParams(location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    const error = urlParams.get('error');
    const errorMessage = urlParams.get('errorMessage');
    
    console.log('accessToken from URL:', accessToken ? 'exists' : 'missing');
    console.log('refreshToken from URL:', refreshToken ? 'exists' : 'missing');
    console.log('error from URL:', error);
    console.log('errorMessage from URL:', errorMessage);

    // Handle OAuth error FIRST (before checking tokens)
    if (error || errorMessage) {
      console.error('❌ OAuth error detected:', error, errorMessage);
      const decodedMessage = errorMessage ? decodeURIComponent(errorMessage) : (error || '인증에 실패했습니다.');
      
      // Clear tokens if any
      clearUnifiedTokens();
      
      // Show error modal by dispatching custom event FIRST (before URL changes)
      // Use setTimeout to ensure the event is processed before URL cleanup
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('oauth-error', { 
          detail: { message: decodedMessage } 
        }));
      }, 0);
      
      // Navigate to login page if not already there
      if (location.pathname.startsWith('/shop')) {
        const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
        const urlRestaurantId = urlMatch ? urlMatch[1] : null;
        if (urlRestaurantId && urlRestaurantId !== 'unknown') {
          // Already on login page, delay URL cleanup to allow modal to show
          console.log('Already on login page, showing error modal');
          setTimeout(() => {
            const cleanPath = location.pathname;
            window.history.replaceState({}, '', cleanPath);
          }, 100);
        } else {
          navigate('/shop/login');
        }
      } else if (location.pathname.startsWith('/admin')) {
        navigate('/admin/login');
      } else {
        // Clear URL params after a delay to allow modal to show
        setTimeout(() => {
          const cleanPath = location.pathname;
          window.history.replaceState({}, '', cleanPath);
        }, 100);
      }
      
      return;
    }

    if (accessToken && refreshToken) {
      console.log('✅ OAuth callback detected, setting tokens');
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
        
        // 기존 PIN 로그인 세션 초기화 (OWNER 로그인 시 충돌 방지)
        console.log('🔄 [OAuth Callback] Clearing existing PIN login session (shopUser)');
        setShopUser(null);
        setShopUserRole(null);
        
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
          // 토큰은 이미 설정되었으므로 API 요청에 포함됨
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
        
        // 서브도메인이 없고 URL에도 restaurantId가 없으면, 서브도메인을 다시 확인
        // (백엔드에서 서브도메인 기반으로 리다이렉트했지만 브라우저가 서브도메인을 잃었을 수 있음)
        if (!urlRestaurantId || urlRestaurantId === 'unknown') {
          const currentSubdomain = getSubdomain();
          if (currentSubdomain && !isReservedSubdomain(currentSubdomain)) {
            // 서브도메인이 있으면 다시 시도
            console.log('🔄 [OAuth Callback] Retrying with subdomain:', currentSubdomain);
            const apiUrl = API_URL || '';
            const fetchUrl = `${apiUrl}/api/public/restaurant`;
            console.log('🔄 [OAuth Callback] Retry API URL:', fetchUrl);
            fetch(fetchUrl)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
              })
              .then(res => {
                console.log('🔄 [OAuth Callback] Retry response status:', res.status);
                if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
              })
              .then(data => {
                console.log('🔄 [OAuth Callback] Retry response data:', data);
                if (data.success && data.data) {
                  const fetchedRestaurantId = data.data.id;
                  console.log('✅ [OAuth Callback] Restaurant fetched (retry):', fetchedRestaurantId);
                  setShopRestaurantId(fetchedRestaurantId);
                  window.history.replaceState({}, '', '/shop');
                  refreshShopUser().then(() => {
                    console.log('✅ [OAuth Callback] refreshShopUser completed (retry)');
                    toast.success('Successfully logged in');
                  }).catch((error) => {
                    console.error('❌ [OAuth Callback] Auth callback error (retry):', error);
                    toast.error('Authentication failed');
                  });
                } else {
                  console.error('❌ [OAuth Callback] Invalid retry response data:', data);
                  throw new Error('Failed to fetch restaurant: invalid response');
                }
              })
              .catch(err => {
                console.error('❌ [OAuth Callback] Failed to fetch restaurant (retry):', err);
                console.error('❌ [OAuth Callback] Subdomain:', currentSubdomain, 'Host:', host);
                toast.error(`식당을 찾을 수 없습니다. (서브도메인: ${currentSubdomain || '없음'})`);
                clearUnifiedTokens();
                navigate('/shop/login');
              });
            return;
          }
          
          console.error('❌ [OAuth Callback] No valid restaurantId found', {
            pathname: location.pathname,
            subdomain: currentSubdomain,
            host
          });
          toast.error(`식당 ID가 필요합니다. (서브도메인: ${currentSubdomain || '없음'}, 경로: ${location.pathname})`);
          clearUnifiedTokens();
          navigate('/shop/login');
          return;
        }
        
        // Set restaurantId immediately before clearing URL params
        setShopRestaurantId(urlRestaurantId);
        
        // Clear URL params but preserve restaurantId path
        const newPath = `/shop/restaurant/${urlRestaurantId}/dashboard`;
        console.log('Clearing URL params, navigating to:', newPath);
        window.history.replaceState({}, '', newPath);
        
        console.log('🔄 Calling refreshShopUser after OAuth callback');
        refreshShopUser().then(() => {
          console.log('✅ refreshShopUser completed successfully');
          toast.success('Successfully logged in');
        }).catch((error) => {
          console.error('❌ Auth callback error:', error);
          toast.error('Authentication failed');
        });
      }
    } else if (getUnifiedToken('accessToken')) {
      console.log('✅ Existing token found in localStorage, checking authentication');
      // Check existing authentication
      let appType = localStorage.getItem('unified_appType');
      console.log('App type from localStorage:', appType);
      
      // 경로 기반으로 appType 추론 (localStorage에 없을 경우)
      if (!appType) {
        if (location.pathname.startsWith('/admin')) {
          appType = 'admin';
          setAppType('admin');
        } else if (location.pathname.startsWith('/shop')) {
          appType = 'shop';
          setAppType('shop');
        }
      }
      
      // If path is /shop, always refresh shop user (even if appType is not set)
      if (location.pathname.startsWith('/shop')) {
        console.log('🔄 Shop path detected, refreshing shop user');
        setAppType('shop');
        
        // 서브도메인 기반인지 확인
        const subdomain = getSubdomain();
        const useSubdomain = subdomain && !isReservedSubdomain(subdomain);
        
        // 서브도메인 기반이고 shopRestaurantId가 없으면 백엔드에서 가져오기
        if (useSubdomain && !shopRestaurantId) {
          console.log('🔄 Fetching restaurantId from subdomain...');
          fetch('/api/public/restaurant')
            .then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })
            .then(data => {
              if (data.success && data.data) {
                console.log('Restaurant fetched from subdomain in UnifiedAuthContext:', data.data);
                setShopRestaurantId(data.data.id);
                // restaurantId 설정 후 refreshShopUser 호출
                refreshShopUser().catch((error) => {
                  console.error('❌ Failed to refresh shop user:', error);
                });
              } else {
                throw new Error('Failed to fetch restaurant');
              }
            })
            .catch(err => {
              console.error('Failed to fetch restaurant from subdomain:', err);
              // restaurantId 없이도 refreshShopUser 시도 (백엔드에서 처리)
              refreshShopUser().catch((error) => {
                console.error('❌ Failed to refresh shop user:', error);
              });
            });
          return; // 서브도메인 기반일 때는 여기서 종료
        }
        
        // 기존 URL 형식: URL에서 restaurantId 추출
        const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
        const urlRestaurantId = urlMatch ? urlMatch[1] : null;
        if (!shopRestaurantId && urlRestaurantId && urlRestaurantId !== 'unknown') {
          console.log('Setting restaurantId from URL:', urlRestaurantId);
          setShopRestaurantId(urlRestaurantId);
        }
        
        refreshShopUser().catch((error) => {
          console.error('❌ Failed to refresh shop user:', error);
        });
      } else if (appType === 'admin' || location.pathname.startsWith('/admin')) {
        console.log('🔄 Refreshing admin user');
        setAppType('admin');
        refreshAdminUser();
      } else if (appType === 'shop') {
        console.log('🔄 Refreshing shop user');
        refreshShopUser().catch((error) => {
          console.error('❌ Failed to refresh shop user:', error);
        });
      } else {
        console.warn('⚠️ No app type found in localStorage and cannot infer from path');
      }
    } else {
      console.log('ℹ️ No tokens found in URL or localStorage');
    }
  }, [location.pathname, location.search, refreshAdminUser, refreshShopUser, navigate, shopRestaurantId]);

  // Login functions
  const loginAdmin = async () => {
    const appType = 'admin';
    const apiBaseUrl = getApiBaseUrl();
    // Google OAuth에 계정 선택 화면을 강제로 표시하도록 설정
    window.location.href = `${apiBaseUrl}/api/auth/google?appType=${appType}&prompt=select_account`;
  };

  const loginShop = async (restaurantId: string) => {
    const appType = 'shop';
    const subdomain = getSubdomain();
    const useSubdomain = subdomain && !isReservedSubdomain(subdomain);
    
    const params = new URLSearchParams({ appType });
    if (useSubdomain) {
      params.append('subdomain', subdomain);
      console.log('🔄 [loginShop] Using subdomain:', subdomain);
    } else {
      params.append('restaurantId', restaurantId);
      console.log('🔄 [loginShop] Using restaurantId:', restaurantId);
    }
    
    // Google OAuth에 계정 선택 화면을 강제로 표시하도록 설정
    // 로그아웃 후 다른 계정으로 로그인할 수 있도록 함
    params.append('prompt', 'select_account');
    
    const apiBaseUrl = getApiBaseUrl();
    const authUrl = `${apiBaseUrl}/api/auth/google?${params.toString()}`;
    console.log('🔄 [loginShop] Redirecting to:', authUrl);
    window.location.href = authUrl;
  };


  const logoutAdmin = async () => {
    // Clear client tokens first to avoid refresh race
    clearUnifiedTokens();
    clearDeviceTokens();
    setAdminUser(null);

    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    window.history.replaceState({}, '', '/admin/login');
    navigate('/admin/login', { replace: true });
    toast.success('Logged out successfully');
  };

  const logoutShop = async () => {
    // Clear client tokens first to avoid refresh race
    clearUnifiedTokens();
    clearDeviceTokens();
    setShopUser(null);
    setShopUserRole(null);
    setShopRestaurantId(null);
    setShopRestaurantName(null);
    setShopOwnerInfo(null);

    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    window.history.replaceState({}, '', '/shop/login');
    navigate('/shop/login', { replace: true });
    toast.success('Logged out successfully');
  };

  const refreshTokens = async () => {
    const refreshToken = getUnifiedToken('refreshToken');
    if (!refreshToken) return;

    try {
      // 런타임에 동적으로 API URL 결정 (서브도메인 유지)
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
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
