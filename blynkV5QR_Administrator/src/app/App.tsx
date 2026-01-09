import React, { useState } from 'react';
import { LayoutDashboard, Store, Settings, Bell, Globe, User, LogOut } from 'lucide-react';
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
  const { t, i18n } = useTranslation();

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

  const TabItem = ({ view, icon: Icon, label }: { view: string; icon: any; label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${
        currentView === view
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className={`w-6 h-6 mb-1 ${currentView === view ? 'fill-current/10' : ''}`} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold leading-none">
                    {adminUser?.email || 'Admin User'}
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
              <Button variant="ghost" className="h-9 px-3 rounded-full gap-2">
                <Globe className="w-5 h-5" />
                <span className="font-semibold text-sm">{i18n.language.toUpperCase()}</span>
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
            className="relative rounded-full"
            onClick={() => setIsNotificationOpen(true)}
          >
             <Bell className={`w-5 h-5 ${isNotificationOpen ? 'fill-current' : ''}`} />
             {/* Note: This dot logic could be moved to state if we want real-time updates from NotificationsView */}
             <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-red-600" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {renderView()}
        </div>
      </main>

      {/* Notifications Sheet/Drawer */}
      <NotificationsView open={isNotificationOpen} onOpenChange={setIsNotificationOpen} />

      {/* Bottom Navigation Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 pb-safe">
        <div className="flex justify-around items-center max-w-md mx-auto h-16 px-2">
          <TabItem view="dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <TabItem view="restaurants" icon={Store} label={t('nav.restaurants')} />
          <TabItem view="settings" icon={Settings} label={t('nav.settings')} />
        </div>
      </nav>
    </div>
  );
}
