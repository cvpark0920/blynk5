import React, { useState, useEffect } from 'react';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Loader2, ChefHat, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';
import { getSubdomain, isReservedSubdomain } from '../../../../../src/utils/subdomain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export function LoginScreen() {
  const debugLog = (..._args: unknown[]) => {};
  // 서브도메인에서 restaurantId 가져오기
  const subdomain = getSubdomain();
  
  // 하위 호환성: 기존 URL 형식도 지원
  const legacyPathMatch = window.location.pathname.match(/\/shop\/restaurant\/([^/]+)/);
  const legacyRestaurantId = legacyPathMatch ? legacyPathMatch[1] : null;
  
  // Navigate function using window.location
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const { 
    loginShop, 
    shopUser: currentUser, 
    shopRestaurantId: restaurantId, 
    setShopRestaurantId: setRestaurantId, 
    setShopRestaurantName: setRestaurantName,
    isShopAuthenticated,
    shopUserRole,
    shopOwnerInfo
  } = useUnifiedAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(true);
  const [restaurantInfo, setRestaurantInfo] = useState<{ name: string; id: string } | null>(null);
  
  // 사용할 restaurantId 결정 (서브도메인 기반 또는 기존 URL)
  const effectiveRestaurantId = restaurantId || legacyRestaurantId;
  
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  // Handle OAuth error event and URL parameters
  useEffect(() => {
    // Check URL parameters for error FIRST
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorMessage = urlParams.get('errorMessage');
    
    if (error || errorMessage) {
      console.error('🔴 [LoginScreen] OAuth error detected in URL:', error, errorMessage);
      const decodedMessage = errorMessage ? decodeURIComponent(errorMessage) : (error || '인증에 실패했습니다.');
      
      // Set error state FIRST before any URL changes
      setOauthError(decodedMessage);
      setIsErrorDialogOpen(true);
      
      // Clear URL params AFTER state is set (delay to ensure modal shows)
      setTimeout(() => {
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, '', cleanPath);
      }, 50);
    }
    
    const handleOAuthError = (event: CustomEvent<{ message: string }>) => {
      console.error('🔴 [LoginScreen] OAuth error event received:', event.detail);
      // Ensure modal state is set even if component re-renders
      setOauthError(event.detail.message);
      setIsErrorDialogOpen(true);
    };

    window.addEventListener('oauth-error', handleOAuthError as EventListener);

    return () => {
      window.removeEventListener('oauth-error', handleOAuthError as EventListener);
    };
  }, []);

  // Debug logging
  useEffect(() => {
    debugLog('=== LoginScreen Component Mounted ===');
    debugLog('Subdomain:', subdomain);
    debugLog('Legacy URL restaurantId:', legacyRestaurantId);
    debugLog('Context restaurantId:', restaurantId);
    debugLog('Effective restaurantId:', effectiveRestaurantId);
    debugLog('isShopAuthenticated:', isShopAuthenticated);
    debugLog('shopUser:', currentUser);
    debugLog('shopUserRole:', shopUserRole);
    debugLog('shopOwnerInfo:', shopOwnerInfo);
    debugLog('Current URL:', window.location.href);
  }, [subdomain, legacyRestaurantId, restaurantId, effectiveRestaurantId, isShopAuthenticated, currentUser, shopUserRole, shopOwnerInfo]);

  // Load restaurant info and staff list from subdomain or URL restaurantId (public API, no auth required)
  useEffect(() => {
    // 서브도메인 기반인 경우, 백엔드에서 이미 restaurantId를 설정했을 수 있음
    if (restaurantId) {
      // 서브도메인이 있으면 상대 경로 사용, 없으면 apiClient 사용
      if (subdomain && !isReservedSubdomain(subdomain)) {
        // 서브도메인 기반: 상대 경로 사용
        fetch(`/api/public/restaurant/${restaurantId}`)
          .then(res => res.json())
          .then((restaurantResult) => {
            if (restaurantResult.success && restaurantResult.data) {
              const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || 'Restaurant';
              setRestaurantInfo({
                id: restaurantResult.data.id,
                name: restaurantName,
              });
              setRestaurantName(restaurantName);
            }
          })
        .finally(() => {
          setIsLoadingRestaurant(false);
        });
      } else {
        // 기존 URL 형식: apiClient 사용
        Promise.all([
          apiClient.getRestaurantPublic(restaurantId),
        ])
        .then(([restaurantResult]) => {
          if (restaurantResult.success && restaurantResult.data) {
            const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || 'Restaurant';
            setRestaurantInfo({
              id: restaurantResult.data.id,
              name: restaurantName,
            });
            setRestaurantName(restaurantName);
          }
        })
        .finally(() => {
          setIsLoadingRestaurant(false);
        });
      }
      return;
    }
    
    // 서브도메인이 있지만 restaurantId가 없는 경우 백엔드에서 식당 정보 조회
    if (subdomain && !isReservedSubdomain(subdomain) && !restaurantId) {
      // 서브도메인으로 식당 정보 조회 (상대 경로 사용)
      fetch('/api/public/restaurant')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            debugLog('Restaurant fetched from subdomain:', data.data);
            const fetchedRestaurantId = data.data.id;
            setRestaurantId(fetchedRestaurantId);
            const restaurantName = data.data.nameKo || data.data.nameVn || data.data.nameEn || 'Restaurant';
            setRestaurantInfo({
              id: fetchedRestaurantId,
              name: restaurantName,
            });
            setRestaurantName(restaurantName);
            
          } else {
            throw new Error(data.error?.message || 'Failed to fetch restaurant');
          }
        })
        .catch(err => {
          console.error('Failed to load restaurant info from subdomain:', err);
          toast.error(t('login.error.restaurant_not_found') || '식당을 찾을 수 없습니다.');
        })
        .finally(() => {
          setIsLoadingRestaurant(false);
        });
      return;
    }
    
    // 기존 URL 형식 지원
    if (!legacyRestaurantId || legacyRestaurantId === 'unknown') {
      setIsLoadingRestaurant(false);
      return;
    }

    // Set restaurantId in context
    setRestaurantId(legacyRestaurantId);

    // Load restaurant info and staff list
      Promise.all([
        apiClient.getRestaurantPublic(legacyRestaurantId),
      ])
      .then(([restaurantResult]) => {
        if (restaurantResult.success && restaurantResult.data) {
          const restaurantName = restaurantResult.data.nameKo || restaurantResult.data.nameVn || restaurantResult.data.nameEn || 'Restaurant';
          setRestaurantInfo({
            id: restaurantResult.data.id,
            name: restaurantName,
          });
          // Set restaurant name in context
          setRestaurantName(restaurantName);
        } else {
          // Restaurant not found or not active
          console.error('Restaurant not found or not active:', restaurantResult.error);
          toast.error(t('login.error.restaurant_not_found') || '식당을 찾을 수 없습니다. 식당 ID를 확인해주세요.');
        }

      })
      .catch((error) => {
        console.error('Failed to load restaurant info:', error);
        const errorMessage = error?.error?.message || error?.message || 'Unknown error';
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          toast.error(t('login.error.restaurant_not_found') || '식당을 찾을 수 없습니다. 식당 ID를 확인해주세요.');
        } else {
          toast.error(t('login.error.restaurant_load_failed') || '식당 정보를 불러오는데 실패했습니다.');
        }
      })
      .finally(() => {
        setIsLoadingRestaurant(false);
      });
  }, [legacyRestaurantId, restaurantId, subdomain, setRestaurantId]);

  const handleEmailLogin = async () => {
    debugLog('=== handleEmailLogin called ===');
    debugLog('effectiveRestaurantId:', effectiveRestaurantId);
    debugLog('subdomain:', subdomain);
    
    if (!effectiveRestaurantId) {
      console.error('No restaurantId found');
      toast.error(t('login.error.restaurant_id_required') || '식당 ID가 필요합니다.');
      return;
    }

    setIsLoading(true);
    try {
      debugLog('Calling loginShop with restaurantId:', effectiveRestaurantId);
      await loginShop(effectiveRestaurantId);
      debugLog('loginShop completed');
      // After successful login, navigate to dashboard
      // 서브도메인 기반이면 /shop/dashboard, 기존 형식이면 /shop/restaurant/:id/dashboard
      const dashboardPath = subdomain && !isReservedSubdomain(subdomain) 
        ? '/shop/dashboard'
        : `/shop/restaurant/${effectiveRestaurantId}/dashboard`;
      navigate(dashboardPath);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is logged in but pending, show pending screen
  if (currentUser?.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-zinc-100"
        >
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">{t('auth.pending_title')}</h2>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            {t('auth.pending_desc')}
          </p>
          <div className="bg-zinc-50 p-4 rounded-xl mb-6 text-left border border-zinc-100">
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">Account</p>
            <p className="font-medium text-zinc-900">{currentUser.email}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} // Simple reload to reset for demo
            className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {t('auth.back_to_login')}
          </button>
      </motion.div>

      {/* OAuth Error Modal */}
      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              {t('login.error.access_denied') || '접근 권한 없음'}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              {oauthError || (t('login.error.unauthorized_account') || '식당 주인이나 직원만 로그인할 수 있습니다.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setIsErrorDialogOpen(false);
                setOauthError(null);
              }}
              className="w-full"
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-gradient-to-br from-indigo-50/50 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-[20%] w-[60%] h-[60%] bg-gradient-to-tr from-rose-50/50 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div 
        key="email-mode"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white/50 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-zinc-200 rotate-3">
          <ChefHat size={40} strokeWidth={1.5} />
        </div>
        
        <h1 className="text-3xl font-bold text-zinc-900 mb-3 tracking-tight">
          {restaurantInfo ? restaurantInfo.name : t('auth.login_title')}
        </h1>
        <p className="text-zinc-500 mb-10 leading-relaxed">
          {restaurantInfo ? `${restaurantInfo.name}에 로그인하세요` : t('auth.login_desc')}
        </p>

        <button
          onClick={handleEmailLogin}
          disabled={isLoading}
          className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 group relative overflow-hidden shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="animate-spin text-zinc-400" />
          ) : (
            <>
              <img 
                src="https://www.svgrepo.com/show/475656/google-color.svg" 
                alt="Google" 
                className="w-6 h-6" 
              />
              <span>{t('auth.google_login')}</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}