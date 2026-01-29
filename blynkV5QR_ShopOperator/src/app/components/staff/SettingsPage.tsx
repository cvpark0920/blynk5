import React from 'react';
import { MenuManager } from './MenuManager';
import { StaffManagement } from './StaffManagement';
import { TableManagement } from './TableManagement';
import { PaymentMethodManagement } from './PaymentMethodManagement';
import { QuickChipsManagement } from './QuickChipsManagement';
import { Staff, MenuItem, MenuCategory, Table } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UtensilsCrossed, Users, LayoutGrid, CreditCard, MessageSquare } from 'lucide-react';

interface SettingsPageProps {
  // Menu Props
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  categories: MenuCategory[];
  setCategories: React.Dispatch<React.SetStateAction<MenuCategory[]>>;
  
  // Staff Props
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;

  // Table Props
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;

  // Notification Props
  notificationSoundUrl: string | null;
  isPushSupported: boolean;
  isSoundEnabled: boolean;
  isEnablingPush: boolean;
  isDisablingPush: boolean;
  isSoundUnlocked: boolean;
  onEnableNotifications: () => void;
  onDisableNotifications: () => void;
  onTestSound: () => void;
}

export function SettingsPage({
  menu, setMenu, categories, setCategories,
  staffList, setStaffList,
  tables, setTables,
  notificationSoundUrl,
  isPushSupported,
  isSoundEnabled,
  isEnablingPush,
  isDisablingPush,
  isSoundUnlocked,
  onEnableNotifications,
  onDisableNotifications,
  onTestSound,
}: SettingsPageProps) {
  const { t } = useLanguage();
  const { shopUser: currentUser, shopUserRole: userRole } = useUnifiedAuth();
  
  // Check if user can manage staff (OWNER or MANAGER)
  const canManageStaff = 
    (userRole && ['OWNER', 'MANAGER'].includes(userRole)) ||
    (currentUser?.role && ['owner', 'manager'].includes(currentUser.role.toLowerCase()));

  const canManageQuickChips =
    (userRole && ['OWNER', 'MANAGER'].includes(userRole)) ||
    (currentUser?.role && ['owner', 'manager'].includes(currentUser.role.toLowerCase()));
  
  // Check if user is OWNER (only OWNER can manage payment methods)
  const isOwner = 
    userRole === 'OWNER' ||
    (currentUser?.role && currentUser.role.toLowerCase() === 'owner');

  const tabCount = 2 + (canManageStaff ? 1 : 0) + (isOwner ? 1 : 0) + (canManageQuickChips ? 1 : 0);
  const tabGridClass = tabCount === 2
    ? 'grid-cols-2'
    : tabCount === 3
      ? 'grid-cols-3'
      : tabCount === 4
        ? 'grid-cols-4'
        : 'grid-cols-5';

  return (
    <div className="w-full h-full flex flex-col">

      {/* Mobile Profile Card - REMOVED (Moved to Header) */}
      
      <Tabs defaultValue="menu" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 shrink-0">
            <TabsList className={`bg-zinc-100 p-1 mb-4 w-full md:w-auto grid ${tabGridClass} md:inline-flex`}>
                <TabsTrigger value="menu" className="gap-1.5 md:gap-2 px-2 sm:px-4 md:px-6" aria-label={t('settings.tab_menu')}>
                    <UtensilsCrossed size={16} />
                    <span className="hidden sm:inline">{t('settings.tab_menu')}</span>
                </TabsTrigger>
                <TabsTrigger value="tables" className="gap-1.5 md:gap-2 px-2 sm:px-4 md:px-6" aria-label={t('settings.tab_tables')}>
                    <LayoutGrid size={16} />
                    <span className="hidden sm:inline">{t('settings.tab_tables')}</span>
                </TabsTrigger>
                {canManageQuickChips && (
                    <TabsTrigger value="quick-chips" className="gap-1.5 md:gap-2 px-2 sm:px-4 md:px-6" aria-label="상용구">
                        <MessageSquare size={16} />
                        <span className="hidden sm:inline">상용구</span>
                    </TabsTrigger>
                )}
                {canManageStaff && (
                    <TabsTrigger value="staff" className="gap-1.5 md:gap-2 px-2 sm:px-4 md:px-6" aria-label={t('settings.tab_staff')}>
                        <Users size={16} />
                        <span className="hidden sm:inline">{t('settings.tab_staff')}</span>
                    </TabsTrigger>
                )}
                {isOwner && (
                    <TabsTrigger value="payment" className="gap-1.5 md:gap-2 px-2 sm:px-4 md:px-6" aria-label={t('settings.tab_payment')}>
                        <CreditCard size={16} />
                        <span className="hidden sm:inline">{t('settings.tab_payment')}</span>
                    </TabsTrigger>
                )}
            </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
            <TabsContent value="menu" className="m-0 h-full border-none data-[state=active]:flex flex-col">
                <MenuManager 
                    menu={menu} 
                    setMenu={setMenu} 
                    categories={categories}
                    setCategories={setCategories}
                    isEmbedded={true} 
                />
            </TabsContent>
            
            <TabsContent value="tables" className="m-0 h-full border-none">
                <TableManagement 
                    tables={tables}
                    setTables={setTables}
                    isEmbedded={true}
                />
            </TabsContent>

            {canManageStaff && (
                <TabsContent value="staff" className="m-0 h-full border-none">
                    <StaffManagement 
                        staffList={staffList} 
                        setStaffList={setStaffList} 
                        isEmbedded={true}
                    />
                </TabsContent>
            )}
            {canManageQuickChips && (
                <TabsContent value="quick-chips" className="m-0 h-full border-none">
                    <QuickChipsManagement />
                </TabsContent>
            )}
            {isOwner && (
                <TabsContent value="payment" className="m-0 h-full border-none">
                    <PaymentMethodManagement isEmbedded={true} />
                </TabsContent>
            )}
        </div>
      </Tabs>
    </div>
  );
}