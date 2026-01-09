import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  pinCode?: string;
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
  loginShopWithPin: (restaurantId: string, staffId: string, pinCode: string) => Promise<void>;
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
    if (!getUnifiedToken('accessToken')) return;

    try {
      const result = await apiRequest<{
        id: string;
        email: string;
        role: string;
        name?: string | null;
        avatarUrl?: string | null;
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

      if (result.success && result.data) {
        const data = result.data;
        
        // Check if this is a PIN login (has staff data)
        if (data.staff) {
          const staff = data.staff;
          const mappedStaff: ShopStaff = {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            role: staff.role.toLowerCase() as ShopStaff['role'],
            status: 'active',
            pinCode: '',
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
        } else if (data.role === 'OWNER' || data.role === 'MANAGER') {
          // Google login (owner/admin)
          setShopUserRole('OWNER');
          setShopOwnerInfo({
            name: data.name || data.email.split('@')[0],
            email: data.email,
            avatarUrl: data.avatarUrl || undefined,
          });
          setShopUser(null);
          
          // Get restaurant info for owner/admin
          const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
          const urlRestaurantId = urlMatch ? urlMatch[1] : null;
          
          try {
            const restaurantResult = await apiRequest<any>(
              urlRestaurantId 
                ? `/api/staff/my-restaurant?restaurantId=${urlRestaurantId}`
                : '/api/staff/my-restaurant'
            );
            if (restaurantResult.success && restaurantResult.data) {
              const userRestaurantId = restaurantResult.data.id;
              if (urlRestaurantId && urlRestaurantId !== 'unknown' && userRestaurantId !== urlRestaurantId) {
                toast.error('이 식당에 대한 접근 권한이 없습니다.');
                logoutShop();
                navigate(`/shop/restaurant/${urlRestaurantId}/login`);
                return;
              }
              setShopRestaurantId(userRestaurantId);
              const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || null;
              setShopRestaurantName(restaurantName);
            }
          } catch (error) {
            console.error('Failed to get restaurant:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh shop user:', error);
    }
  }, [location.pathname, navigate]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');

    if (accessToken && refreshToken) {
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
        setAppType('shop');
        const urlMatch = location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
        const urlRestaurantId = urlMatch ? urlMatch[1] : null;
        
        if (!urlRestaurantId || urlRestaurantId === 'unknown') {
          toast.error('식당 ID가 필요합니다. 올바른 URL로 접근해주세요.');
          clearUnifiedTokens();
          navigate('/shop/restaurant/unknown/login');
          return;
        }
        
        // Clear URL params but preserve restaurantId path
        const newPath = `/shop/restaurant/${urlRestaurantId}/dashboard`;
        window.history.replaceState({}, '', newPath);
        
        refreshShopUser().then(() => {
          toast.success('Successfully logged in');
        }).catch((error) => {
          console.error('Auth callback error:', error);
          toast.error('Authentication failed');
        });
      }
    } else if (getUnifiedToken('accessToken')) {
      // Check existing authentication
      const appType = localStorage.getItem('unified_appType');
      if (appType === 'admin') {
        refreshAdminUser();
      } else if (appType === 'shop') {
        refreshShopUser();
      }
    }
  }, [location.pathname, location.search, refreshAdminUser, refreshShopUser, navigate]);

  // Login functions
  const loginAdmin = async () => {
    const appType = 'admin';
    window.location.href = `${API_URL}/api/auth/google?appType=${appType}`;
  };

  const loginShop = async (restaurantId: string) => {
    const appType = 'shop';
    const params = new URLSearchParams({ appType, restaurantId });
    window.location.href = `${API_URL}/api/auth/google?${params.toString()}`;
  };

  const loginShopWithPin = async (restaurantId: string, staffId: string, pinCode: string) => {
    try {
      const result = await apiRequest<{
        user: { id: string; email: string; role: string };
        accessToken: string;
        refreshToken: string;
        restaurantId?: string;
      }>('/api/auth/pin', {
        method: 'POST',
        body: JSON.stringify({ staffId, pinCode }),
      });

      if (result.success && result.data) {
        setUnifiedTokens(result.data.accessToken, result.data.refreshToken);
        setAppType('shop');
        
        const staff = shopStaffList.find(s => s.id === staffId);
        if (staff) {
          const staffRestaurantId = result.data.restaurantId;
          if (staffRestaurantId && staffRestaurantId !== restaurantId) {
            toast.error('이 식당에 대한 접근 권한이 없습니다.');
            throw new Error('Restaurant ID mismatch');
          }
          
          setShopUser(staff);
          setShopUserRole(staff.role as 'OWNER' | 'MANAGER' | 'STAFF');
          if (staffRestaurantId) {
            setShopRestaurantId(staffRestaurantId);
          }
          toast.success(`Welcome back, ${staff.name}!`);
        }
      } else {
        throw new Error(result.error?.message || 'PIN login failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Incorrect PIN';
      toast.error(errorMessage);
      throw error;
    }
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

  return (
    <UnifiedAuthContext.Provider
      value={{
        adminUser,
        isAdminAuthenticated: !!adminUser,
        shopUser,
        shopRestaurantId,
        shopRestaurantName,
        isShopAuthenticated: !!shopUser || !!shopUserRole,
        shopStaffList,
        shopUserRole,
        shopOwnerInfo,
        loginAdmin,
        loginShop,
        loginShopWithPin,
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
