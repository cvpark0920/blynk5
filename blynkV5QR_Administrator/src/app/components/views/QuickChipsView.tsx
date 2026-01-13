import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Plus, Pencil, Trash2, GripVertical, MessageSquare, Reply } from 'lucide-react';
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

interface QuickChip {
  id: string;
  restaurantId: string | null;
  type: 'CUSTOMER_REQUEST' | 'STAFF_RESPONSE';
  icon: string;
  labelKo: string;
  labelVn: string;
  labelEn?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Restaurant {
  id: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
}

export function QuickChipsView() {
  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null); // null = 플랫폼 전체
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [chips, setChips] = useState<QuickChip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChip, setEditingChip] = useState<QuickChip | null>(null);
  const [formData, setFormData] = useState({
    restaurantId: null as string | null,
    icon: 'MessageSquare',
    labelKo: '',
    labelVn: '',
    labelEn: '',
    messageKo: '',
    messageVn: '',
    messageEn: '',
    isActive: true,
  });

  // Load restaurants on mount
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const response = await apiClient.getRestaurants();
        if (response.success && response.data) {
          setRestaurants(response.data.map((r: any) => ({
            id: r.id,
            nameKo: r.nameKo,
            nameVn: r.nameVn,
            nameEn: r.nameEn,
          })));
        }
      } catch (error) {
        console.error('Failed to load restaurants:', error);
      }
    };
    loadRestaurants();
  }, []);

  useEffect(() => {
    loadChips();
  }, [activeTab, selectedRestaurantId]);

  const loadChips = async () => {
    try {
      setIsLoading(true);
      const type = activeTab === 'customer' ? 'CUSTOMER_REQUEST' : 'STAFF_RESPONSE';
      // selectedRestaurantId가 null이면 명시적으로 null을 전달 (undefined가 아닌)
      console.log('Loading quick chips:', { selectedRestaurantId, type });
      const response = await apiClient.getQuickChips(selectedRestaurantId ?? null, type);
      console.log('Quick chips response:', response);
      
      if (response.success && response.data) {
        // 선택된 식당이 있으면 해당 식당의 상용구만, 없으면 플랫폼 전체 상용구만 표시
        let filteredData = response.data;
        if (selectedRestaurantId) {
          // 특정 식당 선택 시: 해당 식당의 상용구만 표시
          filteredData = response.data.filter(c => c.restaurantId === selectedRestaurantId);
        } else {
          // 플랫폼 전체 선택 시: 플랫폼 전체 상용구만 표시
          filteredData = response.data.filter(c => c.restaurantId === null);
        }
        console.log('Filtered chips:', filteredData);
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
        restaurantId: chip.restaurantId,
        icon: chip.icon,
        labelKo: chip.labelKo,
        labelVn: chip.labelVn,
        labelEn: chip.labelEn || '',
        messageKo: chip.messageKo || '',
        messageVn: chip.messageVn || '',
        messageEn: chip.messageEn || '',
        isActive: chip.isActive,
      });
    } else {
      setEditingChip(null);
      setFormData({
        restaurantId: selectedRestaurantId, // 새로 생성 시 선택된 식당 ID 사용
        icon: 'MessageSquare',
        labelKo: '',
        labelVn: '',
        labelEn: '',
        messageKo: '',
        messageVn: '',
        messageEn: '',
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
          icon: formData.icon,
          labelKo: formData.labelKo,
          labelVn: formData.labelVn,
          labelEn: formData.labelEn || undefined,
          messageKo: formData.messageKo || undefined,
          messageVn: formData.messageVn || undefined,
          messageEn: formData.messageEn || undefined,
          isActive: formData.isActive,
        });
        toast.success('상용구가 수정되었습니다.');
      } else {
        await apiClient.createQuickChip({
          restaurantId: formData.restaurantId || null, // 선택된 식당 ID 또는 플랫폼 전체
          type,
          icon: formData.icon,
          labelKo: formData.labelKo,
          labelVn: formData.labelVn,
          labelEn: formData.labelEn || undefined,
          messageKo: formData.messageKo || undefined,
          messageVn: formData.messageVn || undefined,
          messageEn: formData.messageEn || undefined,
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

  return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">상용구 관리</h2>
        <p className="text-muted-foreground">고객 요청 및 직원 응답 상용구를 관리합니다.</p>
      </div>

      {/* 식당 선택 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <Label htmlFor="restaurant-select">식당 선택</Label>
              <Select
                value={selectedRestaurantId || 'all'}
                onValueChange={(value) => setSelectedRestaurantId(value === 'all' ? null : value)}
              >
                <SelectTrigger id="restaurant-select" className="mt-2">
                  <SelectValue placeholder="식당을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">플랫폼 전체 (모든 식당 공통)</SelectItem>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.nameKo} ({restaurant.nameVn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedRestaurantId 
                ? `선택된 식당의 상용구만 표시됩니다.`
                : `플랫폼 전체 상용구가 표시됩니다. (모든 식당에서 사용 가능)`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'staff')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customer" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            고객 요청 상용구
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Reply className="w-4 h-4" />
            직원 응답 상용구
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {activeTab === 'customer' ? '고객 요청 상용구' : '직원 응답 상용구'}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === 'customer'
                      ? '고객이 사용할 수 있는 요청 상용구를 관리합니다.'
                      : '직원이 사용할 수 있는 응답 상용구를 관리합니다.'}
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
              ) : filteredChips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 상용구가 없습니다.
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {filteredChips.map((chip) => (
                    <div
                      key={chip.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {renderIcon(chip.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{chip.labelKo}</span>
                            {chip.restaurantId && (
                              <Badge variant="outline" className="text-xs">
                                {restaurants.find(r => r.id === chip.restaurantId)?.nameKo || '식당별'}
                              </Badge>
                            )}
                            {!chip.restaurantId && (
                              <Badge variant="default" className="text-xs">플랫폼 전체</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{chip.labelVn}</div>
                          {chip.messageKo && (
                            <div className="text-xs text-muted-foreground mt-1">
                              메시지: {chip.messageKo}
                            </div>
                          )}
                        </div>
                        {!chip.isActive && (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChip ? '상용구 수정' : '상용구 추가'}
            </DialogTitle>
            <DialogDescription>
              {activeTab === 'customer'
                ? '고객이 사용할 요청 상용구를 설정합니다.'
                : '직원이 사용할 응답 상용구를 설정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 식당 선택 (생성 시에만 표시) */}
            {!editingChip && (
              <div className="grid gap-2">
                <Label htmlFor="dialog-restaurant-select">적용 대상</Label>
                <Select
                  value={formData.restaurantId || 'all'}
                  onValueChange={(value) => setFormData({ ...formData, restaurantId: value === 'all' ? null : value })}
                >
                  <SelectTrigger id="dialog-restaurant-select">
                    <SelectValue placeholder="식당을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">플랫폼 전체 (모든 식당 공통)</SelectItem>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.nameKo} ({restaurant.nameVn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  플랫폼 전체를 선택하면 모든 식당에서 사용할 수 있습니다.
                  특정 식당을 선택하면 해당 식당에서만 사용됩니다.
                </p>
              </div>
            )}
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
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>

            {/* Messages */}
            <div className="grid gap-4 md:grid-cols-3">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
