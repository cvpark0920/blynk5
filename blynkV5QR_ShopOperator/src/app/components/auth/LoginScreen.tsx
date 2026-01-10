import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Loader2, ChefHat, Lock, ArrowLeft, Delete, DeleteIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Staff } from '../../data';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { apiClient } from '../../../lib/api';

export function LoginScreen() {
  const { restaurantId: urlRestaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { 
    loginShop, 
    loginShopWithPin, 
    shopUser: currentUser, 
    shopStaffList: staffList, 
    setShopStaffList: setStaffList, 
    shopRestaurantId: restaurantId, 
    setShopRestaurantId: setRestaurantId, 
    setShopRestaurantName: setRestaurantName 
  } = useUnifiedAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(true);
  const [restaurantInfo, setRestaurantInfo] = useState<{ name: string; id: string } | null>(null);
  
  const [mode, setMode] = useState<'pin' | 'email'>('pin'); // 'pin' | 'email'
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [pinInput, setPinInput] = useState('');

  // Load restaurant info and staff list from URL restaurantId (public API, no auth required)
  useEffect(() => {
    if (!urlRestaurantId) {
      setIsLoadingRestaurant(false);
      return;
    }

    // Set restaurantId in context
    setRestaurantId(urlRestaurantId);

    // Load restaurant info and staff list
    Promise.all([
      apiClient.getRestaurantPublic(urlRestaurantId),
      apiClient.getStaffListPublic(urlRestaurantId)
    ])
      .then(([restaurantResult, staffResult]) => {
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

        if (staffResult.success && staffResult.data) {
          // Map API response to Staff format
          const mappedStaff: Staff[] = staffResult.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email || '',
            role: s.role.toLowerCase(),
            status: 'active',
            pinCode: '', // PIN is not returned for security
            joinedAt: new Date(),
            avatarUrl: s.avatarUrl || '',
          }));
          setStaffList(mappedStaff);
        } else {
          // Staff list not found (restaurant might not exist)
          console.error('Staff list not found:', staffResult.error);
          setStaffList([]);
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
  }, [urlRestaurantId, setRestaurantId, setStaffList]);

  // Filter active staff for PIN login
  const activeStaff = staffList.filter(s => s.status === 'active');

  const handleEmailLogin = async () => {
    if (!urlRestaurantId) {
      toast.error(t('login.error.restaurant_id_required'));
      return;
    }

    setIsLoading(true);
    try {
      await loginShop(urlRestaurantId);
      // After successful login, navigate to dashboard
      navigate(`/shop/restaurant/${urlRestaurantId}/dashboard`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (num: string) => {
    if (pinInput.length < 6) {
        const newPin = pinInput + num;
        setPinInput(newPin);
        
        // Auto submit if length is 4
        if (selectedStaff && newPin.length === 4) {
            verifyPin(newPin);
        }
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const verifyPin = async (pin: string) => {
      if (!selectedStaff || !urlRestaurantId) return;
      
      setIsLoading(true);
      try {
          await loginShopWithPin(urlRestaurantId, selectedStaff.id, pin);
          setPinInput('');
          // After successful login, navigate to dashboard
          navigate(`/shop/restaurant/${urlRestaurantId}/dashboard`);
      } catch (error) {
          setPinInput('');
          // Error is already handled in loginShopWithPin
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

      <AnimatePresence mode="wait">
        {mode === 'email' ? (
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

                <div className="mt-8 pt-8 border-t border-zinc-100">
                    <button 
                        onClick={() => setMode('pin')}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                        {t('login.mode.pin')}
                    </button>
                </div>
            </motion.div>
        ) : (
            <motion.div 
                key="pin-mode"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white/50 max-w-4xl w-full text-center"
            >
                {!selectedStaff ? (
                    // 1. Staff Selection Grid
                    <div className="max-w-3xl mx-auto">
                         <div className="flex justify-between items-center mb-8">
                            <div className="flex flex-col items-start">
                              <h2 className="text-2xl font-bold text-zinc-900 mb-1">
                                {restaurantInfo ? restaurantInfo.name : t('login.mode.admin')}
                              </h2>
                              <p className="text-sm text-zinc-500">
                                {restaurantInfo ? t('login.title.who_logging_in') : t('login.title.who_logging_in')}
                              </p>
                            </div>
                            <button 
                                onClick={() => setMode('email')}
                                className="text-sm font-bold text-zinc-400 hover:text-zinc-900 whitespace-nowrap"
                            >
                                {t('login.mode.admin')}
                            </button>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {activeStaff.map(staff => (
                                <button
                                    key={staff.id}
                                    onClick={() => setSelectedStaff(staff)}
                                    className="flex flex-col items-center justify-center p-6 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 aspect-square group"
                                >
                                    <div className={cn(
                                        "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4 overflow-hidden shadow-inner",
                                        staff.role === 'owner' ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                                    )}>
                                        {staff.avatarUrl ? (
                                            <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
                                        ) : (
                                            staff.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <span className="font-bold text-zinc-900 text-lg">{staff.name}</span>
                                    <span className="text-xs font-medium text-zinc-400 uppercase mt-1 tracking-wider">{t(`role.${staff.role}`)}</span>
                                </button>
                            ))}
                            {activeStaff.length === 0 && (
                                <div className="col-span-full py-12 text-zinc-400">
                                    {t('login.error.restaurant_id_required')}
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    // 2. PIN Pad
                    <div className="max-w-sm mx-auto">
                        <div className="mb-8">
                            <button 
                                onClick={() => {
                                    setSelectedStaff(null);
                                    setPinInput('');
                                }}
                                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6 mx-auto w-fit text-sm font-medium"
                            >
                                <ArrowLeft size={16} /> {t('login.title.who_logging_in')}
                            </button>
                            
                            <div className="w-20 h-20 rounded-full bg-zinc-100 mx-auto mb-4 overflow-hidden">
                                {selectedStaff.avatarUrl ? (
                                    <img src={selectedStaff.avatarUrl} alt={selectedStaff.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-xl text-zinc-400">
                                        {selectedStaff.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900">{t('login.success.welcome_back').replace('{name}', selectedStaff.name)}</h2>
                            <p className="text-zinc-400 text-sm mt-1">{t('login.pin.enter_pin')}</p>
                        </div>

                        {/* PIN Dots */}
                        <div className="flex justify-center gap-3 mb-8 h-4">
                             {[...Array(4)].map((_, i) => (
                                 <div 
                                    key={i} 
                                    className={cn(
                                        "w-3 h-3 rounded-full transition-all duration-200",
                                        i < pinInput.length ? "bg-emerald-500 scale-110" : "bg-zinc-200"
                                    )}
                                 />
                             ))}
                        </div>

                        {/* Keypad */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handlePinInput(num.toString())}
                                    disabled={isLoading}
                                    className="h-16 rounded-2xl bg-zinc-50 border border-zinc-100 text-2xl font-bold text-zinc-900 hover:bg-white hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {num}
                                </button>
                            ))}
                            <div /> {/* Empty spacer */}
                            <button
                                onClick={() => handlePinInput('0')}
                                disabled={isLoading}
                                className="h-16 rounded-2xl bg-zinc-50 border border-zinc-100 text-2xl font-bold text-zinc-900 hover:bg-white hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                            >
                                0
                            </button>
                            <button
                                onClick={handleBackspace}
                                disabled={isLoading}
                                className="h-16 rounded-2xl bg-transparent text-zinc-400 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95 flex items-center justify-center"
                            >
                                <Delete size={24} />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}