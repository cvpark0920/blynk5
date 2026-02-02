import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { BackendPromotion } from '../../types/api';
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
  const [discountPercent, setDiscountPercent] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showOnLoad, setShowOnLoad] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      loadPromotions();
    }
  }, [restaurantId]);

  const loadPromotions = async () => {
    if (!restaurantId) return;
    
    setIsLoadingList(true);
    try {
      const result = await apiClient.getPromotions(restaurantId);
      if (result.success && result.data) {
        setPromotions(result.data);
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
    setDiscountPercent(undefined);
    setStartDate('');
    setEndDate('');
    setDisplayOrder(promotions.length);
    setIsActive(true);
    setShowOnLoad(false);
    setEditingPromotion(null);
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
    setImageUrl(promotion.imageUrl || '');
    setDiscountPercent(promotion.discountPercent || undefined);
    setStartDate(new Date(promotion.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(promotion.endDate).toISOString().split('T')[0]);
    setDisplayOrder(promotion.displayOrder);
    setIsActive(promotion.isActive);
    setShowOnLoad(promotion.showOnLoad);
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
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold">{isEmbedded ? '프로모션 관리' : '프로모션'}</h2>
        <Button onClick={openCreateSheet} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          추가
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {isLoadingList ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              프로모션이 없습니다. 새 프로모션을 추가해보세요.
            </div>
          ) : (
            promotions.map((promotion) => {
              const active = isActivePromotion(promotion);
              return (
                <div
                  key={promotion.id}
                  className={cn(
                    'border rounded-lg p-4 space-y-3',
                    !promotion.isActive && 'opacity-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{getLocalizedTitle(promotion)}</h3>
                        {active && <Badge variant="default">진행중</Badge>}
                        {promotion.showOnLoad && <Badge variant="secondary">로딩 팝업</Badge>}
                        {promotion.discountPercent && (
                          <Badge variant="outline">{promotion.discountPercent}% 할인</Badge>
                        )}
                        {!promotion.isActive && <Badge variant="secondary">비활성</Badge>}
                      </div>
                      {(promotion.descriptionKo || promotion.descriptionVn) && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {language === 'ko' ? promotion.descriptionKo : promotion.descriptionVn}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(promotion.startDate).toLocaleDateString()} ~{' '}
                          {new Date(promotion.endDate).toLocaleDateString()}
                        </div>
                        <div>순서: {promotion.displayOrder}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditSheet(promotion)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(promotion.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {promotion.imageUrl && (
                    <div className="rounded-md overflow-hidden">
                      <img
                        src={promotion.imageUrl}
                        alt={getLocalizedTitle(promotion)}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                </div>
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

        <div className="space-y-2">
          <Label>이미지 URL</Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
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
