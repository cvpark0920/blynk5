import React, { useState, useEffect } from 'react';
import { MenuItem, MenuCategory } from '../../data';
import { Tag, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Check, Upload, ArrowUp, ArrowDown } from 'lucide-react';
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
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';
import { formatPriceVND } from '../../utils/priceFormat';

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

  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // --- Category Management ---
  const [newCategoryName, setNewCategoryName] = useState('');

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
        
        result.data.forEach((category: BackendMenuCategory) => {
          loadedCategories.push(mapBackendCategoryToFrontend(category, language));
          
          (category.menuItems || []).forEach((item: BackendMenuItem) => {
            loadedMenu.push(mapBackendMenuItemToFrontend(item, language));
          });
        });
        
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

    if (!newCategoryName.trim()) {
      toast.error('카테고리 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const backendData = {
        nameKo: newCategoryName,
        nameVn: newCategoryName,
        nameEn: language === 'en' ? newCategoryName : undefined,
        displayOrder: categories.length,
      };

      const result = await apiClient.createCategory(restaurantId, backendData);
      if (result.success && result.data) {
        const newCat = mapBackendCategoryToFrontend(result.data, language);
        setCategories(prev => [...prev, newCat].sort((a, b) => a.order - b.order));
        setNewCategoryName('');
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

  const handleUpdateCategory = async (id: string, newName: string) => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    if (!newName.trim()) {
      toast.error('카테고리 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const backendData = {
        nameKo: newName,
        nameVn: newName,
        nameEn: language === 'en' ? newName : undefined,
      };

      const result = await apiClient.updateCategory(restaurantId, id, backendData);
      if (result.success && result.data) {
        const updatedCat = mapBackendCategoryToFrontend(result.data, language);
        setCategories(prev => prev.map(c => c.id === id ? updatedCat : c).sort((a, b) => a.order - b.order));
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
      price: 0,
      isSoldOut: false,
      optionGroups: []
    });
    setIsItemSheetOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem({ ...item }); // Deep copy might be needed for options, but simple spread works for first level
    setIsItemSheetOpen(true);
  };

  const handleSaveItem = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    if (!editingItem || !editingItem.name) {
      toast.error(t('msg.name_required'));
      return;
    }

    setIsLoading(true);
    try {
      const backendData = mapFrontendMenuItemToBackend(editingItem, restaurantId, language);
      
      if (editingItem.id.startsWith('m-')) {
        // New item (temporary ID)
        const result = await apiClient.createMenuItem(restaurantId, backendData);
        if (result.success && result.data) {
          const newItem = mapBackendMenuItemToFrontend(result.data, language);
          setMenu(prev => [...prev, newItem]);
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
              handleDeleteCategory={handleDeleteCategory}
              handleUpdateCategory={handleUpdateCategory}
              handleReorderCategory={handleReorderCategory}
              newCategoryName={newCategoryName} 
              setNewCategoryName={setNewCategoryName} 
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
          <DrawerContent className="h-[85vh] rounded-t-[32px] p-0 bg-white flex flex-col">
            <DrawerHeader className="px-6 py-5 border-b border-zinc-100 mb-0 text-left">
              <DrawerTitle>{t('dialog.cat.title')}</DrawerTitle>
              <DrawerDescription>{t('dialog.cat.desc')}</DrawerDescription>
            </DrawerHeader>
            <CategoryManagerContent 
              categories={categories} 
              handleDeleteCategory={handleDeleteCategory}
              handleUpdateCategory={handleUpdateCategory}
              handleReorderCategory={handleReorderCategory}
              newCategoryName={newCategoryName} 
              setNewCategoryName={setNewCategoryName} 
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
                />
             )}
           </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

// Extracted Components to avoid duplication
function CategoryManagerContent({ categories, handleDeleteCategory, handleUpdateCategory, handleReorderCategory, newCategoryName, setNewCategoryName, handleAddCategory, onClose, t, isLoading, language }: any) {
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    const startEdit = (cat: any) => {
        setEditingCategoryId(cat.id);
        setEditingCategoryName(cat.name);
    };

    const cancelEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName('');
    };

    const saveEdit = async () => {
        if (editingCategoryId && editingCategoryName.trim()) {
            await handleUpdateCategory(editingCategoryId, editingCategoryName.trim());
            setEditingCategoryId(null);
            setEditingCategoryName('');
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
                        <>
                          <div className="flex items-center gap-3 flex-1">
                              <div className="bg-white p-2 rounded-md border border-zinc-100 text-zinc-400">
                                  <Tag size={14} />
                              </div>
                              <Input 
                                  value={editingCategoryName}
                                  onChange={(e) => setEditingCategoryName(e.target.value)}
                                  className="bg-white border-zinc-200 focus-visible:ring-zinc-900 flex-1"
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                          saveEdit();
                                      } else if (e.key === 'Escape') {
                                          cancelEdit();
                                      }
                                  }}
                                  autoFocus
                              />
                          </div>
                          <div className="flex items-center gap-1">
                              <button 
                                  onClick={saveEdit}
                                  disabled={isLoading || !editingCategoryName.trim()}
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
                        </>
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
             
             <div className="p-4 bg-white border-t border-zinc-100 space-y-3 sticky bottom-0 z-10 pb-8 md:pb-4">
               <div className="grid gap-2">
                   <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New Category</label>
                   <div className="flex gap-2">
                        <Input 
                            placeholder={t('dialog.cat.placeholder')}
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                        />
                        <button 
                            onClick={handleAddCategory}
                            disabled={isLoading}
                            className="bg-zinc-900 text-white px-4 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? '추가 중...' : t('btn.add')}
                        </button>
                   </div>
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

function ItemEditorContent({ editingItem, setEditingItem, categories, handleDeleteItem, handleSaveItem, t, isLoading }: any) {
    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 pb-32">
                <div className="space-y-8 pb-10">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                            {t('menu.basic_info')}
                        </h3>
                        <div className="grid gap-4">
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1.5 block">{t('menu.item_name')}</label>
                                <Input 
                                    value={editingItem.name} 
                                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                    placeholder="e.g. Tomato Pasta"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1.5 block">{t('menu.description') || '메뉴 설명'}</label>
                                <textarea 
                                    value={editingItem.description || ''} 
                                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                                    placeholder="메뉴에 대한 설명을 입력하세요"
                                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                    rows={3}
                                />
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
                                    const newGroup: MenuOptionGroup = {
                                        id: `grp-${Date.now()}`,
                                        name: t('menu.new_group'),
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
                                            <Input 
                                                value={group.name}
                                                onChange={(e) => {
                                                    const newGroups = [...editingItem.optionGroups];
                                                    newGroups[groupIdx].name = e.target.value;
                                                    setEditingItem({...editingItem, optionGroups: newGroups});
                                                }}
                                                className="bg-white font-bold"
                                                placeholder={t('menu.group_name')}
                                            />
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
                                                <Input 
                                                    value={opt.name}
                                                    onChange={(e) => {
                                                        const newGroups = [...editingItem.optionGroups];
                                                        newGroups[groupIdx].options[optIdx].name = e.target.value;
                                                        setEditingItem({...editingItem, optionGroups: newGroups});
                                                    }}
                                                    placeholder={t('menu.option_name')}
                                                    className="h-8 text-sm bg-white"
                                                />
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
                    {isLoading ? '저장 중...' : t('btn.save')}
                </button>
            </div>
        </div>
    );
}