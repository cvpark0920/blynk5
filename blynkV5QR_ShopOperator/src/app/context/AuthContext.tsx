import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Staff } from '../data';
import { toast } from 'sonner';
import { apiClient } from '../../lib/api';
import { isPlatformOrAdmin, USER_ROLES } from '../utils/roles';

interface AuthContextType {
  currentUser: Staff | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  loginWithPin: (staffId: string, pinCode: string) => Promise<void>;
  logout: () => Promise<void>;
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  restaurantId: string | null;
  setRestaurantId: React.Dispatch<React.SetStateAction<string | null>>;
  restaurantName: string | null;
  setRestaurantName: React.Dispatch<React.SetStateAction<string | null>>;
  userRole: 'OWNER' | 'MANAGER' | 'STAFF' | null;
  ownerInfo: { name: string; email: string; avatarUrl?: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null);

  // Extract restaurantId from URL path
  const getRestaurantIdFromUrl = (): string | null => {
    const pathMatch = window.location.pathname.match(/\/restaurant\/([^/]+)/);
    return pathMatch ? pathMatch[1] : null;
  };

  // Set restaurantId from URL when available
  useEffect(() => {
    const urlRestaurantId = getRestaurantIdFromUrl();
    if (urlRestaurantId && urlRestaurantId !== 'unknown') {
      setRestaurantId(urlRestaurantId);
    }
  }, []);

  // Function to refresh user info
  const refreshUserInfo = useCallback(async () => {
    if (!apiClient.isAuthenticated()) {
      return;
    }

    try {
      const result = await apiClient.getMe();
      if (result.success && result.data) {
        const role = result.data.role;
        
        // Check if this is a PIN login (has staff data)
        if (result.data.staff) {
          const staff = result.data.staff;
          // Map backend staff to frontend Staff format
          const mappedStaff: Staff = {
            id: staff.id,
            name: staff.name,
            email: staff.email || '',
            role: staff.role.toLowerCase() as Staff['role'],
            status: 'active',
            pinCode: '', // PIN is not returned for security
            phone: staff.phone || '',
            joinedAt: new Date(),
            avatarUrl: staff.avatarUrl || '',
          };
          
          setCurrentUser(mappedStaff);
          setUserRole(staff.role as 'OWNER' | 'MANAGER' | 'STAFF');
          
          if (staff.restaurantId) {
            const urlRestaurantId = getRestaurantIdFromUrl();
            // Verify restaurantId matches URL
            if (urlRestaurantId && urlRestaurantId !== 'unknown' && staff.restaurantId !== urlRestaurantId) {
              toast.error('이 식당에 대한 접근 권한이 없습니다.');
              apiClient.logout();
              navigate(`/restaurant/${urlRestaurantId}/login`);
              return;
            }
            setRestaurantId(staff.restaurantId);
            
            // Load restaurant name
            try {
              const restaurantResult = await apiClient.getMyRestaurant(staff.restaurantId);
              if (restaurantResult.success && restaurantResult.data) {
                const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || null;
                setRestaurantName(restaurantName);
              }
            } catch (error) {
              console.error('Failed to get restaurant:', error);
            }
          }
        } else if (isPlatformOrAdmin(role)) {
          // Google login (owner/admin)
          setUserRole('OWNER');
          // Set owner info for display
          setOwnerInfo({
            name: result.data.name || result.data.email.split('@')[0],
            email: result.data.email,
            avatarUrl: result.data.avatarUrl,
          });
          // Clear currentUser for Google login
          setCurrentUser(null);
          
          // Get restaurant info for owner/admin
          try {
            const urlRestaurantId = getRestaurantIdFromUrl();
            // Pass restaurantId from URL to API
            const restaurantResult = await apiClient.getMyRestaurant(urlRestaurantId || undefined);
            if (restaurantResult.success && restaurantResult.data) {
              const userRestaurantId = restaurantResult.data.id;
              // Verify restaurantId matches URL
              if (urlRestaurantId && urlRestaurantId !== 'unknown' && userRestaurantId !== urlRestaurantId) {
                toast.error('이 식당에 대한 접근 권한이 없습니다.');
                apiClient.logout();
                navigate(`/restaurant/${urlRestaurantId}/login`);
                return;
              }
              setRestaurantId(userRestaurantId);
              // Set restaurant name
              const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || null;
              setRestaurantName(restaurantName);
            }
          } catch (error) {
            console.error('Failed to get restaurant:', error);
            // Don't show error if user doesn't have a restaurant yet
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh user info:', error);
      // Don't logout on error, keep existing user info
    }
  }, [navigate]);

  // Check authentication on mount and handle OAuth callback
  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');

    if (accessToken && refreshToken) {
      // Store tokens
      apiClient.setTokensFromCallback(accessToken, refreshToken);
      
      // Extract restaurantId from URL path BEFORE clearing params
      const urlRestaurantId = getRestaurantIdFromUrl();
      
      // If restaurantId is missing from URL, redirect to login with error
      if (!urlRestaurantId || urlRestaurantId === 'unknown') {
        toast.error('식당 ID가 필요합니다. 올바른 URL로 접근해주세요.');
        apiClient.logout();
        navigate('/restaurant/unknown/login');
        return;
      }
      
      // Clear URL params but preserve restaurantId path
      const newPath = `/restaurant/${urlRestaurantId}/dashboard`;
      window.history.replaceState({}, '', newPath);
      
      // Verify user and get role
      refreshUserInfo().then(() => {
        toast.success('Successfully logged in');
      }).catch((error) => {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed');
      });
    } else if (apiClient.isAuthenticated()) {
      // Check existing authentication
      refreshUserInfo();
    }

    // Listen for token refresh events
    const handleTokenRefresh = () => {
      refreshUserInfo();
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);

    return () => {
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
    };
  }, [refreshUserInfo]);

  const loginWithPin = async (staffId: string, pinCode: string) => {
    try {
      const result = await apiClient.loginWithPin(staffId, pinCode);
      if (result.success && result.data) {
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
          // Verify restaurantId matches URL
          const staffRestaurantId = result.data.restaurantId;
          const urlRestaurantId = getRestaurantIdFromUrl();
          if (urlRestaurantId && urlRestaurantId !== 'unknown' && staffRestaurantId && staffRestaurantId !== urlRestaurantId) {
            toast.error('이 식당에 대한 접근 권한이 없습니다.');
            throw new Error('Restaurant ID mismatch');
          }
          
        setCurrentUser(staff);
          setUserRole(staff.role as 'OWNER' | 'MANAGER' | 'STAFF');
          if (staffRestaurantId) {
            setRestaurantId(staffRestaurantId);
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

  const login = async () => {
    // Redirect to backend Google OAuth
    const urlRestaurantId = getRestaurantIdFromUrl();
    if (!urlRestaurantId || urlRestaurantId === 'unknown') {
      toast.error('식당 ID가 필요합니다.');
      return;
    }
    apiClient.googleAuth(urlRestaurantId);
  };

  const logout = async () => {
    await apiClient.logout();
    setCurrentUser(null);
    setUserRole(null);
    setRestaurantId(null);
    setRestaurantName(null);
    setOwnerInfo(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isAuthenticated: !!currentUser || !!userRole, 
      login, 
      loginWithPin,
      logout,
      staffList,
      setStaffList,
      restaurantId,
      setRestaurantId,
      restaurantName,
      setRestaurantName,
      userRole,
      ownerInfo
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}