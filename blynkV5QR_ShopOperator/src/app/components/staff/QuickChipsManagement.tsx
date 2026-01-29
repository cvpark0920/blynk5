import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '../ui/drawer';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';

const ICON_OPTIONS = [
  'MessageSquare', 'Reply', 'Coffee', 'Utensils', 'UtensilsCrossed', 'Droplets', 'Water', 'Wifi', 'Music', 'Volume2',
  'Thermometer', 'ThermometerSun', 'ThermometerSnowflake', 'Wind', 'Sun', 'Moon', 'Bell', 'AlertCircle', 'CheckCircle', 'XCircle',
  'Plus', 'Minus', 'Heart', 'Star', 'Smile', 'ThumbsUp', 'HelpCircle', 'Info',
  'Clock', 'Calendar', 'MapPin', 'Phone', 'Mail', 'User', 'Users', 'ShoppingCart',
  'Package', 'Gift', 'CreditCard', 'DollarSign', 'Banknote', 'Receipt', 'FileText', 'Image', 'Video',
  'ChefHat', 'ShoppingBag', 'Napkin', 'Flame', 'Leaf', 'ArrowRight'
];

type QuickChipType = 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';

interface QuickChip {
  id: string;
  restaurantId: string | null;
  type: QuickChipType;
  templateKey?: string | null;
  icon: string;
  labelKo: string;
  labelVn: string;
  labelEn?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
  displayOrder: number;
  isActive: boolean;
}

type EditMode = 'create' | 'override' | 'edit';

const buildTemplateKey = (templateKey: string | null | undefined, icon?: string, labelKo?: string) => {
  const raw = templateKey?.trim();
  const base = raw && raw.length > 0 ? raw : `${icon || ''}-${labelKo || ''}`.trim();
  if (!base) return '';
  return base
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣\-_.]/g, '');
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

export function QuickChipsManagement() {
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<QuickChip[]>([]);
  const [overrides, setOverrides] = useState<QuickChip[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<EditMode>('create');
  const [editingChip, setEditingChip] = useState<QuickChip | null>(null);
  const [baseTemplate, setBaseTemplate] = useState<QuickChip | null>(null);

  const [formData, setFormData] = useState({
    templateKey: '',
    icon: 'MessageSquare',
    labelKo: '',
    labelVn: '',
    labelEn: '',
    messageKo: '',
    messageVn: '',
    messageEn: '',
    displayOrder: 0,
    isActive: true,
  });

  const currentType: QuickChipType = activeTab === 'customer' ? 'CUSTOMER_REQUEST' : 'STAFF_RESPONSE';

  const refreshChips = async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const [templateResponse, overrideResponse] = await Promise.all([
        apiClient.getQuickChipTemplates(currentType, false),
        apiClient.getRestaurantQuickChips(restaurantId, currentType, true),
      ]);

      if (templateResponse.success && templateResponse.data) {
        setTemplates(templateResponse.data);
      } else {
        setTemplates([]);
      }

      if (overrideResponse.success && overrideResponse.data) {
        setOverrides(overrideResponse.data);
      } else {
        setOverrides([]);
      }
    } catch (error) {
      console.error('Failed to load quick chips:', error);
      setTemplates([]);
      setOverrides([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshChips();
  }, [restaurantId, currentType]);

  const mergedTemplates = useMemo(() => {
    const overrideMap = new Map<string, QuickChip>();
    for (const chip of overrides) {
      const key = buildTemplateKey(chip.templateKey, chip.icon, chip.labelKo);
      if (key) overrideMap.set(key, chip);
    }

    return templates.map((template) => {
      const key = buildTemplateKey(template.templateKey, template.icon, template.labelKo);
      const override = key ? overrideMap.get(key) : undefined;
      return {
        key,
        template,
        override,
        displayChip: override || template,
        isOverride: Boolean(override),
      };
    });
  }, [templates, overrides]);

  const storeOnlyChips = useMemo(() => {
    const templateKeys = new Set(
      templates
        .map((chip) => buildTemplateKey(chip.templateKey, chip.icon, chip.labelKo))
        .filter((key) => key)
    );

    return overrides.filter((chip) => {
      const key = buildTemplateKey(chip.templateKey, chip.icon, chip.labelKo);
      return key ? !templateKeys.has(key) : true;
    });
  }, [templates, overrides]);

  const openCreateDialog = () => {
    setEditingMode('create');
    setEditingChip(null);
    setBaseTemplate(null);
    setFormData({
      templateKey: '',
      icon: 'MessageSquare',
      labelKo: '',
      labelVn: '',
      labelEn: '',
      messageKo: '',
      messageVn: '',
      messageEn: '',
      displayOrder: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openOverrideDialog = (template: QuickChip, override?: QuickChip) => {
    if (override) {
      setEditingMode('edit');
      setEditingChip(override);
      setBaseTemplate(template);
      setFormData({
        templateKey: buildTemplateKey(override.templateKey, override.icon, override.labelKo),
        icon: override.icon,
        labelKo: override.labelKo,
        labelVn: override.labelVn,
        labelEn: override.labelEn || '',
        messageKo: override.messageKo || '',
        messageVn: override.messageVn || '',
        messageEn: override.messageEn || '',
        displayOrder: override.displayOrder,
        isActive: override.isActive,
      });
    } else {
      setEditingMode('override');
      setEditingChip(null);
      setBaseTemplate(template);
      setFormData({
        templateKey: buildTemplateKey(template.templateKey, template.icon, template.labelKo),
        icon: template.icon,
        labelKo: template.labelKo,
        labelVn: template.labelVn,
        labelEn: template.labelEn || '',
        messageKo: template.messageKo || '',
        messageVn: template.messageVn || '',
        messageEn: template.messageEn || '',
        displayOrder: template.displayOrder,
        isActive: true,
      });
    }

    setIsDialogOpen(true);
  };

  const openEditDialog = (chip: QuickChip) => {
    setEditingMode('edit');
    setEditingChip(chip);
    setBaseTemplate(null);
    setFormData({
      templateKey: buildTemplateKey(chip.templateKey, chip.icon, chip.labelKo),
      icon: chip.icon,
      labelKo: chip.labelKo,
      labelVn: chip.labelVn,
      labelEn: chip.labelEn || '',
      messageKo: chip.messageKo || '',
      messageVn: chip.messageVn || '',
      messageEn: chip.messageEn || '',
      displayOrder: chip.displayOrder,
      isActive: chip.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    if (!formData.labelKo || !formData.labelVn) {
      toast.error('한국어/베트남어 라벨은 필수입니다.');
      return;
    }

    try {
      if (editingMode === 'edit' && editingChip) {
        await apiClient.updateRestaurantQuickChip(editingChip.id, restaurantId, {
          templateKey: formData.templateKey || undefined,
          icon: formData.icon,
          labelKo: formData.labelKo,
          labelVn: formData.labelVn,
          labelEn: formData.labelEn || undefined,
          messageKo: formData.messageKo || undefined,
          messageVn: formData.messageVn || undefined,
          messageEn: formData.messageEn || undefined,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
        });
        toast.success('상용구가 수정되었습니다.');
      } else {
        await apiClient.createRestaurantQuickChip({
          restaurantId,
          type: currentType,
          templateKey: formData.templateKey || undefined,
          icon: formData.icon,
          labelKo: formData.labelKo,
          labelVn: formData.labelVn,
          labelEn: formData.labelEn || undefined,
          messageKo: formData.messageKo || undefined,
          messageVn: formData.messageVn || undefined,
          messageEn: formData.messageEn || undefined,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
        });
        toast.success(editingMode === 'override' ? '커스텀 상용구가 생성되었습니다.' : '상용구가 생성되었습니다.');
      }

      setIsDialogOpen(false);
      setEditingChip(null);
      setBaseTemplate(null);
      await refreshChips();
    } catch (error) {
      console.error('Failed to save quick chip:', error);
      toast.error('상용구 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (chip: QuickChip) => {
    if (!restaurantId) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await apiClient.deleteRestaurantQuickChip(chip.id, restaurantId);
      toast.success('상용구가 삭제되었습니다.');
      setOverrides((prev) => prev.filter((item) => item.id !== chip.id));
    } catch (error) {
      console.error('Failed to delete quick chip:', error);
      toast.error('상용구 삭제에 실패했습니다.');
    }
  };

  const handleToggle = async (
    template: QuickChip,
    override: QuickChip | undefined,
    nextActive: boolean
  ) => {
    if (!restaurantId) return;
    const toggleKey = override?.id || `template-${template.id}`;
    setTogglingId(toggleKey);
    try {
      if (override) {
        await apiClient.updateRestaurantQuickChip(override.id, restaurantId, {
          isActive: nextActive,
        });
      } else {
        if (!nextActive) {
          await apiClient.createRestaurantQuickChip({
            restaurantId,
            type: template.type,
            templateKey: buildTemplateKey(template.templateKey, template.icon, template.labelKo),
            icon: template.icon,
            labelKo: template.labelKo,
            labelVn: template.labelVn,
            labelEn: template.labelEn,
            messageKo: template.messageKo,
            messageVn: template.messageVn,
            messageEn: template.messageEn,
            displayOrder: template.displayOrder,
            isActive: false,
          });
        }
      }
      await refreshChips();
    } catch (error) {
      console.error('Failed to toggle quick chip:', error);
      toast.error('상용구 상태 변경에 실패했습니다.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleStoreOnlyToggle = async (chip: QuickChip, nextActive: boolean) => {
    if (!restaurantId) return;
    setTogglingId(chip.id);
    try {
      await apiClient.updateRestaurantQuickChip(chip.id, restaurantId, {
        isActive: nextActive,
      });
      await refreshChips();
    } catch (error) {
      console.error('Failed to toggle quick chip:', error);
      toast.error('상용구 상태 변경에 실패했습니다.');
    } finally {
      setTogglingId(null);
    }
  };

  const formContent = (
    <div className="space-y-5">
      {baseTemplate && (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-muted/50 p-4 text-sm text-muted-foreground">
          중앙 템플릿: {baseTemplate.labelKo} / {baseTemplate.labelVn}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="templateKey" className="text-sm font-medium text-foreground">
          템플릿 키
        </Label>
        <Input
          id="templateKey"
          value={formData.templateKey}
          onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
          placeholder="예: water-please"
          className="bg-input-background border-input"
        />
        <p className="text-xs text-muted-foreground mt-1">
          중앙 템플릿과 매장 커스텀을 연결하는 키입니다. 비워두면 자동 생성됩니다.
        </p>
      </div>

      <div className="grid gap-2">
        <Label className="text-sm font-medium text-foreground">아이콘</Label>
        <ScrollArea className="h-40 border border-input rounded-lg p-4 bg-input-background">
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((iconName) => {
              const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.MessageSquare;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: iconName })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.icon === iconName
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-white border-input hover:bg-muted hover:border-ring'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mx-auto" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="labelKo" className="text-sm font-medium text-foreground">
            라벨 (한국어) *
          </Label>
          <Input
            id="labelKo"
            value={formData.labelKo}
            onChange={(e) => setFormData({ ...formData, labelKo: e.target.value })}
            className="bg-input-background border-input"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="labelVn" className="text-sm font-medium text-foreground">
            라벨 (베트남어) *
          </Label>
          <Input
            id="labelVn"
            value={formData.labelVn}
            onChange={(e) => setFormData({ ...formData, labelVn: e.target.value })}
            className="bg-input-background border-input"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="labelEn" className="text-sm font-medium text-foreground">
            라벨 (영어)
          </Label>
          <Input
            id="labelEn"
            value={formData.labelEn}
            onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
            className="bg-input-background border-input"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="messageKo" className="text-sm font-medium text-foreground">
            메시지 (한국어)
          </Label>
          <Input
            id="messageKo"
            value={formData.messageKo}
            onChange={(e) => setFormData({ ...formData, messageKo: e.target.value })}
            className="bg-input-background border-input"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="messageVn" className="text-sm font-medium text-foreground">
            메시지 (베트남어)
          </Label>
          <Input
            id="messageVn"
            value={formData.messageVn}
            onChange={(e) => setFormData({ ...formData, messageVn: e.target.value })}
            className="bg-input-background border-input"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="messageEn" className="text-sm font-medium text-foreground">
            메시지 (영어)
          </Label>
          <Input
            id="messageEn"
            value={formData.messageEn}
            onChange={(e) => setFormData({ ...formData, messageEn: e.target.value })}
            className="bg-input-background border-input"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="displayOrder" className="text-sm font-medium text-foreground">
            정렬 순서
          </Label>
          <Input
            id="displayOrder"
            type="number"
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
            className="bg-input-background border-input"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-input bg-input-background px-4 py-3">
          <Label htmlFor="isActive" className="text-sm font-medium text-foreground">
            활성화
          </Label>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(value) => setFormData({ ...formData, isActive: value })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-24">
      <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>상용구 관리</CardTitle>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            매장 전용 추가
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'customer' | 'staff')}>
            <TabsList className="bg-zinc-100 p-1 w-full md:w-auto">
              <TabsTrigger value="customer">고객 요청</TabsTrigger>
              <TabsTrigger value="staff">직원 응답</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-4">
              <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                <CardHeader>
                  <CardTitle>중앙 템플릿</CardTitle>
                  <CardDescription>중앙 템플릿을 기반으로 매장 커스텀을 만들 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {isLoading ? (
                    <div className="text-sm text-muted-foreground">불러오는 중...</div>
                  ) : mergedTemplates.length === 0 ? (
                    <div className="text-sm text-muted-foreground">템플릿이 없습니다.</div>
                  ) : (
                    <div className="space-y-3">
                      {mergedTemplates.map(({ template, override, displayChip, isOverride }, idx) => {
                        const IconComponent = (LucideIcons as any)[displayChip.icon] || MessageSquare;
                        const isToggleLoading = togglingId === (override?.id || `template-${template.id}`);
                        return (
                          <div
                            key={`${displayChip.id}-${idx}`}
                            className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="flex items-start gap-3 w-full min-w-0">
                              <div className="mt-1 rounded-md bg-zinc-50 border border-zinc-100 p-2">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  {!displayChip.isActive && <Badge variant="secondary">비활성</Badge>}
                                </div>
                                <div className="mt-2 space-y-1">
                                  <div className="font-medium break-words">{displayChip.labelKo}</div>
                                  <div className="text-sm text-muted-foreground break-words">{displayChip.labelVn}</div>
                                {displayChip.messageKo && (
                                  <div className="text-xs text-muted-foreground break-words">
                                    메시지: {displayChip.messageKo}
                                  </div>
                                )}
                                </div>
                              </div>
                            </div>
                            <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-end">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={displayChip.isActive}
                                  disabled={isToggleLoading}
                                  onCheckedChange={(value) => handleToggle(template, override, value)}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {displayChip.isActive ? '사용' : '미사용'}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openOverrideDialog(template, override)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {override && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(override)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                <CardHeader>
                  <CardTitle>매장 전용 상용구</CardTitle>
                  <CardDescription>중앙 템플릿에 없는 매장 전용 상용구입니다.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {storeOnlyChips.length === 0 ? (
                    <div className="text-sm text-muted-foreground">매장 전용 상용구가 없습니다.</div>
                  ) : (
                    <div className="space-y-3">
                      {storeOnlyChips.map((chip) => {
                        const IconComponent = (LucideIcons as any)[chip.icon] || MessageSquare;
                        return (
                          <div key={chip.id} className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 rounded-md bg-zinc-50 border border-zinc-100 p-2">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{chip.labelKo}</span>
                                  {!chip.isActive && <Badge variant="outline">비활성</Badge>}
                                </div>
                                <div className="text-sm text-muted-foreground">{chip.labelVn}</div>
                                {chip.messageKo && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    메시지: {chip.messageKo}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={chip.isActive}
                                  disabled={togglingId === chip.id}
                                  onCheckedChange={(value) => handleStoreOnlyToggle(chip, value)}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {chip.isActive ? '사용' : '미사용'}
                                </span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(chip)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(chip)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isDesktop ? (
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetContent
            side="right"
            className="w-[400px] h-full rounded-l-[32px] sm:max-w-[400px] p-0 bg-white flex flex-col"
          >
            <SheetHeader className="px-6 py-5 border-b border-zinc-100 mb-0 shrink-0">
              <SheetTitle className="text-lg font-semibold text-foreground">
                {editingMode === 'edit' ? '상용구 수정' : '상용구 추가'}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground mt-1">
                {editingMode === 'override'
                  ? '중앙 템플릿을 기반으로 매장 커스텀을 생성합니다.'
                  : '매장 전용 상용구를 관리합니다.'}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {formContent}
            </div>
            <div className="px-6 py-5 border-t border-zinc-100 flex items-center gap-3 justify-end bg-white">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
              <Button onClick={handleSave}>저장</Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DrawerContent className="h-[90vh] bg-white rounded-t-2xl">
            <div className="px-4 pt-4 pb-3 border-b border-zinc-100">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {editingMode === 'edit' ? '상용구 수정' : '상용구 추가'}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground mt-1">
                {editingMode === 'override'
                  ? '중앙 템플릿을 기반으로 매장 커스텀을 생성합니다.'
                  : '매장 전용 상용구를 관리합니다.'}
              </DrawerDescription>
            </div>
            <div className="px-4 py-5 overflow-y-auto flex-1">
              {formContent}
            </div>
            <div className="px-4 py-4 border-t border-zinc-100 flex items-center gap-3 bg-white">
              <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                저장
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
