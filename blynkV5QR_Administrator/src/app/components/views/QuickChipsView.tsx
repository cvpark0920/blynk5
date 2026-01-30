import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '../ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Plus, Pencil, Trash2, MessageSquare, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';
import * as LucideIcons from 'lucide-react';

// 아이콘 목록 (자주 사용되는 아이콘들)
const ICON_OPTIONS = [
  'MessageSquare', 'Reply', 'Coffee', 'Utensils', 'UtensilsCrossed', 'Droplets', 'Water', 'Wifi', 'Music', 'Volume2',
  'Thermometer', 'ThermometerSun', 'ThermometerSnowflake', 'Wind', 'Sun', 'Moon', 'Bell', 'AlertCircle', 'CheckCircle', 'XCircle',
  'Plus', 'Minus', 'Heart', 'Star', 'Smile', 'ThumbsUp', 'HelpCircle', 'Info',
  'Clock', 'Calendar', 'MapPin', 'Phone', 'Mail', 'User', 'Users', 'ShoppingCart',
  'Package', 'Gift', 'CreditCard', 'DollarSign', 'Banknote', 'Receipt', 'FileText', 'Image', 'Video',
  'ChefHat', 'ShoppingBag', 'Napkin', 'Flame', 'Leaf', 'ArrowRight'
];

function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false);

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}

const buildTemplateKey = (templateKey: string | null | undefined, icon?: string, labelKo?: string) => {
  const raw = templateKey?.trim();
  const base = raw && raw.length > 0 ? raw : `${icon || ''}-${labelKo || ''}`.trim();
  if (!base) return '';
  return base
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣\-_.]/g, '');
};

interface QuickChip {
  id: string;
  restaurantId: string | null;
  type: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';
  templateKey?: string | null;
  icon: string;
  labelKo: string;
  labelVn: string;
  labelEn?: string;
  labelZh?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
  messageZh?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function QuickChipsView() {
  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [chips, setChips] = useState<QuickChip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChip, setEditingChip] = useState<QuickChip | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [formData, setFormData] = useState({
    templateKey: '',
    icon: 'MessageSquare',
    labelKo: '',
    labelVn: '',
    labelEn: '',
    labelZh: '',
    messageKo: '',
    messageVn: '',
    messageEn: '',
    messageZh: '',
    isActive: true,
  });

  useEffect(() => {
    loadChips();
  }, [activeTab]);

  const loadChips = async () => {
    try {
      setIsLoading(true);
      const type = activeTab === 'customer' ? 'CUSTOMER_REQUEST' : 'STAFF_RESPONSE';
      // 관리자 앱에서는 중앙 템플릿만 조회
      const response = await apiClient.getQuickChips(null, type);
      
      if (response.success && response.data) {
        // 관리자 앱에서는 중앙 템플릿(restaurantId=null)만 관리
        const filteredData = response.data.filter(c => c.restaurantId === null);
        setChips(filteredData);
      } else {
        console.error('Failed to load quick chips:', response.error);
        toast.error(response.error?.message || '상용구를 불러오는데 실패했습니다.');
        setChips([]);
      }
    } catch (error) {
      console.error('Failed to load quick chips:', error);
      toast.error('상용구를 불러오는데 실패했습니다.');
      setChips([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (chip?: QuickChip) => {
    if (chip) {
      setEditingChip(chip);
      setFormData({
        templateKey: buildTemplateKey(chip.templateKey, chip.icon, chip.labelKo),
        icon: chip.icon,
        labelKo: chip.labelKo,
        labelVn: chip.labelVn,
        labelEn: chip.labelEn || '',
        labelZh: chip.labelZh || '',
        messageKo: chip.messageKo || '',
        messageVn: chip.messageVn || '',
        messageEn: chip.messageEn || '',
        messageZh: chip.messageZh || '',
        isActive: chip.isActive,
      });
    } else {
      setEditingChip(null);
      setFormData({
        templateKey: '',
        icon: 'MessageSquare',
        labelKo: '',
        labelVn: '',
        labelEn: '',
        labelZh: '',
        messageKo: '',
        messageVn: '',
        messageEn: '',
        messageZh: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.labelKo || !formData.labelVn) {
      toast.error('한국어와 베트남어 라벨은 필수입니다.');
      return;
    }

    try {
      const type = activeTab === 'customer' ? 'CUSTOMER_REQUEST' : 'STAFF_RESPONSE';
      
      if (editingChip) {
        await apiClient.updateQuickChip(editingChip.id, {
          templateKey: formData.templateKey || undefined,
          icon: formData.icon,
          labelKo: formData.labelKo,
          labelVn: formData.labelVn,
          labelEn: formData.labelEn || undefined,
          labelZh: formData.labelZh || undefined,
          messageKo: formData.messageKo || undefined,
          messageVn: formData.messageVn || undefined,
          messageEn: formData.messageEn || undefined,
          messageZh: formData.messageZh || undefined,
          isActive: formData.isActive,
        });
        toast.success('상용구가 수정되었습니다.');
      } else {
        await apiClient.createQuickChip({
          type,
          templateKey: formData.templateKey || undefined,
          icon: formData.icon,
          labelKo: formData.labelKo,
          labelVn: formData.labelVn,
          labelEn: formData.labelEn || undefined,
          labelZh: formData.labelZh || undefined,
          messageKo: formData.messageKo || undefined,
          messageVn: formData.messageVn || undefined,
          messageEn: formData.messageEn || undefined,
          messageZh: formData.messageZh || undefined,
          isActive: formData.isActive,
        });
        toast.success('상용구가 생성되었습니다.');
      }
      
      setIsDialogOpen(false);
      loadChips();
    } catch (error) {
      console.error('Failed to save quick chip:', error);
      toast.error('상용구 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await apiClient.deleteQuickChip(id);
      toast.success('상용구가 삭제되었습니다.');
      loadChips();
    } catch (error) {
      console.error('Failed to delete quick chip:', error);
      toast.error('상용구 삭제에 실패했습니다.');
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.MessageSquare;
    return <IconComponent className="w-4 h-4" />;
  };

  // 이미 loadChips에서 필터링하므로 여기서는 정렬만 수행
  const filteredChips = chips.sort((a, b) => a.displayOrder - b.displayOrder);

  const formFields = (
    <>
      <div className="grid gap-2">
        <Label htmlFor="templateKey">템플릿 키</Label>
        <Input
          id="templateKey"
          value={formData.templateKey}
          onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
          placeholder="예: water-please"
        />
        <p className="text-xs text-muted-foreground">
          중앙 템플릿과 매장 커스텀을 연결하는 키입니다. 비워두면 자동 생성됩니다.
        </p>
      </div>
      {/* Icon Selection */}
      <div className="grid gap-2">
        <Label>아이콘</Label>
        <ScrollArea className="h-48 border rounded-lg p-4">
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
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mx-auto" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Labels */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="labelKo">라벨 (한국어) *</Label>
          <Input
            id="labelKo"
            value={formData.labelKo}
            onChange={(e) => setFormData({ ...formData, labelKo: e.target.value })}
            placeholder="예: 물 주세요"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="labelVn">라벨 (베트남어) *</Label>
          <Input
            id="labelVn"
            value={formData.labelVn}
            onChange={(e) => setFormData({ ...formData, labelVn: e.target.value })}
            placeholder="예: Cho tôi nước"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="labelEn">라벨 (영어)</Label>
          <Input
            id="labelEn"
            value={formData.labelEn}
            onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
            placeholder="예: Water please"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="labelZh">라벨 (중국어)</Label>
          <Input
            id="labelZh"
            value={formData.labelZh}
            onChange={(e) => setFormData({ ...formData, labelZh: e.target.value })}
            placeholder="예: 请给我水"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="messageKo">메시지 (한국어)</Label>
          <Input
            id="messageKo"
            value={formData.messageKo}
            onChange={(e) => setFormData({ ...formData, messageKo: e.target.value })}
            placeholder="고객에게 전송될 메시지"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="messageVn">메시지 (베트남어)</Label>
          <Input
            id="messageVn"
            value={formData.messageVn}
            onChange={(e) => setFormData({ ...formData, messageVn: e.target.value })}
            placeholder="Tin nhắn gửi đến khách hàng"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="messageEn">메시지 (영어)</Label>
          <Input
            id="messageEn"
            value={formData.messageEn}
            onChange={(e) => setFormData({ ...formData, messageEn: e.target.value })}
            placeholder="Message sent to customer"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="messageZh">메시지 (중국어)</Label>
          <Input
            id="messageZh"
            value={formData.messageZh}
            onChange={(e) => setFormData({ ...formData, messageZh: e.target.value })}
            placeholder="发送给客户的消息"
          />
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>활성화</Label>
          <p className="text-sm text-muted-foreground">
            상용구를 활성화하면 고객/직원이 사용할 수 있습니다.
          </p>
        </div>
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
      </div>
    </>
  );

  return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>상용구 관리</CardTitle>
            <CardDescription>중앙 템플릿 상용구를 관리합니다.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            추가
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'staff')} className="w-full">
            <TabsList className="bg-zinc-100 p-1 w-full md:w-auto">
              <TabsTrigger value="customer">고객 요청</TabsTrigger>
              <TabsTrigger value="staff">직원 응답</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-4">
              <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {activeTab === 'customer' ? '고객 요청 상용구' : '직원 응답 상용구'}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === 'customer'
                      ? '고객이 사용할 수 있는 요청 상용구를 관리합니다.'
                      : '직원이 사용할 수 있는 응답 상용구를 관리합니다.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {isLoading ? (
                    <div className="text-sm text-muted-foreground">로딩 중...</div>
                  ) : filteredChips.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      등록된 상용구가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredChips.map((chip) => (
                        <div
                          key={chip.id}
                          className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="flex items-start gap-3 w-full min-w-0">
                            <div className="mt-1 rounded-md bg-zinc-50 border border-zinc-100 p-2">
                              {renderIcon(chip.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {!chip.isActive && (
                                  <Badge variant="secondary">비활성</Badge>
                                )}
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="font-medium break-words">{chip.labelKo}</div>
                                <div className="text-sm text-muted-foreground break-words">{chip.labelVn}</div>
                                {chip.labelZh && (
                                  <div className="text-sm text-muted-foreground break-words">{chip.labelZh}</div>
                                )}
                                {chip.messageKo && (
                                  <div className="text-xs text-muted-foreground break-words">
                                    메시지: {chip.messageKo}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(chip)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(chip.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Sheet/Drawer */}
      {isDesktop ? (
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {editingChip ? '상용구 수정' : '상용구 추가'}
              </SheetTitle>
              <SheetDescription>
                {activeTab === 'customer'
                  ? '고객이 사용할 요청 상용구를 설정합니다.'
                  : '직원이 사용할 응답 상용구를 설정합니다.'}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 py-4 px-4">
              {formFields}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>저장</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>
                {editingChip ? '상용구 수정' : '상용구 추가'}
              </DrawerTitle>
              <DrawerDescription>
                {activeTab === 'customer'
                  ? '고객이 사용할 요청 상용구를 설정합니다.'
                  : '직원이 사용할 응답 상용구를 설정합니다.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 overflow-y-auto">
              <div className="grid gap-4 py-4">
                {formFields}
              </div>
            </div>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>저장</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
