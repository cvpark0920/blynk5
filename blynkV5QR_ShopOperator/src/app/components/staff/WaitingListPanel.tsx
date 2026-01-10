import React, { useState } from 'react';
import { Users, Phone, Clock, Plus, Bell, Ban, Check, Edit2, Trash2 } from 'lucide-react';
import { WaitingEntry, WaitingStatus } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from "../context/UnifiedAuthContext"';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';

interface WaitingListPanelProps {
  waitingList: WaitingEntry[];
  setWaitingList: React.Dispatch<React.SetStateAction<WaitingEntry[]>>;
  onSeat: (entry: WaitingEntry) => void;
  onReload?: () => void;
  className?: string;
}

export function WaitingListPanel({ waitingList, setWaitingList, onSeat, onReload, className }: WaitingListPanelProps) {
  const { t } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<WaitingEntry>>({
    name: '',
    phone: '',
    guests: 2,
    note: ''
  });

  const activeWaitingList = waitingList.filter(entry => entry.status === 'waiting' || entry.status === 'notified');

  const openAddDrawer = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', guests: 2, note: '' });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (entry: WaitingEntry) => {
    setEditingId(entry.id);
    setFormData({
      name: entry.name,
      phone: entry.phone,
      guests: entry.guests,
      note: entry.note
    });
    setIsDrawerOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!formData.name || !formData.phone || !restaurantId) {
      toast.error(t('msg.name_required') || '이름과 전화번호는 필수입니다.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        // 수정 모드는 현재 API에 없으므로, 삭제 후 재생성 방식으로 처리
        // 또는 별도 수정 API가 필요할 수 있음
        toast.error('대기 정보 수정 기능은 준비 중입니다.');
        setIsDrawerOpen(false);
        return;
      } else {
        // 추가 모드 - API 호출
        const result = await apiClient.addToWaitingList(restaurantId, {
          name: formData.name,
          phone: formData.phone,
          guestCount: formData.guests || 2,
          note: formData.note,
        });

        if (result.success && result.data) {
          // Map backend response to frontend format
          const newEntry: WaitingEntry = {
            id: result.data.id,
            name: result.data.name,
            phone: result.data.phone,
            guests: result.data.guestCount,
            status: result.data.status.toLowerCase() as WaitingEntry['status'],
            timestamp: new Date(result.data.timestamp),
            note: result.data.note || undefined,
          };
          setWaitingList(prev => [...prev, newEntry]);
          toast.success(t('msg.wait_added') || '대기 목록에 추가되었습니다.');
        } else {
          throw new Error(result.error?.message || 'Failed to add to waiting list');
        }
      }

      setIsDrawerOpen(false);
      setFormData({ name: '', phone: '', guests: 2, note: '' });
      
      // Reload waiting list if callback provided
      if (onReload) {
        onReload();
      }
    } catch (error: unknown) {
      console.error('Error saving waiting entry:', error);
      const errorMessage = error instanceof Error ? error.message : '대기 목록 추가에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('정말 이 대기 항목을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // Update status to CANCELLED via API
      const result = await apiClient.updateWaitingListStatus(id, 'CANCELLED');
      
      if (result.success) {
        // Update local state
        setWaitingList(prev => prev.filter(entry => entry.id !== id));
        toast.success('대기 항목이 삭제되었습니다.');
        
        // Reload waiting list if callback provided
        if (onReload) {
          onReload();
        }
      } else {
        throw new Error(result.error?.message || 'Failed to delete waiting entry');
      }
    } catch (error: unknown) {
      console.error('Error deleting waiting entry:', error);
      toast.error('대기 항목 삭제에 실패했습니다.');
    }
  };

  const updateStatus = async (id: string, status: WaitingStatus) => {
    try {
      // Map frontend status to backend status (uppercase)
      const backendStatus = status.toUpperCase() as 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED';
      const result = await apiClient.updateWaitingListStatus(id, backendStatus);
      
      if (result.success) {
        // Update local state
        setWaitingList(prev => prev.map(entry => {
          if (entry.id === id) {
            return { ...entry, status };
          }
          return entry;
        }));

        if (status === 'notified') toast.success(t('msg.wait_notified') || '고객에게 알림을 보냈습니다.');
        if (status === 'cancelled') toast.info(t('msg.wait_cancelled') || '대기가 취소되었습니다.');
        
        // Reload waiting list if callback provided
        if (onReload) {
          onReload();
        }
      } else {
        throw new Error(result.error?.message || 'Failed to update waiting list status');
      }
    } catch (error: unknown) {
      console.error('Error updating waiting list status:', error);
      toast.error('상태 업데이트에 실패했습니다.');
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white border-l border-zinc-200 shadow-sm", className)}>
      <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
        <h3 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
          {t('wait.title')}
          <span className="bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {activeWaitingList.length}
          </span>
        </h3>
        <button 
          onClick={openAddDrawer}
          className="p-2 bg-zinc-900 text-white rounded-xl shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-95"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeWaitingList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3">
            <Users size={48} className="opacity-20" />
            <p className="text-sm font-medium">{t('wait.empty')}</p>
          </div>
        ) : (
          activeWaitingList.map(entry => (
            <div key={entry.id} className={cn(
              "bg-white p-4 rounded-2xl border transition-all relative overflow-hidden group",
              entry.status === 'notified' ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-100 shadow-sm"
            )}>
              {entry.status === 'notified' && (
                <div className="absolute top-0 right-0 p-1.5 bg-emerald-500 rounded-bl-xl">
                  <Bell size={10} className="text-white animate-pulse" />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-zinc-900">{entry.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                    <Users size={12} /> {entry.guests} • <Phone size={12} /> {entry.phone}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xs font-bold text-zinc-400 bg-zinc-50 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Clock size={12} />
                    {Math.floor((Date.now() - entry.timestamp.getTime()) / 60000)}m
                  </div>
                </div>
              </div>

              {entry.note && (
                <div className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded-lg mb-3 line-clamp-2">
                  {entry.note}
                </div>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-zinc-100">
                {entry.status === 'waiting' ? (
                  <button 
                    onClick={() => updateStatus(entry.id, 'notified')}
                    className="flex-1 h-8 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Bell size={12} /> {t('wait.action_notify')}
                  </button>
                ) : (
                  <button 
                    onClick={() => onSeat(entry)}
                    className="flex-1 h-8 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 shadow-lg shadow-emerald-200"
                  >
                    <Check size={12} /> {t('wait.action_seat')}
                  </button>
                )}
                
                <div className="flex gap-1 shrink-0">
                  <button 
                    onClick={() => openEditDrawer(entry)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                    title={t('wait.action.edit')}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => updateStatus(entry.id, 'cancelled')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    title={t('wait.action.cancel')}
                  >
                    <Ban size={14} />
                  </button>
                   <button 
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
                    title={t('wait.action.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>{editingId ? '대기 정보 수정' : t('wait.add')}</DrawerTitle>
              <DrawerDescription>
                {editingId ? '대기 고객의 정보를 수정합니다.' : 'Add a new party to the waiting list.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0 space-y-4">
              <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-right text-sm font-medium">{t('wait.name')}</label>
                <Input 
                  className="col-span-3" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-right text-sm font-medium">{t('wait.phone')}</label>
                <Input 
                  className="col-span-3" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="전화번호를 입력하세요"
                  type="tel"
                />
              </div>
              <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-right text-sm font-medium">{t('wait.guests')}</label>
                <div className="col-span-3 flex items-center gap-3">
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, guests: Math.max(1, (prev.guests || 2) - 1) }))}
                    className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold hover:bg-zinc-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="font-bold text-lg w-8 text-center">{formData.guests}</span>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, guests: (prev.guests || 2) + 1 }))}
                    className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold hover:bg-zinc-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 items-start">
                <label className="text-right text-sm font-medium pt-2">{t('wait.note')}</label>
                <Textarea 
                  className="col-span-3 min-h-[80px]" 
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="메모를 입력하세요..."
                />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleSaveEntry} disabled={isLoading} className="w-full">
                {isLoading ? t('wait.saving') : (editingId ? t('btn.save') : t('wait.add'))}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full" disabled={isLoading}>{t('wait.action.cancel')}</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}