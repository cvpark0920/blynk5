import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Store, Settings, Bell, Globe, User, LogOut } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
import { DashboardView } from './components/views/DashboardView';
import { RestaurantsView } from './components/views/RestaurantsView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';
import { NotificationsView } from './components/views/NotificationsView';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { useTranslation } from 'react-i18next';
import { useUnifiedAuth } from '../../../src/context/UnifiedAuthContext';
import './i18n';

export function AdminApp() {
  const { adminUser, isAdminAuthenticated, loginAdmin, logoutAdmin } = useUnifiedAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => {
      document.body.classList.remove('admin-theme');
    };
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ko' ? 'en' : 'ko';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    await logoutAdmin();
  };

  if (!isAdminAuthenticated) {
    return <LoginView onLogin={loginAdmin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onChangeView={setCurrentView} />;
      case 'restaurants':
        return <RestaurantsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onChangeView={setCurrentView} />;
    }
  };

  const TabItem = ({ view, icon: Icon, label }: { view: string; icon: any; label: string }) => {
    const isActive = currentView === view;

    return (
      <button
        onClick={() => setCurrentView(view)}
        className={`relative flex flex-col items-center justify-center w-full h-12 rounded-xl transition-all duration-300 ${
          isActive ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
        }`}
      >
        <div
          className={`relative p-1.5 rounded-xl transition-all duration-300 ${
            isActive ? 'bg-zinc-100 -translate-y-1' : ''
          }`}
        >
          <Icon
            className="h-5 w-5 transition-transform duration-300"
          />
        </div>
        <span className="sr-only">{label}</span>
        {isActive && (
          <span className="absolute bottom-1 text-[9px] font-bold tracking-tight animate-in fade-in slide-in-from-bottom-1 duration-300">
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="admin-theme min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-3 rounded-full px-2 py-1 hover:bg-slate-100/70 transition-colors">
                <Avatar className="w-9 h-9 border border-slate-200">
                  {adminUser?.avatarUrl && !avatarError ? (
                    <AvatarImage 
                      src={adminUser.avatarUrl} 
                      alt={adminUser.name || adminUser.email}
                      onError={() => setAvatarError(true)}
                    />
                  ) : null}
                  <AvatarFallback className="bg-slate-200 text-slate-700 font-semibold">
                    {adminUser?.name?.charAt(0).toUpperCase() || adminUser?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-none">
                    {adminUser?.name || adminUser?.email || 'Admin User'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {adminUser?.role === 'PLATFORM_ADMIN' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-3 rounded-full gap-2 text-slate-700 hover:bg-slate-100/70">
                <Globe className="w-5 h-5" />
                <span className="font-medium text-sm">{i18n.language.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => i18n.changeLanguage('ko')}>
                KO
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => i18n.changeLanguage('en')}>
                EN
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => i18n.changeLanguage('vn')}>
                VN
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative rounded-full text-slate-700 hover:bg-slate-100/70"
            onClick={() => setIsNotificationOpen(true)}
          >
             <Bell className={`w-5 h-5 ${isNotificationOpen ? 'fill-current' : ''}`} />
             {/* Note: This dot logic could be moved to state if we want real-time updates from NotificationsView */}
             <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-slate-700 hover:bg-slate-100/70"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-red-600" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {renderView()}
        </div>
      </main>

      {/* Notifications Sheet/Drawer */}
      <NotificationsView open={isNotificationOpen} onOpenChange={setIsNotificationOpen} />

      {/* Bottom Navigation Tabs */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-30 pointer-events-none">
        <nav className="mx-auto max-w-[420px] bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl flex justify-around items-center px-2 py-2 pointer-events-auto ring-1 ring-zinc-900/5">
          <TabItem view="dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <TabItem view="restaurants" icon={Store} label={t('nav.restaurants')} />
          <TabItem view="settings" icon={Settings} label={t('nav.settings')} />
        </nav>
      </div>
    </div>
  );
}

export default AdminApp;
