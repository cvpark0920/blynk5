import React from 'react';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { LayoutGrid, ChefHat, UtensilsCrossed, LogOut, Settings, BarChart3 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
  currentTab: 'tables' | 'orders' | 'reports' | 'settings';
  onTabChange: (tab: 'tables' | 'orders' | 'reports' | 'settings') => void;
  activeOrders: number;
}

export function Sidebar({ currentTab, onTabChange, activeOrders }: SidebarProps) {
  const { t } = useLanguage();
  const { logoutShop: logout, shopUser: currentUser, shopUserRole: userRole, shopOwnerInfo: ownerInfo, shopRestaurantName: restaurantName } = useUnifiedAuth();
  const [avatarError, setAvatarError] = React.useState(false);

  // Use ownerInfo for Google login, currentUser for PIN login
  const displayUser = currentUser || (ownerInfo && userRole === 'OWNER' ? {
    name: ownerInfo.name,
    email: ownerInfo.email,
    avatarUrl: ownerInfo.avatarUrl,
    role: 'owner'
  } : null);

  // Reset avatar error when avatarUrl changes
  React.useEffect(() => {
    setAvatarError(false);
  }, [displayUser?.avatarUrl]);

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
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {restaurantName || 'Restaurant'}<span className="text-emerald-500">.</span>
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1 uppercase tracking-wider">Manager Dashboard</p>
      </div>

      <div className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          if (item.restricted && !isOwnerOrManager) return null;

          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium group
                ${isActive 
                  ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' 
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.id === 'menu' ? 'Menu' : t(item.label)}</span>
              </div>
              {item.id === 'orders' && activeOrders > 0 && (
                 <span className="bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center ring-2 ring-white">
                    {activeOrders}
                 </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-100">
        <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 overflow-hidden">
                {displayUser?.avatarUrl && !avatarError ? (
                  <img 
                    src={displayUser.avatarUrl} 
                    alt={displayUser.name} 
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                    loading="lazy"
                  />
                ) : (
                  displayUser?.name?.charAt(0).toUpperCase() || 'U'
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">{displayUser?.name || 'User'}</p>
                <p className="text-xs text-zinc-400 truncate capitalize">{displayUser?.role || userRole?.toLowerCase() || 'user'}</p>
            </div>
        </div>
        <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-all text-sm font-medium"
        >
            <LogOut size={20} />
            <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
