import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Image as ImageIcon, X, Tag, Upload, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { BackendPromotion, BackendMenuItem, BackendMenuCategory } from '../../types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Card, CardContent } from '../ui/card';
import { cn } from '../ui/utils';

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

interface PromotionManagerProps {
  isEmbedded?: boolean;
}

export function PromotionManager({ isEmbedded = false }: PromotionManagerProps) {
  const { t, language } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [promotions, setPromotions] = useState<BackendPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<BackendPromotion | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Form state
  const [titleKo, setTitleKo] = useState('');
  const [titleVn, setTitleVn] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleZh, setTitleZh] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [descriptionKo, setDescriptionKo] = useState('');
  const [descriptionVn, setDescriptionVn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionZh, setDescriptionZh] = useState('');
  const [descriptionRu, setDescriptionRu] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showOnLoad, setShowOnLoad] = useState(false);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<BackendMenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<BackendMenuCategory[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      loadPromotions();
      loadMenu();
    }
  }, [restaurantId]);

  const loadPromotions = async () => {
    if (!restaurantId) return;
    
    setIsLoadingList(true);
    try {
      const result = await apiClient.getPromotions(restaurantId);
      if (result.success && result.data) {
        // Map promotionMenuItems to menuItems for convenience
        const mappedPromotions = result.data.map(promo => ({
          ...promo,
          menuItems: promo.promotionMenuItems?.map(pmi => pmi.menuItem) || [],
        }));
        setPromotions(mappedPromotions);
      } else {
        toast.error(result.error?.message || '프로모션 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('Error loading promotions:', error);
      toast.error('프로모션 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadMenu = async () => {
    if (!restaurantId) {
      console.warn('[PromotionManager] restaurantId가 없어 메뉴를 로드할 수 없습니다.');
      return;
    }
    
    setIsLoadingMenu(true);
    try {
      const result = await apiClient.getMenu(restaurantId);
      if (result.success && result.data) {
        // result.data는 이미 카테고리 배열입니다 (BackendMenuCategory[])
        const categories = Array.isArray(result.data) ? result.data : [];
        const allItems = categories.flatMap(cat => cat.menuItems || []) || [];
        setMenuCategories(categories);
        setMenuItems(allItems);
        console.log('[PromotionManager] 메뉴 로드 완료:', {
          categoriesCount: categories.length,
          menuItemsCount: allItems.length,
          categories: categories.map(c => ({ id: c.id, nameKo: c.nameKo, menuItemsCount: c.menuItems?.length || 0 })),
          sampleMenuItems: allItems.slice(0, 3).map(item => ({
            id: item.id,
            nameKo: item.nameKo,
            imageUrl: item.imageUrl,
          })),
        });
      } else {
        console.error('[PromotionManager] 메뉴 로드 실패:', result.error);
        toast.error('메뉴를 불러오는데 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('[PromotionManager] 메뉴 로드 중 오류:', error);
      toast.error('메뉴를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const resetForm = () => {
    setTitleKo('');
    setTitleVn('');
    setTitleEn('');
    setTitleZh('');
    setTitleRu('');
    setDescriptionKo('');
    setDescriptionVn('');
    setDescriptionEn('');
    setDescriptionZh('');
    setDescriptionRu('');
    setImageUrl('');
    setImagePreview(null);
    setDiscountPercent(undefined);
    setStartDate('');
    setEndDate('');
    setDisplayOrder(promotions.length);
    setIsActive(true);
    setShowOnLoad(false);
    setEditingPromotion(null);
    setSelectedMenuIds([]);
  };

  const openCreateSheet = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  const openEditSheet = (promotion: BackendPromotion) => {
    setEditingPromotion(promotion);
    setTitleKo(promotion.titleKo);
    setTitleVn(promotion.titleVn);
    setTitleEn(promotion.titleEn || '');
    setTitleZh(promotion.titleZh || '');
    setTitleRu(promotion.titleRu || '');
    setDescriptionKo(promotion.descriptionKo || '');
    setDescriptionVn(promotion.descriptionVn || '');
    setDescriptionEn(promotion.descriptionEn || '');
    setDescriptionZh(promotion.descriptionZh || '');
    setDescriptionRu(promotion.descriptionRu || '');
    const imgUrl = promotion.imageUrl || '';
    setImageUrl(imgUrl);
    if (imgUrl) {
      const baseUrl = window.location.origin;
      setImagePreview(imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`);
    } else {
      setImagePreview(null);
    }
    setDiscountPercent(promotion.discountPercent || undefined);
    setStartDate(new Date(promotion.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(promotion.endDate).toISOString().split('T')[0]);
    setDisplayOrder(promotion.displayOrder);
    setIsActive(promotion.isActive);
    setShowOnLoad(promotion.showOnLoad);
    // Set selected menu IDs from promotionMenuItems
    const menuIds = promotion.promotionMenuItems?.map(pmi => pmi.menuItemId) || 
                    promotion.menuItems?.map(mi => mi.id) || [];
    setSelectedMenuIds(menuIds);
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    if (!titleKo.trim() || !titleVn.trim()) {
      toast.error('한국어와 베트남어 제목은 필수입니다.');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('시작일과 종료일은 필수입니다.');
      return;
    }

    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
      toast.error('할인율은 0-100 사이여야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        titleKo: titleKo.trim(),
        titleVn: titleVn.trim(),
        titleEn: titleEn.trim() || undefined,
        titleZh: titleZh.trim() || undefined,
        titleRu: titleRu.trim() || undefined,
        descriptionKo: descriptionKo.trim() || undefined,
        descriptionVn: descriptionVn.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        descriptionZh: descriptionZh.trim() || undefined,
        descriptionRu: descriptionRu.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        discountPercent,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        displayOrder,
        isActive,
        showOnLoad,
        menuItemIds: selectedMenuIds.length > 0 ? selectedMenuIds : undefined,
      };

      let result;
      if (editingPromotion) {
        result = await apiClient.updatePromotion(restaurantId, editingPromotion.id, data);
      } else {
        result = await apiClient.createPromotion(restaurantId, data);
      }

      if (result.success) {
        toast.success(editingPromotion ? '프로모션이 수정되었습니다.' : '프로모션이 생성되었습니다.');
        setIsSheetOpen(false);
        resetForm();
        loadPromotions();
      } else {
        throw new Error(result.error?.message || '프로모션 저장에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error saving promotion:', error);
      const errorMessage = error instanceof Error ? error.message : '프로모션 저장에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (promotionId: string) => {
    if (!restaurantId) return;
    
    if (!confirm('정말 이 프로모션을 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.deletePromotion(restaurantId, promotionId);
      if (result.success) {
        toast.success('프로모션이 삭제되었습니다.');
        loadPromotions();
      } else {
        throw new Error(result.error?.message || '프로모션 삭제에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error deleting promotion:', error);
      const errorMessage = error instanceof Error ? error.message : '프로모션 삭제에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('지원하지 않는 파일 형식입니다. JPEG, PNG, WebP 이미지를 업로드해주세요.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('파일 크기가 5MB를 초과합니다.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      toast.error('이미지 파일을 읽는데 실패했습니다.');
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    const fileInput = document.getElementById('promotion-image-input') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error('이미지 파일을 선택해주세요.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await apiClient.uploadPromotionImage(restaurantId, file);
      if (result.success && result.data?.imageUrl) {
        const url = result.data.imageUrl;
        setImageUrl(url);
        const baseUrl = window.location.origin;
        setImagePreview(url.startsWith('http') ? url : `${baseUrl}${url}`);
        toast.success('이미지가 업로드되었습니다.');
        // Reset file input
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        throw new Error(result.error?.message || '이미지 업로드에 실패했습니다');
      }
    } catch (error: unknown) {
      console.error('Error uploading promotion image:', error);
      const errorMessage = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const getLocalizedTitle = (promotion: BackendPromotion) => {
    if (language === 'ko') return promotion.titleKo;
    if (language === 'vn') return promotion.titleVn;
    if (language === 'zh') return promotion.titleZh || promotion.titleEn || promotion.titleKo;
    if (language === 'ru') return promotion.titleRu || promotion.titleEn || promotion.titleKo;
    return promotion.titleEn || promotion.titleKo;
  };

  const isActivePromotion = (promotion: BackendPromotion) => {
    if (!promotion.isActive) return false;
    const now = new Date();
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);
    return now >= start && now <= end;
  };

  const Content = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Add Button */}
          <div className="flex justify-end">
            <Button onClick={openCreateSheet} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              추가
            </Button>
          </div>

          {isLoadingList ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          ) : promotions.length === 0 ? (
            <Card className="bg-white border border-zinc-100 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                  <Tag className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-900 mb-1">
                  프로모션이 없습니다
                </p>
                <p className="text-xs text-zinc-500 text-center max-w-xs mb-4">
                  새 프로모션을 추가해보세요
                </p>
                <Button onClick={openCreateSheet} size="sm" variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  프로모션 추가
                </Button>
              </CardContent>
            </Card>
          ) : (
            promotions.map((promotion) => {
              const active = isActivePromotion(promotion);
              return (
                <Card
                  key={promotion.id}
                  className={cn(
                    'bg-white border border-zinc-100 shadow-sm transition-all hover:shadow-md',
                    !promotion.isActive && 'opacity-60'
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg text-zinc-900">{getLocalizedTitle(promotion)}</h3>
                          {active && <Badge variant="default">진행중</Badge>}
                          {promotion.showOnLoad && <Badge variant="secondary">로딩 팝업</Badge>}
                          {promotion.discountPercent && (
                            <Badge variant="outline">{promotion.discountPercent}% 할인</Badge>
                          )}
                          {!promotion.isActive && <Badge variant="secondary">비활성</Badge>}
                        </div>
                        {(promotion.descriptionKo || promotion.descriptionVn) && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {language === 'ko' ? promotion.descriptionKo : promotion.descriptionVn}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(promotion.startDate).toLocaleDateString()} ~{' '}
                              {new Date(promotion.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-zinc-400">•</div>
                          <div>순서: {promotion.displayOrder}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSheet(promotion)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(promotion.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {promotion.imageUrl && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-zinc-200">
                        <img
                          src={promotion.imageUrl}
                          alt={getLocalizedTitle(promotion)}
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const FormContent = (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4 space-y-4 pb-6">
        <div className="space-y-2">
          <Label>제목 (한국어) *</Label>
          <Input
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            placeholder="예: 신메뉴 출시 할인"
          />
        </div>

        <div className="space-y-2">
          <Label>제목 (베트남어) *</Label>
          <Input
            value={titleVn}
            onChange={(e) => setTitleVn(e.target.value)}
            placeholder="Ví dụ: Giảm giá món mới"
          />
        </div>

        <div className="space-y-2">
          <Label>제목 (영어)</Label>
          <Input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="e.g., New Menu Launch Discount"
          />
        </div>

        <div className="space-y-2">
          <Label>제목 (중국어)</Label>
          <Input
            value={titleZh}
            onChange={(e) => setTitleZh(e.target.value)}
            placeholder="例如：新菜单发布折扣"
          />
        </div>

        <div className="space-y-2">
          <Label>제목 (러시아어)</Label>
          <Input
            value={titleRu}
            onChange={(e) => setTitleRu(e.target.value)}
            placeholder="Например: Скидка на новое меню"
          />
        </div>

        <div className="space-y-2">
          <Label>설명 (한국어)</Label>
          <Textarea
            value={descriptionKo}
            onChange={(e) => setDescriptionKo(e.target.value)}
            placeholder="프로모션 설명을 입력하세요"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>설명 (베트남어)</Label>
          <Textarea
            value={descriptionVn}
            onChange={(e) => setDescriptionVn(e.target.value)}
            placeholder="Nhập mô tả khuyến mãi"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>설명 (영어)</Label>
          <Textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            placeholder="Enter promotion description"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>설명 (중국어)</Label>
          <Textarea
            value={descriptionZh}
            onChange={(e) => setDescriptionZh(e.target.value)}
            placeholder="输入促销说明"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>설명 (러시아어)</Label>
          <Textarea
            value={descriptionRu}
            onChange={(e) => setDescriptionRu(e.target.value)}
            placeholder="Введите описание акции"
            rows={3}
          />
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label className="text-base font-semibold">프로모션 이미지</Label>
          <p className="text-xs text-muted-foreground mb-2">
            프로모션에 표시할 이미지를 업로드하세요. (선택사항)
          </p>
          
          {/* 이미지 미리보기 */}
          {imagePreview && (
            <div className="relative w-full mb-2">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-zinc-200">
                <img
                  src={imagePreview}
                  alt="프로모션 이미지 미리보기"
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImagePreview(null);
                    toast.error('이미지를 불러오는데 실패했습니다.');
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-md"
                  onClick={() => {
                    setImagePreview(null);
                    setImageUrl('');
                    const fileInput = document.getElementById('promotion-image-input') as HTMLInputElement;
                    if (fileInput) {
                      fileInput.value = '';
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* 업로드 버튼 */}
          <div className="flex items-center gap-3">
            <label htmlFor="promotion-image-input" className="cursor-pointer">
              <input
                id="promotion-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button type="button" variant="outline" className="gap-2" asChild>
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  이미지 선택
                </span>
              </Button>
            </label>
            {imagePreview && !imageUrl && (
              <Button
                onClick={handleImageUpload}
                disabled={isUploadingImage}
                className="gap-2"
              >
                {isUploadingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    업로드
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP (최대 5MB)
          </p>

          {/* 이미지 URL 직접 입력 (선택사항) */}
          {imageUrl && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">이미지 URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (e.target.value.trim()) {
                    const baseUrl = window.location.origin;
                    setImagePreview(e.target.value.startsWith('http') ? e.target.value : `${baseUrl}${e.target.value}`);
                  } else {
                    setImagePreview(null);
                  }
                }}
                placeholder="또는 이미지 URL을 직접 입력하세요"
                className="text-xs"
              />
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label className="text-base font-semibold">할인 대상 메뉴</Label>
          <p className="text-xs text-muted-foreground mb-2">
            프로모션에 포함할 메뉴를 선택하세요. 선택하지 않으면 모든 메뉴에 적용됩니다.
          </p>
          <div className="border-2 border-dashed rounded-lg p-4 max-h-96 overflow-y-auto bg-muted/30">
            {isLoadingMenu ? (
              <div className="text-sm text-muted-foreground text-center py-4">메뉴 로딩 중...</div>
            ) : menuItems.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                메뉴가 없습니다. 먼저 메뉴를 추가해주세요.
              </div>
            ) : menuCategories.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                카테고리가 없습니다. 먼저 카테고리를 추가해주세요.
              </div>
            ) : (
              <div className="space-y-4">
                {menuCategories.map(category => {
                  const categoryItems = menuItems.filter(item => item.categoryId === category.id);
                  if (categoryItems.length === 0) return null;
                  
                  const categoryName = language === 'ko' ? category.nameKo : 
                                      language === 'vn' ? category.nameVn :
                                      language === 'zh' ? (category.nameZh || category.nameEn || category.nameKo) :
                                      language === 'ru' ? (category.nameRu || category.nameEn || category.nameKo) :
                                      (category.nameEn || category.nameKo);
                  
                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="text-sm font-semibold text-foreground mb-2 px-1">
                        {categoryName}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {categoryItems.map(item => {
                          const isSelected = selectedMenuIds.includes(item.id);
                          const itemName = language === 'ko' ? item.nameKo :
                                          language === 'vn' ? item.nameVn :
                                          language === 'zh' ? (item.nameZh || item.nameEn || item.nameKo) :
                                          language === 'ru' ? (item.nameRu || item.nameEn || item.nameKo) :
                                          (item.nameEn || item.nameKo);
                          
                          // 이미지 URL 처리
                          const getImageUrl = () => {
                            if (!item.imageUrl) return null;
                            
                            const imageUrl = item.imageUrl.trim();
                            if (!imageUrl) return null;
                            
                            // 이미 절대 URL인 경우 (http://, https://, data:)
                            if (imageUrl.startsWith('http://') || 
                                imageUrl.startsWith('https://') || 
                                imageUrl.startsWith('data:')) {
                              return imageUrl;
                            }
                            
                            // 상대 경로인 경우 - API base URL 사용
                            const apiBaseUrl = typeof window !== 'undefined' 
                              ? (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '').replace(/\/$/, '') || window.location.origin)
                              : '';
                            
                            // 상대 경로가 /로 시작하지 않으면 추가
                            const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
                            return `${apiBaseUrl}${normalizedPath}`;
                          };
                          
                          const fullImageUrl = getImageUrl();
                          
                          return (
                            <label
                              key={item.id}
                              className={cn(
                                "relative flex flex-col border-2 rounded-lg overflow-hidden cursor-pointer transition-all",
                                isSelected 
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                                  : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                if (isSelected) {
                                  setSelectedMenuIds(prev => prev.filter(id => id !== item.id));
                                } else {
                                  setSelectedMenuIds(prev => [...prev, item.id]);
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMenuIds(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedMenuIds(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="hidden"
                              />
                              
                              {/* 이미지 영역 */}
                              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                                {fullImageUrl ? (
                                  <img
                                    src={fullImageUrl}
                                    alt={itemName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.warn('[PromotionManager] 이미지 로드 실패:', {
                                        itemId: item.id,
                                        itemName,
                                        imageUrl: item.imageUrl,
                                        fullImageUrl,
                                      });
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('[PromotionManager] 이미지 로드 성공:', {
                                        itemId: item.id,
                                        itemName,
                                        fullImageUrl,
                                      });
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                  </div>
                                )}
                                
                                {/* 선택 체크 표시 */}
                                <div className={cn(
                                  "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isSelected 
                                    ? "bg-primary border-primary text-primary-foreground" 
                                    : "bg-background/80 border-background"
                                )}>
                                  {isSelected && <Check className="w-4 h-4" />}
                                </div>
                                
                                {/* 할인 배지 */}
                                {isSelected && discountPercent && (
                                  <div className="absolute top-2 left-2">
                                    <Badge variant="default" className="text-xs font-bold">
                                      {discountPercent}%
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              
                              {/* 메뉴 정보 */}
                              <div className="p-2 space-y-1">
                                <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                                  {itemName}
                                </h4>
                                {item.priceVnd > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.priceVnd.toLocaleString()} ₫
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {selectedMenuIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedMenuIds.length}개 메뉴 선택됨
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>할인율 (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={discountPercent ?? ''}
            onChange={(e) => setDiscountPercent(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>시작일 *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>종료일 *</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>표시 순서</Label>
          <Input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">활성화</Label>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showOnLoad">로딩 시 팝업 표시</Label>
          <Switch
            id="showOnLoad"
            checked={showOnLoad}
            onCheckedChange={setShowOnLoad}
          />
        </div>
      </div>
    </ScrollArea>
  );

  if (isDesktop) {
    return (
      <>
        {Content}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-[540px] h-full p-0 flex flex-col overflow-hidden rounded-l-2xl">
            <SheetHeader className="px-6 py-5 border-b border-zinc-100 mb-0">
              <SheetTitle>{editingPromotion ? '프로모션 수정' : '프로모션 추가'}</SheetTitle>
              <SheetDescription>
                프로모션 정보를 입력하세요.
              </SheetDescription>
            </SheetHeader>
            {FormContent}
            <SheetFooter className="px-6 py-4 border-t border-zinc-100">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? '저장 중...' : '저장'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {Content}
      <Drawer open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DrawerContent className="h-[90vh] rounded-t-3xl p-0 bg-white flex flex-col">
          <DrawerHeader className="px-6 py-5 border-b border-zinc-100 mb-0 text-left">
            <DrawerTitle>{editingPromotion ? '프로모션 수정' : '프로모션 추가'}</DrawerTitle>
            <DrawerDescription>
              프로모션 정보를 입력하세요.
            </DrawerDescription>
          </DrawerHeader>
          {FormContent}
          <DrawerFooter className="px-6 py-4 border-t border-zinc-100">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? '저장 중...' : '저장'}
            </Button>
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
              취소
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
