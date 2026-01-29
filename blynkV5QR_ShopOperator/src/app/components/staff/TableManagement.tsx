import React, { useState, useEffect } from 'react';
import { Table } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';
import { mapBackendTableToFrontend, mapFrontendTableToBackend } from '../../utils/mappers';
import { BackendTable } from '../../types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { Input } from '../ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Plus, MoreHorizontal, Users, Trash2, Edit2, LayoutGrid, Layers, CheckCircle2, CircleOff } from 'lucide-react';

// Simple hook for responsive design
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

interface TableManagementProps {
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  isEmbedded?: boolean;
}

export function TableManagement({ tables, setTables, isEmbedded = false }: TableManagementProps) {
  const { t } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [togglingTableId, setTogglingTableId] = useState<string | null>(null);
  const isDesktop = useIsDesktop();
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    capacity: '',
    floor: ''
  });

  // Note: Tables are loaded in MainApp, this component just manages them
  // No need to load here to avoid duplicate API calls
  const reloadTables = async () => {
    if (!restaurantId) return;
    try {
      const result = await apiClient.getTables(restaurantId);
      if (result.success && result.data) {
        const mappedTables = result.data.map((table: BackendTable) => mapBackendTableToFrontend(table));
        setTables(mappedTables);
      }
    } catch (error) {
      console.error('Error reloading tables:', error);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    const tableNumber = parseInt(formData.id);
    const capacity = parseInt(formData.capacity);
    const floor = parseInt(formData.floor);

    if (isNaN(tableNumber) || isNaN(capacity) || isNaN(floor)) {
      toast.error(t('table.error.invalid_number'));
      return;
    }

    if (capacity < 1) {
        toast.error(t('table.error.min_capacity'));
        return;
    }

    if (floor < 1) {
        toast.error(t('table.error.min_floor'));
        return;
    }

    setIsLoading(true);
    try {
      if (editingTable && editingTable.tableId) {
        // Update existing table
        const result = await apiClient.updateTable(restaurantId, editingTable.tableId, {
          tableNumber,
          floor,
          capacity,
        });

        if (result.success && result.data) {
          const updatedTable = mapBackendTableToFrontend(result.data);
          setTables(prev => prev.map(t => t.tableId === editingTable.tableId ? updatedTable : t));
          toast.success(t('table.success.updated'));
          setIsSheetOpen(false);
          setEditingTable(null);
          setFormData({ id: '', capacity: '', floor: '' });
        } else {
          throw new Error(result.error?.message || t('table.error.update_failed'));
        }
      } else {
        // Create new table
        const result = await apiClient.createTable(restaurantId, {
          tableNumber,
          floor,
          capacity,
        });

        if (result.success && result.data) {
          const newTable = mapBackendTableToFrontend(result.data);
          setTables(prev => [...prev, newTable].sort((a, b) => a.id - b.id));
          toast.success(t('table.success.added'));
          setIsSheetOpen(false);
          setEditingTable(null);
          setFormData({ id: '', capacity: '', floor: '' });
        } else {
          throw new Error(result.error?.message || t('table.error.update_failed'));
        }
      }
    } catch (error: unknown) {
      console.error('Error saving table:', error);
      const errorMessage = error instanceof Error ? error.message : t('table.error.update_failed');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddSheet = () => {
    setEditingTable(null);
    // Find next available ID
    const nextId = tables.length > 0 ? Math.max(...tables.map(t => t.id)) + 1 : 1;
    setFormData({ id: nextId.toString(), capacity: '4', floor: '1' });
    setIsSheetOpen(true);
  };

  const openEditSheet = (table: Table) => {
    setEditingTable(table);
    setFormData({ 
        id: table.id.toString(), 
        capacity: table.capacity?.toString() || '4',
        floor: table.floor?.toString() || '1'
    });
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    const table = tables.find(t => t.id === id);
    if (!table || !table.tableId) {
      toast.error(t('table.error.table_not_found'));
      return;
    }

    if (table.status !== 'empty') {
        toast.error(t('table.error.cannot_delete_active'));
        return;
    }

    if (!confirm(t('table.management.delete_confirm').replace('{number}', id.toString()))) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.deleteTable(restaurantId, table.tableId!);
      if (result.success) {
        setTables(prev => prev.filter(t => t.id !== id));
        toast.success(t('table.success.deleted'));
      } else {
        throw new Error(result.error?.message || t('table.error.update_failed'));
      }
    } catch (error: unknown) {
      console.error('Error deleting table:', error);
      const errorMessage = error instanceof Error ? error.message : t('table.error.update_failed');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (table: Table) => {
    if (!restaurantId) {
      toast.error(t('table.error.restaurant_id_required'));
      return;
    }

    if (!table.tableId) {
      toast.error(t('table.error.table_not_found'));
      return;
    }

    if (table.isActive && table.status !== 'empty') {
      toast.error(t('table.error.cannot_deactivate_active'));
      return;
    }

    setTogglingTableId(table.tableId);
    try {
      const result = await apiClient.updateTable(restaurantId, table.tableId, {
        isActive: !table.isActive,
      });

      if (result.success && result.data) {
        const updatedTable = mapBackendTableToFrontend(result.data);
        setTables(prev => prev.map(t => t.tableId === table.tableId ? updatedTable : t));
        await reloadTables();
        toast.success(table.isActive ? t('table.success.deactivated') : t('table.success.activated'));
      } else {
        throw new Error(result.error?.message || t('table.error.update_failed'));
      }
    } catch (error: unknown) {
      console.error('Error toggling table active state:', error);
      const errorMessage = error instanceof Error ? error.message : t('table.error.update_failed');
      toast.error(errorMessage);
    } finally {
      setTogglingTableId(null);
    }
  };

  return (
    <div className={`mx-auto max-w-5xl space-y-6 pb-32 md:pb-6 ${isEmbedded ? 'px-6 pt-2' : 'p-6'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {isEmbedded && (
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900 hidden md:block">{t('table.management.title')}</h3>
                <Badge variant="secondary" className="text-secondary-foreground font-medium">
                    {t('table.management.total').replace('{count}', tables.length.toString())}
                </Badge>
            </div>
        )}
        
        <div className="flex items-center gap-3 ml-auto">
          <button 
            onClick={openAddSheet}
            className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200 active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            {t('table.management.add_table')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-zinc-400">{t('table.management.empty')}</div>
          </div>
        ) : (
          [...tables].sort((a, b) => {
            // 먼저 층(floor)으로 정렬, 그 다음 테이블 번호(id)로 정렬
            if (a.floor !== b.floor) {
              return a.floor - b.floor;
            }
            return a.id - b.id;
          }).map((table) => (
            <div 
                key={table.id} 
                className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm relative group hover:shadow-md transition-all"
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                        <div className="bg-zinc-100 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-zinc-900">
                            {table.id}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase text-center">{table.floor || 1}F</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 hover:bg-zinc-100 rounded-lg outline-none">
                            <MoreHorizontal size={16} className="text-zinc-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('table.management.table_label').replace('{number}', table.id.toString())}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditSheet(table)} className="gap-2">
                                <Edit2 size={14} /> {t('table.management.edit_details')}
                            </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleToggleActive(table)}
                            className="gap-2"
                            disabled={togglingTableId === table.tableId}
                        >
                            {table.isActive ? <CircleOff size={14} /> : <CheckCircle2 size={14} />}
                            {table.isActive ? t('table.management.deactivate') : t('table.management.activate')}
                        </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(table.id)} className="text-rose-600 gap-2">
                                <Trash2 size={14} /> {t('table.management.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2 text-zinc-900 font-bold">
                    <Users size={16} className="text-zinc-400" />
                    {table.capacity || 4}
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-50">
                    <span
                        className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                          table.isActive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                    >
                        {table.isActive ? t('table.management.active') : t('table.management.inactive')}
                    </span>
                </div>
            </div>
          ))
        )}
      </div>

      {isDesktop ? (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent 
                side="right"
                className="w-[400px] h-full rounded-l-[32px] rounded-bl-[32px] sm:max-w-[400px] p-0 bg-white border-none outline-none flex flex-col overflow-hidden"
            >
            <SheetHeader className="px-6 py-5 border-b border-zinc-100 mb-0">
                <SheetTitle>{editingTable ? t('table.management.edit_table') : t('table.management.add_new_table')}</SheetTitle>
                <SheetDescription>{t('table.management.configure_desc')}</SheetDescription>
            </SheetHeader>
            <TableFormContent 
                editingTable={editingTable}
                formData={formData}
                setFormData={setFormData}
                handleSave={handleSave}
                onCancel={() => setIsSheetOpen(false)}
                isLoading={isLoading}
            />
            </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <DrawerContent className="h-[90vh] rounded-t-[32px] bg-white p-0">
                <DrawerHeader className="px-6 py-5 border-b border-zinc-100 mb-0 text-left">
                    <DrawerTitle>{editingTable ? t('table.management.edit_table') : t('table.management.add_new_table')}</DrawerTitle>
                    <DrawerDescription>{t('table.management.configure_desc')}</DrawerDescription>
                </DrawerHeader>
                <TableFormContent 
                    editingTable={editingTable}
                    formData={formData}
                    setFormData={setFormData}
                    handleSave={handleSave}
                    onCancel={() => setIsSheetOpen(false)}
                />
            </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function TableFormContent({ editingTable, formData, setFormData, handleSave, onCancel, isLoading }: any) {
    const { t } = useLanguage();
    
    return (
        <div className="flex flex-col h-full">
            <div className="p-6 space-y-6">
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900">{t('table.management.table_number_label')}</label>
                    <Input 
                        value={formData.id}
                        onChange={(e) => setFormData({...formData, id: e.target.value})}
                        placeholder={t('table.management.table_number_placeholder')}
                        type="number"
                        className="font-mono text-lg bg-white border border-zinc-200"
                    />
                    <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1">
                        {t('table.management.table_number_desc')}
                    </p>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900">{t('table.management.floor_label')}</label>
                    <div className="relative">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                        <Input 
                            value={formData.floor}
                            onChange={(e) => setFormData({...formData, floor: e.target.value})}
                            placeholder={t('table.management.floor_placeholder')}
                            type="number"
                            className="pl-9 bg-white border border-zinc-200"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1">
                        {t('table.management.floor_desc')}
                    </p>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900">{t('table.management.capacity_label')}</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                        <Input 
                            value={formData.capacity}
                            onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                            placeholder={t('table.management.capacity_placeholder')}
                            type="number"
                            className="pl-9 bg-white border border-zinc-200"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1">
                        {t('table.management.capacity_desc')}
                    </p>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-zinc-100 grid grid-cols-2 gap-3 mt-auto sticky bottom-0 z-10 pb-8 md:pb-4">
                <button 
                    onClick={onCancel}
                    className="h-12 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-sm hover:bg-zinc-200 transition-colors"
                >
                    {t('btn.cancel')}
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t('table.management.saving') : (editingTable ? t('table.management.save_changes') : t('table.management.add_table_button'))}
                </button>
            </div>
        </div>
    );
}