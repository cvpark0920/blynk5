import React from 'react';
import { MenuManager } from './MenuManager';
import { StaffManagement } from './StaffManagement';
import { TableManagement } from './TableManagement';
import { PaymentMethodManagement } from './PaymentMethodManagement';
import { Staff, MenuItem, MenuCategory, Table } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UtensilsCrossed, Users, LayoutGrid, CreditCard } from 'lucide-react';

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
}

export function SettingsPage({
  menu, setMenu, categories, setCategories,
  staffList, setStaffList,
  tables, setTables
}: SettingsPageProps) {
  const { t } = useLanguage();
  const { shopUser: currentUser, shopUserRole: userRole } = useUnifiedAuth();
  
  // Check if user can manage staff (OWNER or MANAGER)
  const canManageStaff = 
    (userRole && ['OWNER', 'MANAGER'].includes(userRole)) ||
    (currentUser?.role && ['owner', 'manager'].includes(currentUser.role.toLowerCase()));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 pt-6 pb-2 shrink-0">

      </div>

      {/* Mobile Profile Card - REMOVED (Moved to Header) */}
      
      <Tabs defaultValue="menu" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 shrink-0">
            <TabsList className={`bg-zinc-100 p-1 mb-4 w-full md:w-auto grid ${canManageStaff ? 'grid-cols-4' : 'grid-cols-3'} md:inline-flex`}>
                <TabsTrigger value="menu" className="gap-2 px-6">
                    <UtensilsCrossed size={16} />
                    {t('settings.tab_menu')}
                </TabsTrigger>
                <TabsTrigger value="tables" className="gap-2 px-6">
                    <LayoutGrid size={16} />
                    {t('settings.tab_tables')}
                </TabsTrigger>
                {canManageStaff && (
                    <TabsTrigger value="staff" className="gap-2 px-6">
                        <Users size={16} />
                        {t('settings.tab_staff')}
                    </TabsTrigger>
                )}
                {canManageStaff && (
                    <TabsTrigger value="payment" className="gap-2 px-6">
                        <CreditCard size={16} />
                        {t('settings.tab_payment')}
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
            {canManageStaff && (
                <TabsContent value="payment" className="m-0 h-full border-none">
                    <PaymentMethodManagement isEmbedded={true} />
                </TabsContent>
            )}
        </div>
      </Tabs>
    </div>
  );
}