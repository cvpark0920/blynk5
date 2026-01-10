import React from 'react';
import { LayoutGrid, ChefHat, UtensilsCrossed, BarChart3, Settings } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';

interface BottomNavProps {
  currentTab: 'tables' | 'orders' | 'reports' | 'settings';
  onTabChange: (tab: 'tables' | 'orders' | 'reports' | 'settings') => void;
  activeOrders: number;
}

export function BottomNav({ currentTab, onTabChange, activeOrders }: BottomNavProps) {
  const { t } = useLanguage();
  const { shopUser: currentUser, shopUserRole: userRole } = useUnifiedAuth();

  const navItems = [
    { id: 'tables', icon: LayoutGrid, label: 'nav.tables' },
    { id: 'orders', icon: ChefHat, label: 'nav.orders' },
    { id: 'reports', icon: BarChart3, label: 'nav.reports', restricted: true },
    { id: 'settings', icon: Settings, label: 'nav.settings' },
  ] as const;

  // Check if user has owner/manager permissions (for PIN login: currentUser.role, for Google login: userRole)
  const isOwnerOrManager = 
    (currentUser?.role && ['owner', 'manager'].includes(currentUser.role.toLowerCase())) ||
    (userRole && ['OWNER', 'MANAGER'].includes(userRole));

  return (
    <div className="fixed bottom-6 left-0 right-0 px-6 z-40 pointer-events-none">
        <nav className="mx-auto max-w-[420px] bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl flex justify-around items-center px-2 py-2 pointer-events-auto ring-1 ring-zinc-900/5">
        {navItems.map((item) => {
            if (item.restricted && !isOwnerOrManager) return null;
            
            const isActive = currentTab === item.id;
            return (
                <button 
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`
                        relative flex flex-col items-center justify-center w-full h-12 rounded-xl transition-all duration-300
                        ${isActive ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}
                    `}
                >
                    <div className={`
                        relative p-1.5 rounded-xl transition-all duration-300
                        ${isActive ? 'bg-zinc-100 -translate-y-1' : ''}
                    `}>
                        <item.icon 
                            size={20} 
                            strokeWidth={isActive ? 2.5 : 2} 
                            className="transition-transform duration-300"
                        />
                        {item.id === 'orders' && activeOrders > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center ring-2 ring-white">
                            {activeOrders}
                            </span>
                        )}
                    </div>
                    {isActive && (
                        <span className="absolute bottom-1 text-[9px] font-bold tracking-tight animate-in fade-in slide-in-from-bottom-1 duration-300">
                            {item.id === 'menu' ? 'Menu' : t(item.label)}
                        </span>
                    )}
                </button>
            )
        })}
        </nav>
    </div>
  );
}
