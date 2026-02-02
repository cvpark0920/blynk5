import React from 'react';
import { MenuManager } from './MenuManager';
import { StaffManagement } from './StaffManagement';
import { TableManagement } from './TableManagement';
import { PaymentMethodManagement } from './PaymentMethodManagement';
import { QuickChipsManagement } from './QuickChipsManagement';
import { PromotionManager } from './PromotionManager';
import { SplashImageManager } from './SplashImageManager';
import { Staff, MenuItem, MenuCategory, Table } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UtensilsCrossed, Users, LayoutGrid, CreditCard, MessageSquare, Tag, Image } from 'lucide-react';

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
  
  const canManagePromotions =
    (userRole && ['OWNER', 'MANAGER'].includes(userRole)) ||
    (currentUser?.role && ['owner', 'manager'].includes(currentUser.role.toLowerCase()));
  
  const canManageSplashImage =
    (userRole && ['OWNER', 'MANAGER'].includes(userRole)) ||
    (currentUser?.role && ['owner', 'manager'].includes(currentUser.role.toLowerCase()));
  
  // Check if user is OWNER (only OWNER can manage payment methods)
  const isOwner = 
    userRole === 'OWNER' ||
    (currentUser?.role && currentUser.role.toLowerCase() === 'owner');

  return (
    <div className="w-full h-full flex flex-col">

      {/* Mobile Profile Card - REMOVED (Moved to Header) */}
      
      <Tabs defaultValue="menu" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 shrink-0 overflow-x-auto">
            <TabsList className="bg-transparent p-0 mb-0 w-fit inline-flex gap-2 whitespace-nowrap">
                <TabsTrigger 
                  value="menu" 
                  className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10" 
                  aria-label={t('settings.tab_menu')}
                >
                    <UtensilsCrossed size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">{t('settings.tab_menu')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tables" 
                  className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10" 
                  aria-label={t('settings.tab_tables')}
                >
                    <LayoutGrid size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">{t('settings.tab_tables')}</span>
                </TabsTrigger>
                {canManageQuickChips && (
                    <TabsTrigger 
                      value="quick-chips" 
                      className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10" 
                      aria-label="상용구"
                    >
                        <MessageSquare size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">상용구</span>
                    </TabsTrigger>
                )}
                {canManagePromotions && (
                    <TabsTrigger 
                      value="promotions" 
                      className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10" 
                      aria-label="프로모션"
                    >
                        <Tag size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">프로모션</span>
                    </TabsTrigger>
                )}
                {canManageSplashImage && (
                    <TabsTrigger 
                      value="splash-image" 
                      className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10" 
                      aria-label={t('settings.tab_splash_image')}
                    >
                        <Image size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">{t('settings.tab_splash_image')}</span>
                    </TabsTrigger>
                )}
                {canManageStaff && (
                    <TabsTrigger 
                      value="staff" 
                      className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10" 
                      aria-label={t('settings.tab_staff')}
                    >
                        <Users size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">{t('settings.tab_staff')}</span>
                    </TabsTrigger>
                )}
                {isOwner && (
                    <TabsTrigger 
                      value="payment" 
                      className="gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all flex-shrink-0 group data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 hover:border-primary/30 hover:bg-primary/10" 
                      aria-label={t('settings.tab_payment')}
                    >
                        <CreditCard size={16} className="text-muted-foreground group-data-[state=active]:text-primary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground/80 group-data-[state=active]:text-primary group-hover:text-primary transition-colors">{t('settings.tab_payment')}</span>
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
            {canManagePromotions && (
                <TabsContent value="promotions" className="m-0 h-full border-none">
                    <PromotionManager isEmbedded={true} />
                </TabsContent>
            )}
            {canManageSplashImage && (
                <TabsContent value="splash-image" className="m-0 h-full border-none">
                    <SplashImageManager isEmbedded={true} />
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