import React, { useState, useEffect } from 'react';
import { MenuItem, MenuCategory } from '../../data';
import { Tag, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Check, Upload, ArrowUp, ArrowDown, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { mapBackendCategoryToFrontend, mapBackendMenuItemToFrontend, mapFrontendCategoryToBackend, mapFrontendMenuItemToBackend } from '../../utils/mappers';
import { BackendMenuCategory, BackendMenuItem } from '../../types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';
import { formatPriceVND } from '../../utils/priceFormat';
import { Language } from '../../context/LanguageContext';

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

interface MenuManagerProps {
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  categories: MenuCategory[];
  setCategories: React.Dispatch<React.SetStateAction<MenuCategory[]>>;
  isEmbedded?: boolean;
}

export function MenuManager({ menu, setMenu, categories, setCategories, isEmbedded = false }: MenuManagerProps) {
  const { t, language } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [backendCategories, setBackendCategories] = useState<BackendMenuCategory[]>([]);
  const [backendMenuItems, setBackendMenuItems] = useState<BackendMenuItem[]>([]);

  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // --- Category Management ---
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameKo, setNewCategoryNameKo] = useState('');
  const [newCategoryNameVn, setNewCategoryNameVn] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  const [newCategoryNameZh, setNewCategoryNameZh] = useState('');
  const [newCategoryNameRu, setNewCategoryNameRu] = useState('');

  // Load menu and categories from API on mount
  useEffect(() => {
    if (restaurantId) {
      loadMenu();
    }
  }, [restaurantId, language]);

  const loadMenu = async () => {
    if (!restaurantId) return;
    
    setIsLoadingList(true);
    try {
      const result = await apiClient.getMenu(restaurantId);
      if (result.success && result.data) {
        // Backend returns categories with menuItems nested
        const loadedCategories: MenuCategory[] = [];
        const loadedMenu: MenuItem[] = [];
        
        // 원본 백엔드 카테고리 데이터 저장 (편집 시 다국어 필드 사용)
        setBackendCategories(result.data);
        
        // 원본 백엔드 메뉴 아이템 데이터 저장 (편집 시 다국어 필드 사용)
        const allBackendItems: BackendMenuItem[] = [];
        result.data.forEach((category: BackendMenuCategory) => {
          loadedCategories.push(mapBackendCategoryToFrontend(category, language));
          
          (category.menuItems || []).forEach((item: BackendMenuItem) => {
            loadedMenu.push(mapBackendMenuItemToFrontend(item, language));
            allBackendItems.push(item);
          });
        });
        
        setBackendMenuItems(allBackendItems);
        setCategories(loadedCategories);
        setMenu(loadedMenu);
      } else {
        toast.error(result.error?.message || '메뉴 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('Error loading menu:', error);
      toast.error('메뉴 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleAddCategory = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    if (!newCategoryNameKo.trim() || !newCategoryNameVn.trim()) {
      toast.error('한국어와 베트남어 카테고리 이름은 필수입니다.');
      return;
    }

    setIsLoading(true);
    try {
      const backendData = {
        nameKo: newCategoryNameKo.trim(),
        nameVn: newCategoryNameVn.trim(),
        nameEn: newCategoryNameEn.trim() || undefined,
        nameZh: newCategoryNameZh.trim() || undefined,
        nameRu: newCategoryNameRu.trim() || undefined,
        displayOrder: categories.length,
      };

      const result = await apiClient.createCategory(restaurantId, backendData);
      if (result.success && result.data) {
        const newCat = mapBackendCategoryToFrontend(result.data, language);
        setCategories(prev => [...prev, newCat].sort((a, b) => a.order - b.order));
        // 백엔드 카테고리 데이터도 추가
        setBackendCategories(prev => [...prev, result.data]);
        setNewCategoryName('');
        setNewCategoryNameKo('');
        setNewCategoryNameVn('');
        setNewCategoryNameEn('');
        setNewCategoryNameZh('');
        setNewCategoryNameRu('');
        setIsCategorySheetOpen(false);
        toast.success(t('msg.cat_added'));
      } else {
        throw new Error(result.error?.message || '카테고리 추가에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error creating category:', error);
      const errorMessage = error instanceof Error ? error.message : '카테고리 추가에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (id: string, data: { nameKo: string; nameVn: string; nameEn?: string; nameZh?: string; nameRu?: string }) => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    if (!data.nameKo.trim() || !data.nameVn.trim()) {
      toast.error('한국어와 베트남어 카테고리 이름은 필수입니다.');
      return;
    }

    setIsLoading(true);
    try {
      const backendData = {
        nameKo: data.nameKo.trim(),
        nameVn: data.nameVn.trim(),
        nameEn: data.nameEn?.trim() || undefined,
        nameZh: data.nameZh?.trim() || undefined,
      };

      const result = await apiClient.updateCategory(restaurantId, id, backendData);
      if (result.success && result.data) {
        const updatedCat = mapBackendCategoryToFrontend(result.data, language);
        setCategories(prev => prev.map(c => c.id === id ? updatedCat : c).sort((a, b) => a.order - b.order));
        // 백엔드 카테고리 데이터도 업데이트
        setBackendCategories(prev => prev.map(c => c.id === id ? result.data : c));
        toast.success('카테고리가 성공적으로 수정되었습니다');
      } else {
        throw new Error(result.error?.message || '카테고리 수정에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error updating category:', error);
      const errorMessage = error instanceof Error ? error.message : '카테고리 수정에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderCategory = async (categoryId: string, direction: 'up' | 'down') => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    const currentIndex = sortedCategories.findIndex(c => c.id === categoryId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= sortedCategories.length) {
      return; // 이미 맨 위나 맨 아래
    }

    const currentCategory = sortedCategories[currentIndex];
    const targetCategory = sortedCategories[newIndex];

    setIsLoading(true);
    try {
      // 두 카테고리의 displayOrder를 교환
      const currentOrder = currentCategory.order;
      const targetOrder = targetCategory.order;

      // 현재 카테고리의 순서를 변경
      const result1 = await apiClient.updateCategory(restaurantId, categoryId, {
        displayOrder: targetOrder,
      });

      // 대상 카테고리의 순서를 변경
      const result2 = await apiClient.updateCategory(restaurantId, targetCategory.id, {
        displayOrder: currentOrder,
      });

      if (result1.success && result2.success) {
        // 로컬 상태 업데이트
        setCategories(prev => {
          const updated = prev.map(c => {
            if (c.id === categoryId) {
              return { ...c, order: targetOrder };
            }
            if (c.id === targetCategory.id) {
              return { ...c, order: currentOrder };
            }
            return c;
          });
          return updated.sort((a, b) => a.order - b.order);
        });
        toast.success('카테고리 순서가 변경되었습니다');
      } else {
        throw new Error('카테고리 순서 변경에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error reordering category:', error);
      const errorMessage = error instanceof Error ? error.message : '카테고리 순서 변경에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    if (menu.some(m => m.categoryId === id)) {
      toast.error(t('msg.cat_has_items'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.deleteCategory(restaurantId, id);
      if (result.success) {
        setCategories(prev => prev.filter(c => c.id !== id));
        // 백엔드 카테고리 데이터도 삭제
        setBackendCategories(prev => prev.filter(c => c.id !== id));
        toast.success(t('msg.cat_deleted'));
      } else {
        throw new Error(result.error?.message || '카테고리 삭제에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error deleting category:', error);
      const errorMessage = error instanceof Error ? error.message : '카테고리 삭제에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Item Management ---
  const handleAddNewItem = (categoryId: string) => {
    setEditingItem({
      id: `m-${Date.now()}`,
      categoryId,
      name: '',
      nameKo: '',
      nameVn: '',
      nameEn: '',
      nameZh: '',
      nameRu: '',
      description: '',
      descriptionKo: '',
      descriptionVn: '',
      descriptionEn: '',
      descriptionZh: '',
      descriptionRu: '',
      price: 0,
      isSoldOut: false,
      optionGroups: []
    } as any);
    setIsItemSheetOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    // 원본 백엔드 메뉴 아이템 데이터에서 다국어 필드 가져오기
    const backendItem = backendMenuItems.find((bi: BackendMenuItem) => bi.id === item.id);
    const editingItemWithMultilang = {
      ...item,
      // 다국어 필드 추가 (편집용)
      nameKo: backendItem?.nameKo || item.name,
      nameVn: backendItem?.nameVn || item.name,
      nameEn: backendItem?.nameEn || '',
      nameZh: backendItem?.nameZh || '',
      nameRu: backendItem?.nameRu || '',
      descriptionKo: backendItem?.descriptionKo || item.description || '',
      descriptionVn: backendItem?.descriptionVn || item.description || '',
      descriptionEn: backendItem?.descriptionEn || '',
      descriptionZh: backendItem?.descriptionZh || '',
      descriptionRu: backendItem?.descriptionRu || '',
      // 옵션 그룹도 다국어 필드 추가
      optionGroups: item.optionGroups.map((og: any) => {
        const backendOg = backendItem?.optionGroups?.find((bog: any) => bog.id === og.id);
        return {
          ...og,
          nameKo: backendOg?.nameKo || og.name,
          nameVn: backendOg?.nameVn || og.name,
          nameEn: backendOg?.nameEn || '',
          nameZh: backendOg?.nameZh || '',
          nameRu: backendOg?.nameRu || '',
          options: og.options.map((opt: any) => {
            const backendOpt = backendOg?.options?.find((bopt: any) => bopt.id === opt.id);
            return {
              ...opt,
              nameKo: backendOpt?.nameKo || opt.name,
              nameVn: backendOpt?.nameVn || opt.name,
              nameEn: backendOpt?.nameEn || '',
              nameZh: backendOpt?.nameZh || '',
              nameRu: backendOpt?.nameRu || '',
            };
          }),
        };
      }),
    };
    setEditingItem(editingItemWithMultilang as any);
    setIsItemSheetOpen(true);
  };

  const handleSaveItem = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    // 다국어 필드 검증
    const nameKo = (editingItem as any).nameKo?.trim() || '';
    const nameVn = (editingItem as any).nameVn?.trim() || '';
    if (!nameKo || !nameVn) {
      toast.error('한국어와 베트남어 메뉴 이름은 필수입니다.');
      return;
    }

    setIsLoading(true);
    try {
      // 다국어 필드를 직접 사용하여 백엔드 데이터 생성
      const backendData = {
        categoryId: editingItem.categoryId,
        restaurantId,
        nameKo,
        nameVn,
        nameEn: (editingItem as any).nameEn?.trim() || undefined,
        nameZh: (editingItem as any).nameZh?.trim() || undefined,
        nameRu: (editingItem as any).nameRu?.trim() || undefined,
        descriptionKo: (editingItem as any).descriptionKo?.trim() || undefined,
        descriptionVn: (editingItem as any).descriptionVn?.trim() || undefined,
        descriptionEn: (editingItem as any).descriptionEn?.trim() || undefined,
        descriptionZh: (editingItem as any).descriptionZh?.trim() || undefined,
        descriptionRu: (editingItem as any).descriptionRu?.trim() || undefined,
        priceVnd: editingItem.price || 0,
        imageUrl: editingItem.imageUrl || undefined,
        isSoldOut: editingItem.isSoldOut || false,
        displayOrder: 0,
        optionGroups: editingItem.optionGroups.map((og: any) => ({
          nameKo: og.nameKo?.trim() || og.name || '',
          nameVn: og.nameVn?.trim() || og.name || '',
          nameEn: og.nameEn?.trim() || undefined,
          nameZh: og.nameZh?.trim() || undefined,
          nameRu: og.nameRu?.trim() || undefined,
          minSelect: og.minSelect || 0,
          maxSelect: og.maxSelect || 1,
          options: og.options.map((opt: any) => ({
            nameKo: opt.nameKo?.trim() || opt.name || '',
            nameVn: opt.nameVn?.trim() || opt.name || '',
            nameEn: opt.nameEn?.trim() || undefined,
            nameZh: opt.nameZh?.trim() || undefined,
            nameRu: opt.nameRu?.trim() || undefined,
            priceVnd: opt.price || 0,
          })),
        })),
      };
      
      if (editingItem.id.startsWith('m-')) {
        // New item (temporary ID)
        const result = await apiClient.createMenuItem(restaurantId, backendData);
        if (result.success && result.data) {
          const newItem = mapBackendMenuItemToFrontend(result.data, language);
          setMenu(prev => [...prev, newItem]);
          // 백엔드 메뉴 아이템 데이터도 추가
          setBackendMenuItems(prev => [...prev, result.data]);
          setIsItemSheetOpen(false);
          setEditingItem(null);
          toast.success(t('msg.item_saved'));
        } else {
          throw new Error(result.error?.message || '메뉴 아이템 추가에 실패했습니다');
        }
      } else {
        // Update existing item
        const result = await apiClient.updateMenuItem(restaurantId, editingItem.id, backendData);
        if (result.success && result.data) {
          const updatedItem = mapBackendMenuItemToFrontend(result.data, language);
          setMenu(prev => prev.map(m => m.id === editingItem.id ? updatedItem : m));
          // 백엔드 메뉴 아이템 데이터도 업데이트
          setBackendMenuItems(prev => prev.map(m => m.id === editingItem.id ? result.data : m));
          setIsItemSheetOpen(false);
          setEditingItem(null);
          toast.success(t('msg.item_saved'));
        } else {
          throw new Error(result.error?.message || '메뉴 아이템 수정에 실패했습니다');
        }
      }
    } catch (error: unknown) {
      console.error('Error saving menu item:', error);
      const errorMessage = error instanceof Error ? error.message : '메뉴 아이템 저장에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    if (!editingItem) return;

    setIsLoading(true);
    try {
      const result = await apiClient.deleteMenuItem(restaurantId, editingItem.id);
      if (result.success) {
        setMenu(prev => prev.filter(m => m.id !== editingItem.id));
        // 백엔드 메뉴 아이템 데이터도 삭제
        setBackendMenuItems(prev => prev.filter(m => m.id !== editingItem.id));
        setIsItemSheetOpen(false);
        setEditingItem(null);
        toast.success(t('msg.item_deleted'));
      } else {
        throw new Error(result.error?.message || '메뉴 아이템 삭제에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error deleting menu item:', error);
      const errorMessage = error instanceof Error ? error.message : '메뉴 아이템 삭제에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStock = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    const item = menu.find(m => m.id === id);
    if (!item) return;

    const newState = !item.isSoldOut;
    
    setIsLoading(true);
    try {
      const result = await apiClient.updateMenuItem(restaurantId, id, {
        isSoldOut: newState,
      });
      
      if (result.success && result.data) {
        const updatedItem = mapBackendMenuItemToFrontend(result.data, language);
        setMenu(prev => prev.map(m => m.id === id ? updatedItem : m));
        toast(newState ? t('msg.soldout_on') : t('msg.soldout_off'), {
          description: item.name,
          duration: 2000,
        });
      } else {
        throw new Error(result.error?.message || '재고 상태 변경에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error toggling stock:', error);
      const errorMessage = error instanceof Error ? error.message : '재고 상태 변경에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`mx-auto w-full ${isEmbedded ? 'px-6 pb-32 md:pb-6' : 'p-6 max-w-7xl pb-32 md:pb-6'}`}>
      {!isEmbedded && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{t('menu.title')}</h2>
            <button 
              onClick={() => setIsCategorySheetOpen(true)}
              className="text-xs font-bold bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-colors"
            >
              {t('menu.manage_categories')}
            </button>
          </div>
      )}

      {isEmbedded && (
        <div className="flex justify-end mb-4">
            <button 
              onClick={() => setIsCategorySheetOpen(true)}
              className="text-xs font-bold bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-colors"
            >
              {t('menu.manage_categories')}
            </button>
        </div>
      )}

      {isLoadingList ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-400">메뉴 목록을 불러오는 중...</div>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-zinc-400 mb-4">등록된 카테고리가 없습니다</div>
          <button
            onClick={() => setIsCategorySheetOpen(true)}
            className="text-sm font-bold bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            첫 번째 카테고리 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-8">
        {categories.sort((a, b) => a.order - b.order).map(cat => (
          <div key={cat.id}>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
              <Tag size={12}/> {cat.name}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {menu.filter(m => m.categoryId === cat.id).map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleEditItem(item)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer hover:shadow-md"
                >
                  <div className={cn(
                    "w-16 h-16 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0",
                    item.isSoldOut && "opacity-50"
                  )}>
                     {item.imageUrl ? (
                       <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl"/>
                     ) : (
                       <ImageIcon size={24} className="text-zinc-300"/>
                     )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className={cn("font-bold text-zinc-900 truncate", item.isSoldOut && "text-zinc-400 line-through")}>
                        {item.name}
                      </h4>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">{formatPriceVND(item.price)}</p>
                    <p className="text-xs text-zinc-400 mt-1 truncate">
                        {item.optionGroups.length > 0 ? `${item.optionGroups.length} ${t('menu.option_groups')}` : t('menu.no_options')}
                    </p>
                  </div>

                  <button 
                    onClick={(e) => toggleStock(item.id, e)}
                    className={cn(
                      "h-8 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                      item.isSoldOut 
                        ? "bg-zinc-100 text-zinc-400" 
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    {item.isSoldOut ? t('menu.soldout') : t('menu.on_sale')}
                  </button>
                </div>
              ))}

              <button 
                onClick={() => handleAddNewItem(cat.id)}
                className="p-4 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400 flex items-center justify-center gap-2 hover:bg-zinc-50 hover:border-zinc-300 transition-all font-medium text-sm min-h-[100px]"
              >
                <Plus size={16}/> {t('menu.add_item')}
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Category Manager Sheet/Drawer */}
      {isDesktop ? (
        <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
          <SheetContent side="right" className="w-[400px] h-full rounded-l-[32px] rounded-bl-[32px] sm:max-w-[400px] p-0 bg-white border-none outline-none flex flex-col overflow-hidden">
            <SheetHeader className="px-6 py-5 border-b border-zinc-100 mb-0">
              <SheetTitle>{t('dialog.cat.title')}</SheetTitle>
              <SheetDescription>{t('dialog.cat.desc')}</SheetDescription>
            </SheetHeader>
            <CategoryManagerContent 
              categories={categories}
              backendCategories={backendCategories}
              handleDeleteCategory={handleDeleteCategory}
              handleUpdateCategory={handleUpdateCategory}
              handleReorderCategory={handleReorderCategory}
              newCategoryName={newCategoryName} 
              setNewCategoryName={setNewCategoryName}
              newCategoryNameKo={newCategoryNameKo}
              setNewCategoryNameKo={setNewCategoryNameKo}
              newCategoryNameVn={newCategoryNameVn}
              setNewCategoryNameVn={setNewCategoryNameVn}
              newCategoryNameEn={newCategoryNameEn}
              setNewCategoryNameEn={setNewCategoryNameEn}
              newCategoryNameZh={newCategoryNameZh}
              setNewCategoryNameZh={setNewCategoryNameZh}
              newCategoryNameRu={newCategoryNameRu}
              setNewCategoryNameRu={setNewCategoryNameRu}
              handleAddCategory={handleAddCategory} 
              onClose={() => setIsCategorySheetOpen(false)}
              t={t}
              isLoading={isLoading}
              language={language}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
          <DrawerContent className="h-[90vh] rounded-t-[32px] p-0 bg-white flex flex-col">
            <DrawerHeader className="px-6 py-5 border-b border-zinc-100 mb-0 text-left">
              <DrawerTitle>{t('dialog.cat.title')}</DrawerTitle>
              <DrawerDescription>{t('dialog.cat.desc')}</DrawerDescription>
            </DrawerHeader>
            <CategoryManagerContent 
              categories={categories}
              backendCategories={backendCategories}
              handleDeleteCategory={handleDeleteCategory}
              handleUpdateCategory={handleUpdateCategory}
              handleReorderCategory={handleReorderCategory}
              newCategoryName={newCategoryName} 
              setNewCategoryName={setNewCategoryName}
              newCategoryNameKo={newCategoryNameKo}
              setNewCategoryNameKo={setNewCategoryNameKo}
              newCategoryNameVn={newCategoryNameVn}
              setNewCategoryNameVn={setNewCategoryNameVn}
              newCategoryNameEn={newCategoryNameEn}
              setNewCategoryNameEn={setNewCategoryNameEn}
              newCategoryNameZh={newCategoryNameZh}
              setNewCategoryNameZh={setNewCategoryNameZh}
              newCategoryNameRu={newCategoryNameRu}
              setNewCategoryNameRu={setNewCategoryNameRu}
              handleAddCategory={handleAddCategory} 
              onClose={() => setIsCategorySheetOpen(false)}
              t={t}
              isLoading={isLoading}
              language={language}
            />
          </DrawerContent>
        </Drawer>
      )}

      {/* Item Editor Sheet/Drawer */}
      {isDesktop ? (
        <Sheet open={isItemSheetOpen} onOpenChange={setIsItemSheetOpen}>
          <SheetContent side="right" className="w-[500px] h-full rounded-l-[32px] rounded-bl-[32px] sm:max-w-[500px] p-0 bg-white border-none outline-none flex flex-col overflow-hidden">
            <SheetHeader className="px-6 py-5 border-b border-zinc-100 mb-0">
              <SheetTitle>{t('sheet.edit.title')}</SheetTitle>
              <SheetDescription>{t('sheet.edit.desc')}</SheetDescription>
            </SheetHeader>
            {editingItem && (
               <ItemEditorContent 
                  editingItem={editingItem}
                  setEditingItem={setEditingItem}
                  categories={categories}
                  handleDeleteItem={handleDeleteItem}
                  handleSaveItem={handleSaveItem}
                  t={t}
                  isLoading={isLoading}
                  language={language}
               />
            )}
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isItemSheetOpen} onOpenChange={setIsItemSheetOpen}>
           <DrawerContent className="h-[90vh] rounded-t-[32px] p-0 bg-white mt-24 flex flex-col">
             <DrawerHeader className="px-6 py-5 border-b border-zinc-100 mb-0 text-left">
               <DrawerTitle>{t('sheet.edit.title')}</DrawerTitle>
               <DrawerDescription>{t('sheet.edit.desc')}</DrawerDescription>
             </DrawerHeader>
             {editingItem && (
                <ItemEditorContent 
                   editingItem={editingItem}
                   setEditingItem={setEditingItem}
                   categories={categories}
                   handleDeleteItem={handleDeleteItem}
                   handleSaveItem={handleSaveItem}
                   t={t}
                   language={language}
                />
             )}
           </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

// Extracted Components to avoid duplication
function CategoryManagerContent({ 
  categories, 
  backendCategories,
  handleDeleteCategory, 
  handleUpdateCategory, 
  handleReorderCategory, 
  newCategoryName, 
  setNewCategoryName,
  newCategoryNameKo,
  setNewCategoryNameKo,
  newCategoryNameVn,
  setNewCategoryNameVn,
  newCategoryNameEn,
  setNewCategoryNameEn,
  newCategoryNameZh,
  setNewCategoryNameZh,
  newCategoryNameRu,
  setNewCategoryNameRu,
  handleAddCategory, 
  onClose, 
  t, 
  isLoading, 
  language 
}: any) {
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryNameKo, setEditingCategoryNameKo] = useState('');
    const [editingCategoryNameVn, setEditingCategoryNameVn] = useState('');
    const [editingCategoryNameEn, setEditingCategoryNameEn] = useState('');
    const [editingCategoryNameZh, setEditingCategoryNameZh] = useState('');
    const [editingCategoryNameRu, setEditingCategoryNameRu] = useState('');

    // 번역 상태
    const [isTranslatingNewCategory, setIsTranslatingNewCategory] = useState(false);
    const [isTranslatingEditCategory, setIsTranslatingEditCategory] = useState(false);

    // 새 카테고리 번역 함수
    const handleTranslateNewCategory = async (sourceLang: Language) => {
      const sourceValue = 
        sourceLang === 'en' ? newCategoryNameEn :
        sourceLang === 'vn' ? newCategoryNameVn :
        sourceLang === 'ko' ? newCategoryNameKo :
        sourceLang === 'zh' ? newCategoryNameZh :
        sourceLang === 'ru' ? newCategoryNameRu : '';

      if (!sourceValue.trim()) {
        toast.error('번역할 내용이 없습니다.');
        return;
      }

      setIsTranslatingNewCategory(true);
      try {
        const result = await apiClient.translateToAllLanguages(sourceValue.trim(), sourceLang);
        if (result.success && result.data?.translations) {
          const translations = result.data.translations as Record<Language, string>;
          setNewCategoryNameEn(translations.en || newCategoryNameEn);
          setNewCategoryNameVn(translations.vn || newCategoryNameVn);
          setNewCategoryNameKo(translations.ko || newCategoryNameKo);
          setNewCategoryNameZh(translations.zh || newCategoryNameZh);
          setNewCategoryNameRu(translations.ru || newCategoryNameRu);
          toast.success('번역이 완료되었습니다.');
        } else {
          toast.error('번역에 실패했습니다.');
        }
      } catch (error) {
        console.error('Translation error:', error);
        toast.error('번역 중 오류가 발생했습니다.');
      } finally {
        setIsTranslatingNewCategory(false);
      }
    };

    // 카테고리 수정 번역 함수
    const handleTranslateEditCategory = async (sourceLang: Language) => {
      const sourceValue = 
        sourceLang === 'en' ? editingCategoryNameEn :
        sourceLang === 'vn' ? editingCategoryNameVn :
        sourceLang === 'ko' ? editingCategoryNameKo :
        sourceLang === 'zh' ? editingCategoryNameZh :
        sourceLang === 'ru' ? editingCategoryNameRu : '';

      if (!sourceValue.trim()) {
        toast.error('번역할 내용이 없습니다.');
        return;
      }

      setIsTranslatingEditCategory(true);
      try {
        const result = await apiClient.translateToAllLanguages(sourceValue.trim(), sourceLang);
        if (result.success && result.data?.translations) {
          const translations = result.data.translations as Record<Language, string>;
          setEditingCategoryNameEn(translations.en || editingCategoryNameEn);
          setEditingCategoryNameVn(translations.vn || editingCategoryNameVn);
          setEditingCategoryNameKo(translations.ko || editingCategoryNameKo);
          setEditingCategoryNameZh(translations.zh || editingCategoryNameZh);
          setEditingCategoryNameRu(translations.ru || editingCategoryNameRu);
          toast.success('번역이 완료되었습니다.');
        } else {
          toast.error('번역에 실패했습니다.');
        }
      } catch (error) {
        console.error('Translation error:', error);
        toast.error('번역 중 오류가 발생했습니다.');
      } finally {
        setIsTranslatingEditCategory(false);
      }
    };

    const startEdit = (cat: any) => {
        setEditingCategoryId(cat.id);
        // 원본 백엔드 카테고리 데이터에서 다국어 필드 가져오기
        const backendCat = backendCategories.find((bc: any) => bc.id === cat.id);
        if (backendCat) {
          setEditingCategoryNameKo(backendCat.nameKo || '');
          setEditingCategoryNameVn(backendCat.nameVn || '');
          setEditingCategoryNameEn(backendCat.nameEn || '');
          setEditingCategoryNameZh(backendCat.nameZh || '');
          setEditingCategoryNameRu(backendCat.nameRu || '');
        } else {
          // 백엔드 데이터가 없으면 현재 표시된 이름 사용
          setEditingCategoryNameKo(cat.name || '');
          setEditingCategoryNameVn(cat.name || '');
          setEditingCategoryNameEn(cat.name || '');
          setEditingCategoryNameZh(cat.name || '');
          setEditingCategoryNameRu(cat.name || '');
        }
    };

    const cancelEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryNameKo('');
        setEditingCategoryNameVn('');
        setEditingCategoryNameEn('');
        setEditingCategoryNameZh('');
        setEditingCategoryNameRu('');
    };

    const saveEdit = async () => {
        if (editingCategoryId && editingCategoryNameKo.trim() && editingCategoryNameVn.trim()) {
            await handleUpdateCategory(editingCategoryId, {
                nameKo: editingCategoryNameKo.trim(),
                nameVn: editingCategoryNameVn.trim(),
                nameEn: editingCategoryNameEn.trim() || undefined,
                nameZh: editingCategoryNameZh.trim() || undefined,
                nameRu: editingCategoryNameRu.trim() || undefined,
            });
            setEditingCategoryId(null);
            setEditingCategoryNameKo('');
            setEditingCategoryNameVn('');
            setEditingCategoryNameEn('');
            setEditingCategoryNameZh('');
            setEditingCategoryNameRu('');
        }
    };

    const sortedCategories = [...categories].sort((a: any, b: any) => a.order - b.order);

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
             <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {sortedCategories.map((cat: any, index: number) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                      {editingCategoryId === cat.id ? (
                        <div className="w-full space-y-4">
                          {/* 영어 섹션 */}
                          <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold text-zinc-900">영어 *</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleTranslateEditCategory('en')}
                                disabled={isTranslatingEditCategory || !editingCategoryNameEn.trim()}
                                className="h-7 text-xs"
                              >
                                {isTranslatingEditCategory ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    번역 중...
                                  </>
                                ) : (
                                  <>
                                    <Languages className="w-3 h-3 mr-1" />
                                    번역
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                              <Input
                                value={editingCategoryNameEn}
                                onChange={(e) => setEditingCategoryNameEn(e.target.value)}
                                className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                                placeholder="예: Food"
                              />
                            </div>
                          </div>

                          {/* 베트남어 섹션 */}
                          <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold text-zinc-900">베트남어</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleTranslateEditCategory('vn')}
                                disabled={isTranslatingEditCategory || !editingCategoryNameVn.trim()}
                                className="h-7 text-xs"
                              >
                                {isTranslatingEditCategory ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    번역 중...
                                  </>
                                ) : (
                                  <>
                                    <Languages className="w-3 h-3 mr-1" />
                                    번역
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                              <Input
                                value={editingCategoryNameVn}
                                onChange={(e) => setEditingCategoryNameVn(e.target.value)}
                                className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                                placeholder="예: Đồ ăn"
                              />
                            </div>
                          </div>

                          {/* 한국어 섹션 */}
                          <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold text-zinc-900">한국어</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleTranslateEditCategory('ko')}
                                disabled={isTranslatingEditCategory || !editingCategoryNameKo.trim()}
                                className="h-7 text-xs"
                              >
                                {isTranslatingEditCategory ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    번역 중...
                                  </>
                                ) : (
                                  <>
                                    <Languages className="w-3 h-3 mr-1" />
                                    번역
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-zinc-700">카테고리 이름 *</Label>
                              <Input
                                value={editingCategoryNameKo}
                                onChange={(e) => setEditingCategoryNameKo(e.target.value)}
                                className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                                placeholder="예: 음식"
                              />
                            </div>
                          </div>

                          {/* 중국어 섹션 */}
                          <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold text-zinc-900">중국어</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleTranslateEditCategory('zh')}
                                disabled={isTranslatingEditCategory || !editingCategoryNameZh.trim()}
                                className="h-7 text-xs"
                              >
                                {isTranslatingEditCategory ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    번역 중...
                                  </>
                                ) : (
                                  <>
                                    <Languages className="w-3 h-3 mr-1" />
                                    번역
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                              <Input
                                value={editingCategoryNameZh}
                                onChange={(e) => setEditingCategoryNameZh(e.target.value)}
                                className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                                placeholder="예: 食物"
                              />
                            </div>
                          </div>

                          {/* 러시아어 섹션 */}
                          <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold text-zinc-900">러시아어</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleTranslateEditCategory('ru')}
                                disabled={isTranslatingEditCategory || !editingCategoryNameRu.trim()}
                                className="h-7 text-xs"
                              >
                                {isTranslatingEditCategory ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    번역 중...
                                  </>
                                ) : (
                                  <>
                                    <Languages className="w-3 h-3 mr-1" />
                                    번역
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                              <Input
                                value={editingCategoryNameRu}
                                onChange={(e) => setEditingCategoryNameRu(e.target.value)}
                                className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                                placeholder="예: Еда"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 justify-end">
                              <button 
                                  onClick={saveEdit}
                                  disabled={isLoading || !editingCategoryNameKo.trim() || !editingCategoryNameVn.trim()}
                                  className="text-zinc-400 hover:text-emerald-500 p-2 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Check size={16}/>
                              </button>
                              <button 
                                  onClick={cancelEdit}
                                  disabled={isLoading}
                                  className="text-zinc-400 hover:text-zinc-500 p-2 hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                              <div className="flex flex-col gap-0.5">
                                  <button 
                                      onClick={() => handleReorderCategory(cat.id, 'up')}
                                      disabled={isLoading || index === 0}
                                      className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                      <ArrowUp size={14} />
                                  </button>
                                  <button 
                                      onClick={() => handleReorderCategory(cat.id, 'down')}
                                      disabled={isLoading || index === sortedCategories.length - 1}
                                      className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                      <ArrowDown size={14} />
                                  </button>
                              </div>
                              <div className="bg-white p-2 rounded-md border border-zinc-100 text-zinc-400">
                                  <Tag size={14} />
                              </div>
                              <span className="font-bold text-sm text-zinc-700">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                              <button 
                                  onClick={() => startEdit(cat)}
                                  disabled={isLoading}
                                  className="text-zinc-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Edit2 size={16}/>
                              </button>
                              <button 
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  disabled={isLoading}
                                  className="text-zinc-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && (
                      <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-100 rounded-xl">
                          No categories yet.
                      </div>
                  )}
                </div>
             </div>
             
             <div className="p-4 bg-white border-t border-zinc-100 space-y-4 sticky bottom-0 z-10 pb-8 md:pb-4 overflow-y-auto max-h-[60vh]">
               <div className="space-y-4">
                   <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New Category</Label>
                   
                   {/* 영어 섹션 */}
                   <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                     <div className="flex items-center justify-between">
                       <Label className="text-base font-semibold text-zinc-900">영어 *</Label>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handleTranslateNewCategory('en')}
                         disabled={isTranslatingNewCategory || !newCategoryNameEn.trim()}
                         className="h-7 text-xs"
                       >
                         {isTranslatingNewCategory ? (
                           <>
                             <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                             번역 중...
                           </>
                         ) : (
                           <>
                             <Languages className="w-3 h-3 mr-1" />
                             번역
                           </>
                         )}
                       </Button>
                     </div>
                     <div className="space-y-2">
                       <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                       <Input
                         placeholder="예: Food"
                         value={newCategoryNameEn}
                         onChange={(e) => setNewCategoryNameEn(e.target.value)}
                         className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                       />
                     </div>
                   </div>

                   {/* 베트남어 섹션 */}
                   <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                     <div className="flex items-center justify-between">
                       <Label className="text-base font-semibold text-zinc-900">베트남어</Label>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handleTranslateNewCategory('vn')}
                         disabled={isTranslatingNewCategory || !newCategoryNameVn.trim()}
                         className="h-7 text-xs"
                       >
                         {isTranslatingNewCategory ? (
                           <>
                             <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                             번역 중...
                           </>
                         ) : (
                           <>
                             <Languages className="w-3 h-3 mr-1" />
                             번역
                           </>
                         )}
                       </Button>
                     </div>
                     <div className="space-y-2">
                       <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                       <Input
                         placeholder="예: Đồ ăn"
                         value={newCategoryNameVn}
                         onChange={(e) => setNewCategoryNameVn(e.target.value)}
                         className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                       />
                     </div>
                   </div>

                   {/* 한국어 섹션 */}
                   <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                     <div className="flex items-center justify-between">
                       <Label className="text-base font-semibold text-zinc-900">한국어</Label>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handleTranslateNewCategory('ko')}
                         disabled={isTranslatingNewCategory || !newCategoryNameKo.trim()}
                         className="h-7 text-xs"
                       >
                         {isTranslatingNewCategory ? (
                           <>
                             <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                             번역 중...
                           </>
                         ) : (
                           <>
                             <Languages className="w-3 h-3 mr-1" />
                             번역
                           </>
                         )}
                       </Button>
                     </div>
                     <div className="space-y-2">
                       <Label className="text-sm text-zinc-700">카테고리 이름 *</Label>
                       <Input
                         placeholder="예: 음식"
                         value={newCategoryNameKo}
                         onChange={(e) => setNewCategoryNameKo(e.target.value)}
                         className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                       />
                     </div>
                   </div>

                   {/* 중국어 섹션 */}
                   <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                     <div className="flex items-center justify-between">
                       <Label className="text-base font-semibold text-zinc-900">중국어</Label>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handleTranslateNewCategory('zh')}
                         disabled={isTranslatingNewCategory || !newCategoryNameZh.trim()}
                         className="h-7 text-xs"
                       >
                         {isTranslatingNewCategory ? (
                           <>
                             <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                             번역 중...
                           </>
                         ) : (
                           <>
                             <Languages className="w-3 h-3 mr-1" />
                             번역
                           </>
                         )}
                       </Button>
                     </div>
                     <div className="space-y-2">
                       <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                       <Input
                         placeholder="예: 食物"
                         value={newCategoryNameZh}
                         onChange={(e) => setNewCategoryNameZh(e.target.value)}
                         className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                       />
                     </div>
                   </div>

                   {/* 러시아어 섹션 */}
                   <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                     <div className="flex items-center justify-between">
                       <Label className="text-base font-semibold text-zinc-900">러시아어</Label>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handleTranslateNewCategory('ru')}
                         disabled={isTranslatingNewCategory || !newCategoryNameRu.trim()}
                         className="h-7 text-xs"
                       >
                         {isTranslatingNewCategory ? (
                           <>
                             <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                             번역 중...
                           </>
                         ) : (
                           <>
                             <Languages className="w-3 h-3 mr-1" />
                             번역
                           </>
                         )}
                       </Button>
                     </div>
                     <div className="space-y-2">
                       <Label className="text-sm text-zinc-700">카테고리 이름</Label>
                       <Input
                         placeholder="예: Еда"
                         value={newCategoryNameRu}
                         onChange={(e) => setNewCategoryNameRu(e.target.value)}
                         className="bg-white border-zinc-200 focus-visible:ring-zinc-900"
                       />
                     </div>
                   </div>

                   <button 
                       onClick={handleAddCategory}
                       disabled={isLoading || !newCategoryNameKo.trim() || !newCategoryNameVn.trim()}
                       className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       {isLoading ? t('btn.adding') : t('btn.add')}
                   </button>
               </div>
               <button 
                  onClick={onClose}
                  className="w-full h-12 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-sm hover:bg-zinc-200 transition-colors"
               >
                  Done
               </button>
             </div>
        </div>
    );
}

function ItemEditorContent({ editingItem, setEditingItem, categories, handleDeleteItem, handleSaveItem, t, isLoading, language }: any) {
    // 번역 상태
    const [isTranslatingItemName, setIsTranslatingItemName] = useState(false);
    const [isTranslatingItemDescription, setIsTranslatingItemDescription] = useState(false);

    // 메뉴 이름 번역 함수
    const handleTranslateItemName = async (sourceLang: Language) => {
      const sourceValue = 
        sourceLang === 'en' ? (editingItem as any).nameEn :
        sourceLang === 'vn' ? (editingItem as any).nameVn :
        sourceLang === 'ko' ? (editingItem as any).nameKo :
        sourceLang === 'zh' ? (editingItem as any).nameZh :
        sourceLang === 'ru' ? (editingItem as any).nameRu : '';

      if (!sourceValue || !sourceValue.trim()) {
        toast.error('번역할 내용이 없습니다.');
        return;
      }

      setIsTranslatingItemName(true);
      try {
        const result = await apiClient.translateToAllLanguages(sourceValue.trim(), sourceLang);
        if (result.success && result.data?.translations) {
          const translations = result.data.translations as Record<Language, string>;
          setEditingItem({
            ...editingItem,
            nameEn: translations.en || (editingItem as any).nameEn,
            nameVn: translations.vn || (editingItem as any).nameVn,
            nameKo: translations.ko || (editingItem as any).nameKo,
            nameZh: translations.zh || (editingItem as any).nameZh,
            nameRu: translations.ru || (editingItem as any).nameRu,
            name: translations[language] || editingItem.name,
          });
          toast.success('번역이 완료되었습니다.');
        } else {
          toast.error('번역에 실패했습니다.');
        }
      } catch (error) {
        console.error('Translation error:', error);
        toast.error('번역 중 오류가 발생했습니다.');
      } finally {
        setIsTranslatingItemName(false);
      }
    };

    // 메뉴 설명 번역 함수
    const handleTranslateItemDescription = async (sourceLang: Language) => {
      const sourceValue = 
        sourceLang === 'en' ? (editingItem as any).descriptionEn :
        sourceLang === 'vn' ? (editingItem as any).descriptionVn :
        sourceLang === 'ko' ? (editingItem as any).descriptionKo :
        sourceLang === 'zh' ? (editingItem as any).descriptionZh :
        sourceLang === 'ru' ? (editingItem as any).descriptionRu : '';

      if (!sourceValue || !sourceValue.trim()) {
        toast.error('번역할 내용이 없습니다.');
        return;
      }

      setIsTranslatingItemDescription(true);
      try {
        const result = await apiClient.translateToAllLanguages(sourceValue.trim(), sourceLang);
        if (result.success && result.data?.translations) {
          const translations = result.data.translations as Record<Language, string>;
          setEditingItem({
            ...editingItem,
            descriptionEn: translations.en || (editingItem as any).descriptionEn,
            descriptionVn: translations.vn || (editingItem as any).descriptionVn,
            descriptionKo: translations.ko || (editingItem as any).descriptionKo,
            descriptionZh: translations.zh || (editingItem as any).descriptionZh,
            descriptionRu: translations.ru || (editingItem as any).descriptionRu,
            description: translations[language] || editingItem.description,
          });
          toast.success('번역이 완료되었습니다.');
        } else {
          toast.error('번역에 실패했습니다.');
        }
      } catch (error) {
        console.error('Translation error:', error);
        toast.error('번역 중 오류가 발생했습니다.');
      } finally {
        setIsTranslatingItemDescription(false);
      }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 pb-32">
                <div className="space-y-8 pb-10">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                            {t('menu.basic_info')}
                        </h3>
                        <div className="space-y-4">
                            {/* 영어 섹션 */}
                            <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold text-zinc-900">영어 *</Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemName('en')}
                                            disabled={isTranslatingItemName || !(editingItem as any).nameEn?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemName ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    메뉴명 번역
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemDescription('en')}
                                            disabled={isTranslatingItemDescription || !(editingItem as any).descriptionEn?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemDescription ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    설명 번역
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">메뉴명</Label>
                                    <Input
                                        value={(editingItem as any).nameEn || ''}
                                        onChange={(e) => setEditingItem({...editingItem, nameEn: e.target.value})}
                                        placeholder="예: Tomato Pasta"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">설명</Label>
                                    <Textarea
                                        value={(editingItem as any).descriptionEn || ''}
                                        onChange={(e) => setEditingItem({...editingItem, descriptionEn: e.target.value})}
                                        placeholder="Description of the dish"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* 베트남어 섹션 */}
                            <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold text-zinc-900">베트남어</Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemName('vn')}
                                            disabled={isTranslatingItemName || !(editingItem as any).nameVn?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemName ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    메뉴명 번역
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemDescription('vn')}
                                            disabled={isTranslatingItemDescription || !(editingItem as any).descriptionVn?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemDescription ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    설명 번역
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">메뉴명</Label>
                                    <Input
                                        value={(editingItem as any).nameVn || ''}
                                        onChange={(e) => setEditingItem({...editingItem, nameVn: e.target.value})}
                                        placeholder="예: Mì Ý sốt cà chua"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">설명</Label>
                                    <Textarea
                                        value={(editingItem as any).descriptionVn || ''}
                                        onChange={(e) => setEditingItem({...editingItem, descriptionVn: e.target.value})}
                                        placeholder="Mô tả về món ăn"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* 한국어 섹션 */}
                            <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold text-zinc-900">한국어</Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemName('ko')}
                                            disabled={isTranslatingItemName || !(editingItem as any).nameKo?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemName ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    메뉴명 번역
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemDescription('ko')}
                                            disabled={isTranslatingItemDescription || !(editingItem as any).descriptionKo?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemDescription ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    설명 번역
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">메뉴명 *</Label>
                                    <Input
                                        value={(editingItem as any).nameKo || ''}
                                        onChange={(e) => setEditingItem({...editingItem, nameKo: e.target.value, name: e.target.value})}
                                        placeholder="예: 토마토 파스타"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">설명</Label>
                                    <Textarea
                                        value={(editingItem as any).descriptionKo || ''}
                                        onChange={(e) => setEditingItem({...editingItem, descriptionKo: e.target.value, description: e.target.value})}
                                        placeholder="메뉴에 대한 설명을 입력하세요"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* 중국어 섹션 */}
                            <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold text-zinc-900">중국어</Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemName('zh')}
                                            disabled={isTranslatingItemName || !(editingItem as any).nameZh?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemName ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    메뉴명 번역
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemDescription('zh')}
                                            disabled={isTranslatingItemDescription || !(editingItem as any).descriptionZh?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemDescription ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    설명 번역
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">메뉴명</Label>
                                    <Input
                                        value={(editingItem as any).nameZh || ''}
                                        onChange={(e) => setEditingItem({...editingItem, nameZh: e.target.value})}
                                        placeholder="예: 番茄意大利面"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">설명</Label>
                                    <Textarea
                                        value={(editingItem as any).descriptionZh || ''}
                                        onChange={(e) => setEditingItem({...editingItem, descriptionZh: e.target.value})}
                                        placeholder="菜品描述"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* 러시아어 섹션 */}
                            <div className="space-y-3 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold text-zinc-900">러시아어</Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemName('ru')}
                                            disabled={isTranslatingItemName || !(editingItem as any).nameRu?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemName ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    메뉴명 번역
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTranslateItemDescription('ru')}
                                            disabled={isTranslatingItemDescription || !(editingItem as any).descriptionRu?.trim()}
                                            className="h-7 text-xs"
                                        >
                                            {isTranslatingItemDescription ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                                    번역 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Languages className="w-3 h-3 mr-1" />
                                                    설명 번역
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">메뉴명</Label>
                                    <Input
                                        value={(editingItem as any).nameRu || ''}
                                        onChange={(e) => setEditingItem({...editingItem, nameRu: e.target.value})}
                                        placeholder="예: Томатная паста"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-700">설명</Label>
                                    <Textarea
                                        value={(editingItem as any).descriptionRu || ''}
                                        onChange={(e) => setEditingItem({...editingItem, descriptionRu: e.target.value})}
                                        placeholder="Описание блюда"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 mb-1.5 block">{t('menu.price')} (₫)</label>
                                    <Input 
                                        type="number"
                                        value={editingItem.price} 
                                        onChange={(e) => setEditingItem({...editingItem, price: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 mb-1.5 block">{t('menu.category')}</label>
                                    <select 
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={editingItem.categoryId}
                                        onChange={(e) => setEditingItem({...editingItem, categoryId: e.target.value})}
                                    >
                                        {categories.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-2 block">{t('menu.image_url') || "Image"}</label>
                                <div className="flex gap-4 items-start">
                                    {/* Thumbnail Preview */}
                                    <div className="shrink-0 relative group">
                                        <div className={cn(
                                            "w-24 h-24 rounded-xl border border-zinc-200 overflow-hidden flex items-center justify-center bg-zinc-50",
                                            !editingItem.imageUrl && "border-dashed border-2"
                                        )}>
                                            {editingItem.imageUrl ? (
                                                <img src={editingItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-zinc-300">
                                                    <ImageIcon size={20} />
                                                    <span className="text-[10px] font-medium">No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        {editingItem.imageUrl && (
                                            <button 
                                                onClick={() => setEditingItem({...editingItem, imageUrl: ''})}
                                                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-zinc-100 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-colors z-10"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Upload Control */}
                                    <div className="flex-1 space-y-2">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="image-upload"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setEditingItem({...editingItem, imageUrl: reader.result as string});
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <label 
                                                htmlFor="image-upload"
                                                className="flex items-center gap-2 w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100 transition-colors"
                                            >
                                                <div className="bg-white p-1.5 rounded-lg border border-zinc-100 shadow-sm text-zinc-600">
                                                    <Upload size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-bold text-zinc-700 block truncate">
                                                        Click to upload image
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 block truncate">
                                                        JPG, PNG support
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed px-1">
                                            Upload a local image file for the menu item. It will be displayed as a thumbnail.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                                <span className="text-sm font-medium">{t('menu.stock_status')}</span>
                                <button
                                    onClick={() => setEditingItem({...editingItem, isSoldOut: !editingItem.isSoldOut})}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        editingItem.isSoldOut ? "bg-rose-500" : "bg-zinc-200"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform",
                                            editingItem.isSoldOut ? "translate-x-6" : "translate-x-1"
                                        )}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Options Management */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-zinc-900">{t('menu.options_addons')}</h3>
                            <button 
                                onClick={() => {
                                    const newGroup: any = {
                                        id: `grp-${Date.now()}`,
                                        name: t('menu.new_group'),
                                        nameKo: '',
                                        nameVn: '',
                                        nameEn: '',
                                        nameZh: '',
                                        nameRu: '',
                                        minSelect: 0,
                                        maxSelect: 1,
                                        options: []
                                    };
                                    setEditingItem({
                                        ...editingItem,
                                        optionGroups: [...editingItem.optionGroups, newGroup]
                                    });
                                }}
                                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 whitespace-nowrap"
                            >
                                + {t('menu.add_group')}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {editingItem.optionGroups.map((group: any, groupIdx: number) => (
                                <div key={group.id} className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 grid gap-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input 
                                                    value={group.nameKo || group.name || ''}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].nameKo = e.target.value;
                                                        newGroups[groupIdx].name = e.target.value;
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="bg-white font-bold text-xs"
                                                    placeholder="한국어 *"
                                                />
                                                <Input 
                                                    value={group.nameVn || ''}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].nameVn = e.target.value;
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="bg-white font-bold text-xs"
                                                    placeholder="베트남어 *"
                                                />
                                                <Input 
                                                    value={group.nameEn || ''}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].nameEn = e.target.value;
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="bg-white text-xs"
                                                    placeholder="영어"
                                                />
                                                <Input 
                                                    value={group.nameZh || ''}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].nameZh = e.target.value;
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="bg-white text-xs"
                                                    placeholder="중국어"
                                                />
                                                <Input 
                                                    value={group.nameRu || ''}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].nameRu = e.target.value;
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="bg-white text-xs"
                                                    placeholder="러시아어"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">{t('menu.min')}:</span>
                                                <Input 
                                                    type="number"
                                                    value={group.minSelect}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].minSelect = Number(e.target.value);
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="w-16 h-7 text-xs bg-white"
                                                />
                                                <span className="text-xs text-zinc-500">{t('menu.max')}:</span>
                                                <Input 
                                                    type="number"
                                                    value={group.maxSelect}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].maxSelect = Number(e.target.value);
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="w-16 h-7 text-xs bg-white"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newGroups = editingItem.optionGroups.filter((_: any, i: number) => i !== groupIdx);
                                                setEditingItem({...editingItem, optionGroups: newGroups});
                                            }}
                                            className="text-rose-400 p-1 hover:text-rose-600"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>

                                    <div className="space-y-2 pl-2 border-l-2 border-zinc-200">
                                        {group.options.map((opt: any, optIdx: number) => (
                                            <div key={opt.id} className="flex gap-2 items-center">
                                                <div className="grid grid-cols-2 gap-1 flex-1">
                                                    <Input 
                                                        value={opt.nameKo || opt.name || ''}
                                                        onChange={(e) => {
                                                            const newGroups = [...editingItem.optionGroups];
                                                            newGroups[groupIdx].options[optIdx].nameKo = e.target.value;
                                                            newGroups[groupIdx].options[optIdx].name = e.target.value;
                                                            setEditingItem({...editingItem, optionGroups: newGroups});
                                                        }}
                                                        placeholder="한국어"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                    <Input 
                                                        value={opt.nameVn || ''}
                                                        onChange={(e) => {
                                                            const newGroups = [...editingItem.optionGroups];
                                                            newGroups[groupIdx].options[optIdx].nameVn = e.target.value;
                                                            setEditingItem({...editingItem, optionGroups: newGroups});
                                                        }}
                                                        placeholder="베트남어"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                    <Input 
                                                        value={opt.nameEn || ''}
                                                        onChange={(e) => {
                                                            const newGroups = [...editingItem.optionGroups];
                                                            newGroups[groupIdx].options[optIdx].nameEn = e.target.value;
                                                            setEditingItem({...editingItem, optionGroups: newGroups});
                                                        }}
                                                        placeholder="영어"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                    <Input 
                                                        value={opt.nameZh || ''}
                                                        onChange={(e) => {
                                                            const newGroups = [...editingItem.optionGroups];
                                                            newGroups[groupIdx].options[optIdx].nameZh = e.target.value;
                                                            setEditingItem({...editingItem, optionGroups: newGroups});
                                                        }}
                                                        placeholder="중국어"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                    <Input 
                                                        value={opt.nameRu || ''}
                                                        onChange={(e) => {
                                                            const newGroups = [...editingItem.optionGroups];
                                                            newGroups[groupIdx].options[optIdx].nameRu = e.target.value;
                                                            setEditingItem({...editingItem, optionGroups: newGroups});
                                                        }}
                                                        placeholder="러시아어"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                </div>
                                                <Input 
                                                    type="number"
                                                    value={opt.price}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].options[optIdx].price = Number(e.target.value);
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    placeholder={t('menu.price')}
                                                    className="w-20 h-8 text-sm bg-white"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].options = newGroups[groupIdx].options.filter((_: any, i: number) => i !== optIdx);
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    className="text-zinc-400 hover:text-rose-500"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => {
                                                const newGroups = [...editingItem.optionGroups];
                                                newGroups[groupIdx].options.push({
                                                    id: `opt-${Date.now()}-${Math.random()}`,
                                                    name: '',
                                                    nameKo: '',
                                                    nameVn: '',
                                                    nameEn: '',
                                                    nameZh: '',
                                                    nameRu: '',
                                                    price: 0
                                                });
                                                setEditingItem({...editingItem, optionGroups: newGroups});
                                            }}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                                        >
                                            <Plus size={12}/> {t('menu.add_choice')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-4 bg-white border-t border-zinc-100 grid grid-cols-2 gap-3 sticky bottom-0 z-10 pb-8 md:pb-4">
                <button 
                    onClick={handleDeleteItem}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('btn.delete')}
                </button>
                <button 
                    onClick={handleSaveItem}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t('btn.saving') : t('btn.save')}
                </button>
            </div>
        </div>
    );
}