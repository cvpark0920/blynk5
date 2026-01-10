import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Plus, MoreHorizontal, Check, X, Trash2, Search, Briefcase, Mail, Lock, Upload, Phone } from 'lucide-react';
import { Staff, UserRole, StaffStatus } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from "../context/UnifiedAuthContext"';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

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

interface StaffManagementProps {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  isEmbedded?: boolean;
}

export function StaffManagement({ staffList, setStaffList, isEmbedded = false }: StaffManagementProps) {
  const { t } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<Staff | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const isDesktop = useIsDesktop();
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch staff list from API on mount and when restaurantId changes
  useEffect(() => {
    if (!restaurantId || !apiClient.isAuthenticated()) return;

    const fetchStaffList = async () => {
      setIsLoadingList(true);
      try {
        const result = await apiClient.getStaffList(restaurantId);
        if (result.success && result.data) {
          const transformedStaff: Staff[] = result.data.map((s: any) => ({
            id: s.id,
            name: s.name || '',
            email: s.email || '',
            role: (s.role?.toLowerCase() || 'kitchen') as UserRole,
            pinCode: s.hasPin ? '••••' : '', // PIN이 설정되어 있으면 표시 (실제 값은 보안상 전달되지 않음)
            phone: s.phone || '',
            status: (s.status?.toLowerCase() || 'active') as StaffStatus,
            joinedAt: s.joinedAt ? new Date(s.joinedAt) : new Date(),
            avatarUrl: s.avatarUrl || undefined,
          }));
          setStaffList(transformedStaff);
        } else {
          console.error('Failed to fetch staff list:', result.error);
        }
      } catch (error: unknown) {
        console.error('Error fetching staff list:', error);
        toast.error('직원 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingList(false);
      }
    };

    fetchStaffList();
  }, [restaurantId]); // setStaffList는 함수이므로 dependency에서 제거

  // Form State
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '',
    email: '',
    role: 'kitchen',
    pinCode: '',
    phone: '',
    status: 'active',
    avatarUrl: ''
  });

  const activeStaff = staffList.filter(s => s.status !== 'pending');
  const pendingStaff = staffList.filter(s => s.status === 'pending');

  const getFilteredList = (list: Staff[]) => list.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery)
  );

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'bg-zinc-900 text-white hover:bg-zinc-800';
      case 'manager': return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      case 'kitchen': return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      case 'hall': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'staff': return 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  // Convert image file to Base64 with compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Compress and resize image
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to Base64 with quality compression (0.8 = 80% quality)
          const base64String = canvas.toDataURL('image/jpeg', 0.8);
          setFormData({ ...formData, avatarUrl: base64String });
        } else {
          toast.error('Failed to process image');
        }
      };
      img.onerror = () => {
        toast.error('Failed to load image');
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    if (!restaurantId) {
      toast.error('Restaurant ID is required');
      return;
    }

    setIsLoading(true);
    try {
      const staffData: any = {
        name: formData.name,
        email: formData.email || undefined,
        role: formData.role?.toUpperCase() || 'KITCHEN',
        phone: formData.phone || undefined,
        avatarUrl: formData.avatarUrl || undefined,
      };

      if (formData.pinCode) {
        staffData.pinCode = formData.pinCode;
      }

      if (editingStaff) {
        // Always include status to preserve existing status if not changed
        if (formData.status) {
          staffData.status = formData.status.toUpperCase();
        } else {
          // If status is not provided, use the existing staff's status
          staffData.status = editingStaff.status.toUpperCase();
        }
        const result = await apiClient.updateStaff(restaurantId, editingStaff.id, staffData);
        if (result.success && result.data) {
          // Convert API response to frontend format
          const updatedStaff: Staff = {
            ...editingStaff,
            name: result.data.name,
            email: result.data.email || '',
            role: result.data.role.toLowerCase() as UserRole,
            phone: result.data.phone || '',
            avatarUrl: result.data.avatarUrl || undefined,
            status: (result.data.status?.toLowerCase() || editingStaff.status) as StaffStatus,
          };
          setStaffList(prev => prev.map(s => s.id === editingStaff.id ? updatedStaff : s));
          toast.success(t('msg.staff_updated'));
        } else {
          throw new Error(result.error?.message || 'Failed to update staff');
        }
      } else {
        const result = await apiClient.createStaff(restaurantId, staffData);
        if (result.success && result.data) {
          const newStaff: Staff = {
            id: result.data.id,
            name: result.data.name,
            email: result.data.email,
            role: result.data.role.toLowerCase() as UserRole,
            pinCode: '',
            phone: result.data.phone,
            status: result.data.status.toLowerCase() as StaffStatus,
            joinedAt: new Date(result.data.joinedAt),
            avatarUrl: result.data.avatarUrl
          };
          setStaffList(prev => [...prev, newStaff]);
          toast.success(t('msg.staff_added'));
        } else {
          throw new Error(result.error?.message || 'Failed to create staff');
        }
      }
      
      setIsSheetOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', email: '', role: 'kitchen', pinCode: '', phone: '', status: 'active', avatarUrl: '' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save staff';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (!selectedStaffForPin || !restaurantId || !pinCode || pinCode.length < 4) {
      toast.error('Please enter a valid PIN (at least 4 digits)');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.setStaffPin(restaurantId, selectedStaffForPin.id, pinCode);
      if (result.success) {
        toast.success(`PIN set for ${selectedStaffForPin.name}`);
        setPinCode('');
        setPinDialogOpen(false);
        setSelectedStaffForPin(null);
      } else {
        throw new Error(result.error?.message || 'Failed to set PIN');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set PIN';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddSheet = () => {
    setEditingStaff(null);
    setFormData({ name: '', email: '', role: 'kitchen', pinCode: '', phone: '', status: 'active', avatarUrl: '' });
    setIsSheetOpen(true);
  };

  const openEditSheet = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({ 
      ...staff, 
      email: staff.email || '',
      phone: staff.phone || '',
      pinCode: staff.pinCode || '',
      avatarUrl: staff.avatarUrl || '',
      status: staff.status || 'active' // Ensure status is set
    });
    setIsSheetOpen(true);
  };

  const openPinDialog = (staff: Staff) => {
    setSelectedStaffForPin(staff);
    setPinCode('');
    setPinDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    if (!restaurantId) {
      toast.error('Restaurant ID is required');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.deleteStaff(restaurantId, id);
      if (result.success) {
        setStaffList(prev => prev.filter(s => s.id !== id));
        toast.success(t('msg.staff_deleted'));
      } else {
        throw new Error(result.error?.message || 'Failed to delete staff');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete staff';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = (id: string) => {
      setStaffList(prev => prev.map(s => {
          if (s.id !== id) return s;
          const newStatus = s.status === 'active' ? 'inactive' : 'active';
          return { ...s, status: newStatus };
      }));
      toast.success(t('msg.staff_updated'));
  };

  const approveStaff = (id: string) => {
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: 'active' } : s));
      toast.success(t('msg.staff_approved'));
  };

  const rejectStaff = (id: string) => {
      if(confirm('Reject this request? This will remove the user.')) {
        setStaffList(prev => prev.filter(s => s.id !== id));
        toast.success(t('msg.staff_rejected'));
      }
  };

  const StaffCard = ({ staff, isPending = false }: { staff: Staff, isPending?: boolean }) => (
    <div 
        key={staff.id} 
        className={`
          relative bg-white p-5 rounded-2xl border transition-all group hover:shadow-md
          ${staff.status === 'active' ? 'border-zinc-100 opacity-100' : isPending ? 'border-yellow-100 bg-yellow-50/30' : 'border-zinc-100 opacity-60 bg-zinc-50'}
        `}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold overflow-hidden
              ${staff.role === 'owner' ? 'bg-zinc-900 text-white' : 
                staff.role === 'manager' ? 'bg-purple-50 text-purple-600' : 
                staff.role === 'kitchen' ? 'bg-orange-50 text-orange-600' :
                staff.role === 'hall' ? 'bg-blue-50 text-blue-600' :
                'bg-zinc-100 text-zinc-500'}
            `}>
              {staff.avatarUrl ? (
                <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
              ) : (
                staff.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">{staff.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`border-none px-2 py-0 h-5 text-[10px] uppercase font-bold tracking-wider ${getRoleBadgeColor(staff.role)}`}>
                    {t(`role.${staff.role}`)}
                </Badge>
                {!isPending && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${staff.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {staff.status === 'active' ? t('staff.active') : t('staff.inactive')}
                    </span>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-zinc-100 rounded-lg outline-none">
              <MoreHorizontal size={18} className="text-zinc-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditSheet(staff)} className="gap-2">
                <Briefcase size={14} /> Edit Details
              </DropdownMenuItem>
              {!isPending && (
                <DropdownMenuItem onClick={() => toggleStatus(staff.id)} className="gap-2">
                    {staff.status === 'active' ? <X size={14} /> : <Check size={14} />}
                    {staff.status === 'active' ? 'Mark Inactive' : 'Mark Active'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(staff.id)} className="text-rose-600 gap-2">
                <Trash2 size={14} /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
            {staff.phone && (
              <div className="flex items-center justify-between text-sm p-2 bg-white/50 border border-zinc-100/50 rounded-lg">
                <span className="text-zinc-500 flex items-center gap-2">
                  <Phone size={14} /> 전화번호
                </span>
                <span className="font-medium text-zinc-900 text-xs">
                  {staff.phone}
                </span>
              </div>
            )}
            {staff.pinCode && (
               <div className="flex items-center justify-between text-sm p-2 bg-white/50 border border-zinc-100/50 rounded-lg">
                  <span className="text-zinc-500 flex items-center gap-2" title="Used for quick login on POS devices">
                    <Key size={14} /> POS PIN
                  </span>
                  <span className="font-mono font-bold text-zinc-900 tracking-widest">
                    {staff.role === 'owner' ? '••••' : staff.pinCode}
                  </span>
               </div>
            )}
        </div>
        
        {isPending && (
            <div className="mt-4 flex gap-2">
                <button 
                    onClick={() => approveStaff(staff.id)}
                    className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-zinc-800 transition-colors"
                >
                    {t('staff.approve')}
                </button>
                <button 
                    onClick={() => rejectStaff(staff.id)}
                    className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors"
                >
                    {t('staff.reject')}
                </button>
            </div>
        )}
      </div>
  );

  return (
    <div className={`mx-auto max-w-5xl space-y-6 pb-32 md:pb-6 ${isEmbedded ? 'px-6 pt-2' : 'p-6'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {!isEmbedded && (
            <div>
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                {t('settings.staff_title')}
                <Badge variant="outline" className="text-zinc-500 font-normal">
                {staffList.length}
                </Badge>
            </h2>
            <p className="text-sm text-zinc-500 mt-1">{t('settings.staff_desc')}</p>
            </div>
        )}
        {isEmbedded && (
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900 hidden md:block">{t('settings.tab_staff')}</h3>
                <Badge variant="secondary" className="text-zinc-500 font-normal">
                    Total {staffList.length}
                </Badge>
            </div>
        )}
        
        <div className="flex items-center gap-3 ml-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <Input 
              placeholder="Search..." 
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={openAddSheet}
            className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200 active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            {t('staff.add')}
          </button>
        </div>
      </div>

      {isLoadingList ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-400">직원 목록을 불러오는 중...</div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-white border p-1 mb-6">
              <TabsTrigger value="active" className="gap-2">
                  {t('staff.tab_active')}
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2 relative">
                  {t('staff.tab_pending')}
                  {pendingStaff.length > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {pendingStaff.length}
                      </span>
                  )}
              </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFilteredList(activeStaff).map((staff) => (
                      <StaffCard key={staff.id} staff={staff} />
                  ))}
                  {activeStaff.length === 0 && !isLoadingList && (
                      <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                          No active staff members found.
                      </div>
                  )}
              </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFilteredList(pendingStaff).map((staff) => (
                      <StaffCard key={staff.id} staff={staff} isPending={true} />
                  ))}
                  {pendingStaff.length === 0 && !isLoadingList && (
                      <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                          No pending requests.
                      </div>
                  )}
              </div>
          </TabsContent>
        </Tabs>
      )}

      {isDesktop ? (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent 
                side="right"
                className="w-[400px] h-full rounded-l-[32px] sm:max-w-[400px] p-0 bg-white flex flex-col"
            >
            <SheetHeader className="px-6 py-5 border-b border-zinc-100 mb-0 shrink-0">
                <SheetTitle>{editingStaff ? 'Edit Staff' : t('staff.add')}</SheetTitle>
                <SheetDescription>{t('settings.staff_desc')}</SheetDescription>
            </SheetHeader>
            <StaffFormContent 
                editingStaff={editingStaff}
                formData={formData}
                setFormData={setFormData}
                handleSave={handleSave}
                handleImageUpload={handleImageUpload}
                isLoading={isLoading}
                t={t}
                onCancel={() => setIsSheetOpen(false)}
            />
            </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <DrawerContent className="h-[85vh] rounded-t-[32px] p-0 bg-white">
                <DrawerHeader className="px-6 py-5 border-b border-zinc-100 mb-0 text-left">
                    <DrawerTitle>{editingStaff ? 'Edit Staff' : t('staff.add')}</DrawerTitle>
                    <DrawerDescription>{t('settings.staff_desc')}</DrawerDescription>
                </DrawerHeader>
                <StaffFormContent 
                    editingStaff={editingStaff}
                    formData={formData}
                    setFormData={setFormData}
                    handleSave={handleSave}
                    handleImageUpload={handleImageUpload}
                    isLoading={isLoading}
                    t={t}
                    onCancel={() => setIsSheetOpen(false)}
                />
            </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function StaffFormContent({ editingStaff, formData, setFormData, handleSave, handleImageUpload, isLoading, t, onCancel }: any) {
    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-zinc-900">Profile Image</label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-zinc-200 flex-shrink-0">
                                {formData.avatarUrl ? (
                                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-zinc-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <Button type="button" variant="outline" size="sm" className="w-full cursor-pointer" asChild>
                                        <span className="flex items-center gap-2">
                                            <Upload size={16} />
                                            Upload Image
                                        </span>
                                    </Button>
                                </label>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-400">JPEG, PNG, WebP (max 5MB)</p>
                    </div>

                    <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900">{t('staff.name')}</label>
                    <Input
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Full Name"
                    />
                    </div>

                    <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900">Email (Google Login) <span className="text-xs text-zinc-400 font-normal">(Optional)</span></label>
                    <Input
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="이메일 주소를 입력하세요"
                        type="email"
                        disabled={!!editingStaff}
                    />
                    </div>
                    
                    <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900">{t('staff.role')}</label>
                    <Select 
                        value={formData.role} 
                        onValueChange={(val: UserRole) => setFormData({...formData, role: val})}
                    >
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="manager">{t('role.manager')}</SelectItem>
                        <SelectItem value="kitchen">{t('role.kitchen')}</SelectItem>
                        <SelectItem value="hall">{t('role.hall')}</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>

                    <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                        {t('staff.pin')} <span className="text-xs text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <Input 
                        type="password"
                        value={formData.pinCode || ''}
                        onChange={(e) => setFormData({...formData, pinCode: e.target.value.replace(/\D/g, '')})}
                        placeholder={editingStaff && editingStaff.pinCode === '••••' ? "PIN이 설정되어 있습니다. 변경하려면 새로 입력하세요" : "PIN 번호를 입력하세요"}
                        maxLength={10}
                        className="font-mono tracking-widest"
                    />
                    <p className="text-xs text-zinc-400">
                      {editingStaff && editingStaff.pinCode === '••••' 
                        ? "PIN이 설정되어 있습니다. 변경하려면 새 PIN을 입력하세요." 
                        : "4자리 이상의 숫자로 입력하세요"}
                    </p>
                    </div>

                    <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900">Phone (Optional)</label>
                    <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="전화번호를 입력하세요"
                    />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-zinc-100 grid grid-cols-2 gap-3 shrink-0 pb-4">
                <button 
                onClick={onCancel}
                disabled={isLoading}
                className="h-12 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                Cancel
                </button>
                <button 
                onClick={handleSave}
                disabled={isLoading || !formData.name}
                className="h-12 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200 disabled:opacity-50"
                >
                {isLoading ? 'Saving...' : (editingStaff ? 'Save Changes' : 'Create Account')}
                </button>
            </div>
        </div>
    );
}