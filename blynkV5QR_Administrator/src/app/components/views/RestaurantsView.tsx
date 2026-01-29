import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '../ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { Badge } from '../ui/badge';
import { Search, Plus, MoreHorizontal, QrCode, CheckCircle, XCircle, Pencil, Trash2, Ban, Download, List, Save, MapPin, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Copy, ExternalLink, Link } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { ScrollArea } from '../ui/scroll-area';
import { apiClient, API_URL } from '../../../lib/api';

// Define types
type RestaurantStatus = 'active' | 'pending' | 'inactive';

interface Restaurant {
  id: string;
  name: string;
  category: string;
  owner: string;
  contact: string;
  email: string; // Google Email
  address: string;
  region: string; // New Region field
  status: RestaurantStatus;
  tables: number;
  revenue: string;
  date: string;
  shopManagerUrl?: string; // Shop manager URL from backend
  subdomain?: string | null; // 서브도메인
  notificationSoundUrl?: string | null; // 알림음 URL
}

// API Response type
interface ApiRestaurant {
  id: string;
  nameKo: string;
  nameVn: string;
  nameEn?: string;
  owner: {
    id: string;
    email: string;
  };
  status: string;
  qrCode: string;
  subdomain?: string | null; // 서브도메인
  createdAt: string;
  updatedAt: string;
  settings?: any;
  shopManagerUrl?: string; // Shop manager URL from backend
  _count?: {
    tables: number;
    staff: number;
  };
}

// Backend Table type
interface BackendTable {
  id: string;
  tableNumber: number;
  floor: number;
  capacity: number;
  qrCode: string;
  qrCodeUrl?: string; // 서브도메인 기반 QR 코드 URL
  status: string;
  currentSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

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

// Helper function to generate subdomain-based URL
// 환경에 따라 동적으로 URL 생성 (로컬: localhost:3000, 프로덕션: qoodle.top)
const generateSubdomainUrl = (subdomain: string | null | undefined, path: string = ''): string => {
  if (!subdomain) return '';
  
  // Frontend base URL에서 환경 감지
  const envBaseUrl = import.meta.env.VITE_FRONTEND_BASE_URL;
  const hostWithoutPort = window.location.host.split(':')[0];
  const isLocalhostHost =
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort.endsWith('.localhost');
  const isQoodleHost =
    hostWithoutPort === 'qoodle.top' ||
    hostWithoutPort.endsWith('.qoodle.top');

  // 프로덕션 도메인에서는 항상 qoodle.top 사용
  if (isQoodleHost) {
    return `https://${subdomain}.qoodle.top${path}`;
  }

  const isEnvLocalhost =
    !!envBaseUrl &&
    (envBaseUrl.includes('localhost') || envBaseUrl.includes('127.0.0.1'));
  const frontendBaseUrl =
    isEnvLocalhost && !isLocalhostHost
      ? window.location.origin
      : envBaseUrl || window.location.origin;
  
  // localhost 또는 127.0.0.1인 경우 로컬 환경
  if (frontendBaseUrl.includes('localhost') || frontendBaseUrl.includes('127.0.0.1')) {
    const protocol = frontendBaseUrl.startsWith('https://') ? 'https' : 'http';
    const port = window.location.port || (frontendBaseUrl.match(/:(\d+)/)?.[1] || '');
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}://${subdomain}.localhost${portSuffix}${path}`;
  }
  
  // 프로덕션 환경
  return `https://${subdomain}.qoodle.top${path}`;
};

// Normalize localhost subdomain URLs on production host
const normalizeShopUrl = (url: string): string => {
  if (!url) return url;
  const hostWithoutPort = window.location.host.split(':')[0];
  const isQoodleHost =
    hostWithoutPort === 'qoodle.top' || hostWithoutPort.endsWith('.qoodle.top');
  if (!isQoodleHost) return url;
  return url.replace(
    /^http:\/\/([^./]+)\.localhost(?::\d+)?\//,
    'https://$1.qoodle.top/',
  );
};

const resolveNotificationSoundUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const host = typeof window !== 'undefined' ? window.location.host.split(':')[0] : '';
  const derivedApiBase = host.endsWith('.qoodle.top')
    ? 'https://api.qoodle.top'
    : host.endsWith('.localhost')
      ? 'https://api.localhost'
      : host === 'localhost' || host === '127.0.0.1'
        ? 'http://localhost:3000'
        : '';
  const base = API_URL || derivedApiBase;
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};


// Helper function to transform API data to component format
const transformRestaurant = (apiRestaurant: ApiRestaurant): Restaurant => {
  const settings = apiRestaurant.settings || {};
  return {
    id: apiRestaurant.id,
    name: apiRestaurant.nameKo,
    category: settings.category || '기타',
    owner: settings.ownerName || apiRestaurant.owner.email.split('@')[0],
    contact: settings.contact || '',
    email: apiRestaurant.owner.email,
    address: settings.address || '',
    region: settings.region || '',
    status: apiRestaurant.status as RestaurantStatus,
    tables: apiRestaurant._count?.tables || 0,
    revenue: settings.revenue || '0 VND',
    date: new Date(apiRestaurant.createdAt).toISOString().split('T')[0],
    shopManagerUrl: apiRestaurant.shopManagerUrl, // Include shop manager URL from backend
    subdomain: apiRestaurant.subdomain || null, // 서브도메인
    notificationSoundUrl: settings.notificationSoundUrl || null,
  };
};

// Categories and Regions will be loaded from API

export function RestaurantsView() {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Frontend base URL from environment variable or fallback to current origin
  const envBaseUrl = import.meta.env.VITE_FRONTEND_BASE_URL;
  const hostWithoutPort = window.location.host.split(':')[0];
  const isLocalhostHost =
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort.endsWith('.localhost');
  const isEnvLocalhost =
    !!envBaseUrl &&
    (envBaseUrl.includes('localhost') || envBaseUrl.includes('127.0.0.1'));
  const frontendBaseUrl =
    isEnvLocalhost && !isLocalhostHost
      ? window.location.origin
      : envBaseUrl || window.location.origin;
  
  // Data state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; nameKo: string; nameVn: string; nameEn?: string }>>([]);
  const [regions, setRegions] = useState<Array<{ id: string; nameKo: string; nameVn: string; nameEn?: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: keyof Restaurant; direction: 'asc' | 'desc' } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isRegionDialogOpen, setIsRegionDialogOpen] = useState(false);
  const [subdomainWarning, setSubdomainWarning] = useState('');
  
  // Restaurant Form state
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    owner: '',
    contact: '',
    email: '',
    address: '',
    region: '',
    tables: 0,
    subdomain: '', // 서브도메인
    notificationSoundUrl: '' // 알림음 URL
  });
  const resolvedNotificationSoundUrl = resolveNotificationSoundUrl(formData.notificationSoundUrl);
  const [notificationSoundFile, setNotificationSoundFile] = useState<File | null>(null);
  const [isUploadingSound, setIsUploadingSound] = useState(false);

  // Category Management state
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{id: string, nameKo: string} | null>(null);

  // Region Management state
  const [newRegion, setNewRegion] = useState('');
  const [editingRegion, setEditingRegion] = useState<{id: string, nameKo: string} | null>(null);

  // QR Code Dialog state
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [selectedRestaurantForQr, setSelectedRestaurantForQr] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<BackendTable[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Load tables when QR dialog opens
  useEffect(() => {
    const loadTables = async (restaurantId: string) => {
      setIsLoadingTables(true);
      try {
        const result = await apiClient.getTablesByRestaurant(restaurantId);
        if (result.success && result.data) {
          setTables(result.data);
        } else {
          toast.error('테이블 정보를 불러오는데 실패했습니다.');
          setTables([]);
        }
      } catch (error) {
        console.error('Failed to load tables:', error);
        toast.error('테이블 정보를 불러오는데 실패했습니다.');
        setTables([]);
      } finally {
        setIsLoadingTables(false);
      }
    };

    if (isQrDialogOpen && selectedRestaurantForQr) {
      loadTables(selectedRestaurantForQr.id);
    } else {
      setTables([]);
    }
  }, [isQrDialogOpen, selectedRestaurantForQr]);

  // Load restaurants, categories, and regions from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [restaurantsResult, categoriesResult, regionsResult] = await Promise.all([
          apiClient.getRestaurants(),
          apiClient.getCategories(),
          apiClient.getRegions(),
        ]);

        if (restaurantsResult.success && restaurantsResult.data) {
          const transformedRestaurants = restaurantsResult.data.map(transformRestaurant);
          setRestaurants(transformedRestaurants);
        } else {
          setError(restaurantsResult.error?.message || '식당 목록을 불러오는데 실패했습니다.');
        }

        if (categoriesResult.success && categoriesResult.data) {
          setCategories(categoriesResult.data);
        }

        if (regionsResult.success && regionsResult.data) {
          setRegions(regionsResult.data);
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // --- Data Processing ---

  // 1. Filter
  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Sort
  const sortedRestaurants = React.useMemo(() => {
    let sortableItems = [...filteredRestaurants];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle numeric values
        if (sortConfig.key === 'tables') {
            // Already numbers
        } else if (sortConfig.key === 'id') {
            // String IDs - compare as strings
        } else if (sortConfig.key === 'revenue') {
            // Parse revenue string (e.g. "42,000,000 VND")
            const aNum = parseInt(String(aValue).replace(/[^0-9]/g, '')) || 0;
            const bNum = parseInt(String(bValue).replace(/[^0-9]/g, '')) || 0;
            aValue = aNum;
            bValue = bNum;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRestaurants, sortConfig]);

  // 3. Paginate
  const totalPages = Math.ceil(sortedRestaurants.length / itemsPerPage);
  const paginatedRestaurants = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRestaurants.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRestaurants, currentPage]);

  const requestSort = (key: keyof Restaurant) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // --- Restaurant Actions ---

  const handleOpenAddDialog = () => {
    setEditingRestaurant(null);
    setFormData({ 
      name: '', 
      category: '', 
      owner: '', 
      contact: '', 
      email: '', 
      address: '', 
      region: '',
      tables: 0,
      subdomain: '', // 서브도메인
      notificationSoundUrl: ''
    });
    setNotificationSoundFile(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      category: restaurant.category,
      owner: restaurant.owner,
      contact: restaurant.contact,
      email: restaurant.email,
      address: restaurant.address,
      region: restaurant.region,
      tables: restaurant.tables,
      subdomain: restaurant.subdomain || '', // 서브도메인
      notificationSoundUrl: restaurant.notificationSoundUrl || ''
    });
    setNotificationSoundFile(null);
    setIsDialogOpen(true);
  };

  const handleSaveRestaurant = async () => {
    if (!formData.name || !formData.owner || !formData.email || !formData.category || !formData.region) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    try {
    if (editingRestaurant) {
        // Update existing restaurant
        const subdomainValue = formData.subdomain?.trim() || null;
        const updateData = {
          nameKo: formData.name,
          nameVn: formData.name,
          nameEn: formData.name,
          status: editingRestaurant.status,
          ownerEmail: formData.email, // Include email to update owner
          subdomain: subdomainValue, // 서브도메인 (빈 문자열이면 null)
          settings: {
            category: formData.category,
            ownerName: formData.owner,
            contact: formData.contact,
            address: formData.address,
            region: formData.region,
            tables: formData.tables,
            notificationSoundUrl: formData.notificationSoundUrl || null,
          },
        };
        const result = await apiClient.updateRestaurant(editingRestaurant.id, updateData);
        if (result.success && result.data) {
          // Update the restaurant in the list with the new data (including shopManagerUrl)
          const updatedRestaurant = transformRestaurant(result.data);
          setRestaurants(prev => prev.map(r => r.id === editingRestaurant.id ? updatedRestaurant : r));
          // Also update editingRestaurant to show the updated URL
          setEditingRestaurant(updatedRestaurant);
      toast.success('식당 정보가 수정되었습니다.');
    } else {
          console.error('❌ [handleSaveRestaurant] API 응답 실패:', result.error);
          throw new Error(result.error?.message || '식당 정보 수정에 실패했습니다.');
        }
      } else {
        // Create new restaurant
        const subdomainValue = formData.subdomain?.trim() || undefined;
        const createData = {
          nameKo: formData.name,
          nameVn: formData.name,
          nameEn: formData.name,
          ownerEmail: formData.email,
          status: 'pending',
          subdomain: subdomainValue, // 서브도메인 (빈 문자열이면 undefined로 보내서 백엔드에서 자동 생성)
          settings: {
            category: formData.category,
            ownerName: formData.owner,
            contact: formData.contact,
            address: formData.address,
            region: formData.region,
            tables: formData.tables,
            notificationSoundUrl: formData.notificationSoundUrl || null,
          },
        };
        const result = await apiClient.createRestaurant(createData);
        if (result.success && result.data) {
          // Add the new restaurant to the list
          const newRestaurant = transformRestaurant(result.data);
          setRestaurants(prev => [newRestaurant, ...prev]);
          toast.success('식당이 등록되었습니다.');
        } else {
          console.error('❌ [handleSaveRestaurant] API 응답 실패:', result.error);
          throw new Error(result.error?.message || '식당 등록에 실패했습니다.');
        }
    }
    setIsDialogOpen(false);
    } catch (err: any) {
      console.error('❌ [handleSaveRestaurant] 식당 저장 실패:', err);
      toast.error(err.message || '식당 정보 저장에 실패했습니다.');
    }
  };

  const handleUploadNotificationSound = async () => {
    if (!editingRestaurant) {
      toast.error('식당을 먼저 선택해주세요.');
      return;
    }
    if (!notificationSoundFile) {
      toast.error('업로드할 알림음 파일을 선택해주세요.');
      return;
    }
    setIsUploadingSound(true);
    try {
      const result = await apiClient.uploadNotificationSound(
        editingRestaurant.id,
        notificationSoundFile
      );
      if (result.success && result.data?.notificationSoundUrl) {
        const nextUrl = result.data.notificationSoundUrl;
        setFormData((prev) => ({
          ...prev,
          notificationSoundUrl: nextUrl,
        }));
        setEditingRestaurant((prev) =>
          prev ? { ...prev, notificationSoundUrl: nextUrl } : prev
        );
        // Ensure list reflects persisted settings
        const restaurantsResult = await apiClient.getRestaurants();
        if (restaurantsResult.success && restaurantsResult.data) {
          const transformed = restaurantsResult.data.map(transformRestaurant);
          setRestaurants(transformed);
          const updated = transformed.find((r) => r.id === editingRestaurant.id);
          if (updated) {
            setEditingRestaurant(updated);
            setFormData((prev) => ({
              ...prev,
              notificationSoundUrl: updated.notificationSoundUrl || nextUrl,
            }));
          }
        } else {
          setRestaurants((prev) =>
            prev.map((r) =>
              r.id === editingRestaurant.id ? { ...r, notificationSoundUrl: nextUrl } : r
            )
          );
        }
        toast.success('알림음이 업로드되었습니다.');
      } else {
        throw new Error(result.error?.message || '알림음 업로드에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('알림음 업로드 실패:', error);
      toast.error(error.message || '알림음 업로드에 실패했습니다.');
    } finally {
      setIsUploadingSound(false);
      setNotificationSoundFile(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: RestaurantStatus) => {
    try {
      const result = await apiClient.updateRestaurant(id, { status: newStatus });
      if (result.success) {
        // Reload restaurants
        const restaurantsResult = await apiClient.getRestaurants();
        if (restaurantsResult.success && restaurantsResult.data) {
          const transformedRestaurants = restaurantsResult.data.map(transformRestaurant);
          setRestaurants(transformedRestaurants);
        }
    if (newStatus === 'active') toast.success('식당이 승인되었습니다.');
    else if (newStatus === 'inactive') toast.info('식당 계정이 정지되었습니다.');
      } else {
        throw new Error(result.error?.message || '상태 변경에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to change status:', err);
      toast.error(err.message || '상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm('정말로 이 식당을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const result = await apiClient.deleteRestaurant(id);
      if (result.success) {
        // Reload restaurants
        const restaurantsResult = await apiClient.getRestaurants();
        if (restaurantsResult.success && restaurantsResult.data) {
          const transformedRestaurants = restaurantsResult.data.map(transformRestaurant);
          setRestaurants(transformedRestaurants);
        }
      toast.success('식당이 삭제되었습니다.');
      } else {
        throw new Error(result.error?.message || '식당 삭제에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to delete restaurant:', err);
      toast.error(err.message || '식당 삭제에 실패했습니다.');
    }
  };

  // --- Category Actions ---

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    if (categories.some(c => c.nameKo === newCategory.trim())) {
      toast.error('이미 존재하는 카테고리입니다.');
      return;
    }

    try {
      const result = await apiClient.createCategory({
        nameKo: newCategory.trim(),
        nameVn: newCategory.trim(),
        nameEn: newCategory.trim(),
      });
      if (result.success && result.data) {
        setCategories([...categories, result.data]);
    setNewCategory('');
    toast.success('카테고리가 추가되었습니다.');
      } else {
        throw new Error(result.error?.message || '카테고리 추가에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to add category:', err);
      toast.error(err.message || '카테고리 추가에 실패했습니다.');
    }
  };

  const handleStartEditCategory = (category: { id: string; nameKo: string }) => {
    setEditingCategory({ id: category.id, nameKo: category.nameKo });
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategory || !editingCategory.nameKo.trim()) return;

    try {
      const result = await apiClient.updateCategory(editingCategory.id, {
        nameKo: editingCategory.nameKo.trim(),
        nameVn: editingCategory.nameKo.trim(),
        nameEn: editingCategory.nameKo.trim(),
      });
      if (result.success && result.data) {
        setCategories(categories.map(c => 
          c.id === editingCategory.id ? result.data : c
        ));
    setEditingCategory(null);
    toast.success('카테고리가 수정되었습니다.');
      } else {
        throw new Error(result.error?.message || '카테고리 수정에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to update category:', err);
      toast.error(err.message || '카테고리 수정에 실패했습니다.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const categoryToDelete = categories.find(c => c.id === id);
    if (!categoryToDelete) return;

    if (!confirm(`'${categoryToDelete.nameKo}' 카테고리를 삭제하시겠습니까?`)) {
            return;
    }

    try {
      const result = await apiClient.deleteCategory(id);
      if (result.success) {
        setCategories(categories.filter(c => c.id !== id));
    toast.success('카테고리가 삭제되었습니다.');
      } else {
        throw new Error(result.error?.message || '카테고리 삭제에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      toast.error(err.message || '카테고리 삭제에 실패했습니다.');
    }
  };

  // --- Region Actions ---

  const handleAddRegion = async () => {
    if (!newRegion.trim()) return;
    if (regions.some(r => r.nameKo === newRegion.trim())) {
      toast.error('이미 존재하는 지역입니다.');
      return;
    }

    try {
      const result = await apiClient.createRegion({
        nameKo: newRegion.trim(),
        nameVn: newRegion.trim(),
        nameEn: newRegion.trim(),
      });
      if (result.success && result.data) {
        setRegions([...regions, result.data]);
    setNewRegion('');
    toast.success('지역이 추가되었습니다.');
      } else {
        throw new Error(result.error?.message || '지역 추가에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to add region:', err);
      toast.error(err.message || '지역 추가에 실패했습니다.');
    }
  };

  const handleStartEditRegion = (region: { id: string; nameKo: string }) => {
    setEditingRegion({ id: region.id, nameKo: region.nameKo });
  };

  const handleSaveRegionEdit = async () => {
    if (!editingRegion || !editingRegion.nameKo.trim()) return;

    try {
      const result = await apiClient.updateRegion(editingRegion.id, {
        nameKo: editingRegion.nameKo.trim(),
        nameVn: editingRegion.nameKo.trim(),
        nameEn: editingRegion.nameKo.trim(),
      });
      if (result.success && result.data) {
        setRegions(regions.map(r => 
          r.id === editingRegion.id ? result.data : r
        ));
    setEditingRegion(null);
    toast.success('지역이 수정되었습니다.');
      } else {
        throw new Error(result.error?.message || '지역 수정에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to update region:', err);
      toast.error(err.message || '지역 수정에 실패했습니다.');
    }
  };

  const handleDeleteRegion = async (id: string) => {
    const regionToDelete = regions.find(r => r.id === id);
    if (!regionToDelete) return;

    if (!confirm(`'${regionToDelete.nameKo}' 지역을 삭제하시겠습니까?`)) {
            return;
    }

    try {
      const result = await apiClient.deleteRegion(id);
      if (result.success) {
        setRegions(regions.filter(r => r.id !== id));
    toast.success('지역이 삭제되었습니다.');
      } else {
        throw new Error(result.error?.message || '지역 삭제에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to delete region:', err);
      toast.error(err.message || '지역 삭제에 실패했습니다.');
    }
  };

  // --- QR Code Actions ---

  const handleOpenQrDialog = (restaurant: Restaurant) => {
    setSelectedRestaurantForQr(restaurant);
    setIsQrDialogOpen(true);
  };

  const handleDownloadQrCode = (tableId: string, tableNumber: number) => {
    const svgId = `restaurant-qr-code-${tableId}`;
    const svgMobileId = `restaurant-qr-code-mobile-${tableId}`;
    const svg = document.getElementById(svgId) || document.getElementById(svgMobileId);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `${selectedRestaurantForQr?.name}-table-${tableNumber}-qrcode.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success(`${tableNumber}번 테이블 QR 코드가 다운로드되었습니다.`);
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const renderSortIcon = (key: keyof Restaurant) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground opacity-50" />;
    }
    return <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? 'text-primary' : 'text-primary'}`} />;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">식당 목록을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center justify-center py-12 bg-destructive/10 rounded-lg border border-destructive/20">
          <XCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-destructive font-medium">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t('restaurants.search_placeholder')} 
            className="pl-9 bg-white border-zinc-100 focus-visible:ring-zinc-400/40" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none bg-white border-zinc-100 shadow-sm" onClick={() => setIsRegionDialogOpen(true)}>
                <MapPin className="w-4 h-4 mr-2" />
                지역 관리
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none bg-white border-zinc-100 shadow-sm" onClick={() => setIsCategoryDialogOpen(true)}>
                <List className="w-4 h-4 mr-2" />
                카테고리 관리
            </Button>
            <Button className="flex-1 sm:flex-none w-full sm:w-auto shadow-sm" onClick={handleOpenAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                {t('restaurants.add')}
            </Button>
        </div>
      </div>

      {/* Category Management Sheet/Drawer */}
      {isDesktop ? (
        <Sheet open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[425px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>카테고리 관리</SheetTitle>
              <SheetDescription>
                식당 카테고리를 관리합니다.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <div className="flex gap-2 my-2">
                <Input 
                  placeholder="새 카테고리" 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button onClick={handleAddCategory} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[300px] w-full rounded-xl border border-slate-200/70 bg-white/80 p-4">
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-2 border-b border-border/60 last:border-b-0 rounded-lg hover:bg-muted/50 group">
                    {editingCategory?.id === category.id ? (
                      <div className="flex flex-1 gap-2 items-center">
                        <Input 
                          value={editingCategory.nameKo} 
                          onChange={(e) => setEditingCategory({...editingCategory, nameKo: e.target.value})}
                          className="h-8"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveCategoryEdit}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingCategory(null)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium">{category.nameKo}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEditCategory(category)}>
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>카테고리 관리</DrawerTitle>
              <DrawerDescription>
                식당 카테고리를 관리합니다.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <div className="flex gap-2 my-2">
                <Input 
                  placeholder="새 카테고리" 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button onClick={handleAddCategory} size="icon" className="shadow-sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[300px] w-full rounded-xl border border-slate-200/70 bg-white/80 p-4">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-2 border-b border-border/60 last:border-b-0 rounded-lg hover:bg-muted/50 group">
                      {editingCategory?.id === category.id ? (
                        <div className="flex flex-1 gap-2 items-center">
                          <Input 
                            value={editingCategory.nameKo} 
                            onChange={(e) => setEditingCategory({...editingCategory, nameKo: e.target.value})}
                            className="h-8"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveCategoryEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingCategory(null)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{category.nameKo}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEditCategory(category)}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteCategory(category.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Region Management Sheet/Drawer */}
      {isDesktop ? (
        <Sheet open={isRegionDialogOpen} onOpenChange={setIsRegionDialogOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[425px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>지역 관리</SheetTitle>
              <SheetDescription>
                서비스 지역을 관리합니다.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <div className="flex gap-2 my-2">
                <Input 
                  placeholder="새 지역 이름" 
                  value={newRegion} 
                  onChange={(e) => setNewRegion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRegion()}
                />
                <Button onClick={handleAddRegion} size="icon" className="shadow-sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[300px] w-full rounded-xl border border-slate-200/70 bg-white/80 p-4">
                <div className="space-y-2">
                  {regions.map((region) => (
                    <div key={region.id} className="flex items-center justify-between p-2 border-b border-border/60 last:border-b-0 rounded-lg hover:bg-muted/50 group">
                      {editingRegion?.id === region.id ? (
                        <div className="flex flex-1 gap-2 items-center">
                          <Input 
                            value={editingRegion.nameKo} 
                            onChange={(e) => setEditingRegion({...editingRegion, nameKo: e.target.value})}
                            className="h-8"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveRegionEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingRegion(null)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{region.nameKo}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEditRegion(region)}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteRegion(region.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isRegionDialogOpen} onOpenChange={setIsRegionDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>지역 관리</DrawerTitle>
              <DrawerDescription>
                서비스 지역을 관리합니다.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <div className="flex gap-2 my-2">
                <Input 
                  placeholder="새 지역 이름" 
                  value={newRegion} 
                  onChange={(e) => setNewRegion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRegion()}
                />
                <Button onClick={handleAddRegion} size="icon" className="shadow-sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[300px] w-full rounded-xl border border-slate-200/70 bg-white/80 p-4">
                <div className="space-y-2">
                  {regions.map((region) => (
                    <div key={region.id} className="flex items-center justify-between p-2 border-b border-border/60 last:border-b-0 rounded-lg hover:bg-muted/50 group">
                      {editingRegion?.id === region.id ? (
                        <div className="flex flex-1 gap-2 items-center">
                          <Input 
                            value={editingRegion.nameKo} 
                            onChange={(e) => setEditingRegion({...editingRegion, nameKo: e.target.value})}
                            className="h-8"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveRegionEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingRegion(null)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{region.nameKo}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEditRegion(region)}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteRegion(region.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Restaurant Add/Edit Sheet/Drawer */}
      {isDesktop ? (
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {editingRestaurant ? t('restaurants.action.details') : t('restaurants.dialog.title')}
              </SheetTitle>
              <SheetDescription>
                {editingRestaurant ? '식당 정보를 수정합니다.' : t('restaurants.dialog.desc')}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4 px-4 text-foreground [&_label]:text-muted-foreground">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">식당 이름</Label>
                <Input 
                  id="name" 
                  placeholder="식당 이름" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">카테고리</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.nameKo}>{cat.nameKo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="owner">대표자 이름</Label>
                <Input 
                  id="owner" 
                  placeholder="홍길동" 
                  value={formData.owner}
                  onChange={(e) => setFormData({...formData, owner: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">대표자 연락처</Label>
                <Input 
                  id="contact" 
                  placeholder="090-0000-0000" 
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">대표자 구글 이메일</Label>
              <Input 
                id="email" 
                placeholder="example@gmail.com" 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="region">지역</Label>
                    <Select 
                        value={formData.region} 
                        onValueChange={(value) => setFormData({...formData, region: value})}
                    >
                        <SelectTrigger id="region">
                            <SelectValue placeholder="지역 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {regions.map((reg) => (
                                <SelectItem key={reg.id} value={reg.nameKo}>{reg.nameKo}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="tables">테이블 수</Label>
                    <Input 
                        id="tables" 
                        type="number"
                        placeholder="0" 
                        value={formData.tables}
                        onChange={(e) => setFormData({...formData, tables: parseInt(e.target.value) || 0})}
                    />
                </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">상세 주소</Label>
              <Input 
                id="address" 
                placeholder="상세 주소를 입력하세요" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            {/* Subdomain Setting - Only show when editing existing restaurant */}
            {editingRestaurant && (
              <div className="grid gap-2 pt-4 border-t border-slate-200/70">
                <Label htmlFor="subdomain" className="flex items-center gap-2">
                  <span>서브도메인</span>
                  <span className="text-xs text-muted-foreground font-normal">(예: shop_1)</span>
                </Label>
                <Input 
                  id="subdomain" 
                  placeholder="shop_1" 
                  value={formData.subdomain}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                    setFormData({...formData, subdomain: value});
                    setSubdomainWarning('');
                  }}
                  onBeforeInput={(e) => {
                    const inputEvent = e.nativeEvent as InputEvent;
                    const data = inputEvent.data || '';
                    if (data && /[^a-zA-Z0-9_-]/.test(data)) {
                      e.preventDefault();
                      setSubdomainWarning('영문 소문자/숫자만 입력 가능합니다. 한글 입력은 전환해 주세요.');
                    }
                  }}
                  inputMode="text"
                />
                <p className="text-xs text-muted-foreground">
                  영문 소문자, 숫자, 하이픈(-), 언더스코어(_)만 입력 가능합니다.
                  서브도메인을 설정하면 <code className="px-1 py-0.5 bg-muted rounded">{normalizeShopUrl(generateSubdomainUrl(formData.subdomain || 'shop_1', '/shop')).replace(/^https?:\/\//, '') || 'shop_1.qoodle.top/shop'}</code> 형식으로 접근할 수 있습니다.
                  {formData.subdomain && (
                    <span className="block mt-1 text-green-600">
                      현재 URL: <code className="px-1 py-0.5 bg-green-50 rounded">{normalizeShopUrl(generateSubdomainUrl(formData.subdomain, '/shop')).replace(/^https?:\/\//, '')}</code>
                    </span>
                  )}
                </p>
                {subdomainWarning && (
                  <p className="text-xs text-amber-600">{subdomainWarning}</p>
                )}
              </div>
            )}

            {/* Notification Sound - Only show when editing existing restaurant */}
            {editingRestaurant && (
              <div className="grid gap-2 pt-4 border-t border-slate-200/70">
                <Label className="flex items-center gap-2">
                  알림음
                  <span className="text-xs text-muted-foreground font-normal">(요청/채팅/주문)</span>
                </Label>
                <div className="flex flex-col gap-2">
                  {resolvedNotificationSoundUrl && (
                    <audio controls src={resolvedNotificationSoundUrl} className="w-full" />
                  )}
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setNotificationSoundFile(file);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleUploadNotificationSound}
                      disabled={isUploadingSound || !notificationSoundFile}
                    >
                      {isUploadingSound ? '업로드 중...' : '업로드'}
                    </Button>
                    {resolvedNotificationSoundUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(resolvedNotificationSoundUrl);
                          toast.success('알림음 URL이 복사되었습니다.');
                        }}
                      >
                        URL 복사
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    iOS 백그라운드 푸시에서는 시스템 기본 알림음이 사용됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* Shop Manager Endpoint - Only show when editing existing restaurant */}
            {editingRestaurant && (
              <div className="grid gap-2 pt-4 border-t border-slate-200/70">
                <Label className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  상점 관리자 사이트
                </Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                      {normalizeShopUrl(
                        editingRestaurant.subdomain 
                          ? generateSubdomainUrl(editingRestaurant.subdomain, '/shop')
                          : `${frontendBaseUrl}/shop/restaurant/${editingRestaurant.id}/login`,
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = normalizeShopUrl(
                          editingRestaurant.subdomain 
                            ? generateSubdomainUrl(editingRestaurant.subdomain, '/shop')
                            : `${frontendBaseUrl}/shop/restaurant/${editingRestaurant.id}/login`,
                        );
                        navigator.clipboard.writeText(url);
                        toast.success('URL이 클립보드에 복사되었습니다.');
                      }}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      복사
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = normalizeShopUrl(
                          editingRestaurant.subdomain 
                            ? generateSubdomainUrl(editingRestaurant.subdomain, '/shop')
                            : `${frontendBaseUrl}/shop/restaurant/${editingRestaurant.id}/login`,
                        );
                        window.open(url, '_blank');
                      }}
                      className="shrink-0"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      열기
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {editingRestaurant.subdomain ? (
                      <>서브도메인 기반 URL: <code className="px-1 py-0.5 bg-muted rounded">{normalizeShopUrl(generateSubdomainUrl(editingRestaurant.subdomain, '/shop')).replace(/^https?:\/\//, '')}</code></>
                    ) : (
                      <>레거시 경로: <code className="px-1 py-0.5 bg-muted rounded">/shop/restaurant/{editingRestaurant.id}/login</code> (서브도메인 설정 권장)</>
                    )}
                  </div>
                </div>
              </div>
            )}

            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
              <Button type="submit" onClick={handleSaveRestaurant}>
                {editingRestaurant ? '수정 저장' : t('restaurants.add')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>
                {editingRestaurant ? t('restaurants.action.details') : t('restaurants.dialog.title')}
              </DrawerTitle>
              <DrawerDescription>
                {editingRestaurant ? '식당 정보를 수정합니다.' : t('restaurants.dialog.desc')}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 overflow-y-auto">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name-mobile">식당 이름</Label>
                    <Input 
                      id="name-mobile" 
                      placeholder="식당 이름" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category-mobile">카테고리</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger id="category-mobile">
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.nameKo}>{cat.nameKo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="owner-mobile">대표자 이름</Label>
                    <Input 
                      id="owner-mobile" 
                      placeholder="홍길동" 
                      value={formData.owner}
                      onChange={(e) => setFormData({...formData, owner: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact-mobile">대표자 연락처</Label>
                    <Input 
                      id="contact-mobile" 
                      placeholder="090-0000-0000" 
                      value={formData.contact}
                      onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email-mobile">대표자 구글 이메일</Label>
                  <Input 
                    id="email-mobile" 
                    placeholder="example@gmail.com" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="region-mobile">지역</Label>
                    <Select 
                      value={formData.region} 
                      onValueChange={(value) => setFormData({...formData, region: value})}
                    >
                      <SelectTrigger id="region-mobile">
                        <SelectValue placeholder="지역 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((reg) => (
                          <SelectItem key={reg.id} value={reg.nameKo}>{reg.nameKo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tables-mobile">테이블 수</Label>
                    <Input 
                      id="tables-mobile" 
                      type="number"
                      placeholder="0" 
                      value={formData.tables}
                      onChange={(e) => setFormData({...formData, tables: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address-mobile">상세 주소</Label>
                  <Input 
                    id="address-mobile" 
                    placeholder="상세 주소를 입력하세요" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                {/* Subdomain Setting - Only show when editing existing restaurant */}
                {editingRestaurant && (
                  <div className="grid gap-2 pt-4 border-t border-slate-200/70">
                    <Label htmlFor="subdomain-mobile" className="flex items-center gap-2">
                      <span>서브도메인</span>
                      <span className="text-xs text-muted-foreground font-normal">(예: shop_1)</span>
                    </Label>
                    <Input 
                      id="subdomain-mobile" 
                      placeholder="shop_1" 
                      value={formData.subdomain}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        setFormData({...formData, subdomain: value});
                        setSubdomainWarning('');
                      }}
                      onBeforeInput={(e) => {
                        const inputEvent = e.nativeEvent as InputEvent;
                        const data = inputEvent.data || '';
                        if (data && /[^a-zA-Z0-9_-]/.test(data)) {
                          e.preventDefault();
                          setSubdomainWarning('영문 소문자/숫자만 입력 가능합니다. 한글 입력은 전환해 주세요.');
                        }
                      }}
                      inputMode="text"
                    />
                    <p className="text-xs text-muted-foreground">
                      영문 소문자, 숫자, 하이픈(-), 언더스코어(_)만 입력 가능합니다.
                      서브도메인을 설정하면 <code className="px-1 py-0.5 bg-muted rounded">{normalizeShopUrl(generateSubdomainUrl(formData.subdomain || 'shop_1', '/shop')).replace(/^https?:\/\//, '') || 'shop_1.qoodle.top/shop'}</code> 형식으로 접근할 수 있습니다.
                      {formData.subdomain && (
                        <span className="block mt-1 text-green-600">
                          현재 URL: <code className="px-1 py-0.5 bg-green-50 rounded">{normalizeShopUrl(generateSubdomainUrl(formData.subdomain, '/shop')).replace(/^https?:\/\//, '')}</code>
                        </span>
                      )}
                    </p>
                    {subdomainWarning && (
                      <p className="text-xs text-amber-600">{subdomainWarning}</p>
                    )}
                  </div>
                )}

                {/* Notification Sound - Only show when editing existing restaurant */}
                {editingRestaurant && (
                  <div className="grid gap-2 pt-4 border-t border-slate-200/70">
                    <Label className="flex items-center gap-2">
                      알림음
                      <span className="text-xs text-muted-foreground font-normal">(요청/채팅/주문)</span>
                    </Label>
                    <div className="flex flex-col gap-2">
                      {resolvedNotificationSoundUrl && (
                        <audio controls src={resolvedNotificationSoundUrl} className="w-full" />
                      )}
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setNotificationSoundFile(file);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleUploadNotificationSound}
                          disabled={isUploadingSound || !notificationSoundFile}
                        >
                          {isUploadingSound ? '업로드 중...' : '업로드'}
                        </Button>
                        {resolvedNotificationSoundUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(resolvedNotificationSoundUrl);
                              toast.success('알림음 URL이 복사되었습니다.');
                            }}
                          >
                            URL 복사
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        iOS 백그라운드 푸시에서는 시스템 기본 알림음이 사용됩니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* Shop Manager Endpoint - Only show when editing existing restaurant */}
                {editingRestaurant && (
                  <div className="grid gap-2 pt-4 border-t border-slate-200/70">
                    <Label className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      상점 관리자 사이트
                    </Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                          {editingRestaurant.subdomain 
                            ? generateSubdomainUrl(editingRestaurant.subdomain, '/shop')
                            : `${frontendBaseUrl}/shop/restaurant/${editingRestaurant.id}/login`}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = editingRestaurant.subdomain 
                              ? generateSubdomainUrl(editingRestaurant.subdomain, '/shop')
                              : `${frontendBaseUrl}/shop/restaurant/${editingRestaurant.id}/login`;
                            navigator.clipboard.writeText(url);
                            toast.success('URL이 클립보드에 복사되었습니다.');
                          }}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          복사
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = editingRestaurant.subdomain 
                              ? generateSubdomainUrl(editingRestaurant.subdomain, '/shop')
                              : `${frontendBaseUrl}/shop/restaurant/${editingRestaurant.id}/login`;
                            window.open(url, '_blank');
                          }}
                          className="shrink-0"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          열기
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {editingRestaurant.subdomain ? (
                          <>서브도메인 기반 URL: <code className="px-1 py-0.5 bg-muted rounded">{normalizeShopUrl(generateSubdomainUrl(editingRestaurant.subdomain, '/shop')).replace(/^https?:\/\//, '')}</code></>
                        ) : (
                          <>레거시 경로: <code className="px-1 py-0.5 bg-muted rounded">/shop/restaurant/{editingRestaurant.id}/login</code> (서브도메인 설정 권장)</>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
              <Button type="submit" onClick={handleSaveRestaurant}>
                {editingRestaurant ? '수정 저장' : t('restaurants.add')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* QR Code Sheet/Drawer */}
      {isDesktop ? (
        <Sheet open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <SheetContent className="w-full sm:max-w-xl md:max-w-3xl overflow-hidden flex flex-col p-0 bg-background" side="right">
            <SheetHeader className="px-8 py-6 pb-2 border-none">
              <div className="flex flex-col gap-1">
                <SheetTitle className="text-2xl font-semibold tracking-tight">{selectedRestaurantForQr?.name}</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  {isLoadingTables ? '테이블 정보를 불러오는 중...' : `총 ${tables.length}개 테이블의 QR 코드입니다.`}
                </SheetDescription>
              </div>
            </SheetHeader>
            
            <div className="flex-1 w-full overflow-y-auto min-h-0">
              {isLoadingTables ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-muted-foreground">로딩 중...</div>
                </div>
              ) : tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8">
                  <div className="text-muted-foreground text-center mb-4">
                    등록된 테이블이 없습니다.
                  </div>
                  <div className="text-sm text-muted-foreground/70 text-center">
                    상점 관리자 앱에서 테이블을 추가한 후 QR 코드를 생성할 수 있습니다.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-8 pt-4">
                  {tables.map((table) => {
                    // 백엔드에서 받은 qrCodeUrl 사용, 없으면 서브도메인 기반으로 생성 시도
                    let customerUrl: string;
                    if (table.qrCodeUrl) {
                      customerUrl = table.qrCodeUrl;
                    } else if (selectedRestaurantForQr?.subdomain) {
                      // 서브도메인이 설정되어 있으면 직접 URL 생성
                      customerUrl = generateSubdomainUrl(selectedRestaurantForQr.subdomain, `/customer/table/${table.tableNumber}`);
                    } else {
                      // 서브도메인이 없는 경우 에러 표시
                      customerUrl = '#';
                      console.warn(`Table ${table.tableNumber} does not have qrCodeUrl. Restaurant may not have subdomain configured.`);
                    }
                    return (
                      <div key={table.id} className="group flex flex-col items-center p-6 rounded-3xl bg-secondary/20 hover:bg-secondary/40 transition-colors duration-300">
                        <div className="flex flex-col items-center mb-5">
                          <span className="text-sm font-medium text-foreground/70">Table {table.tableNumber}</span>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground/60">{table.floor}F</span>
                            <span className="text-[10px] text-muted-foreground/60">•</span>
                            <span className="text-[10px] text-muted-foreground/60">{table.capacity}명</span>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white rounded-2xl shadow-sm mb-6 transition-transform duration-300 group-hover:scale-105">
                          {customerUrl === '#' ? (
                            <div className="w-[130px] h-[130px] flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
                              <div className="text-center p-2">
                                <p className="text-[10px] font-semibold text-red-600 mb-1">서브도메인</p>
                                <p className="text-[10px] text-red-500">미설정</p>
                              </div>
                            </div>
                          ) : (
                            <QRCodeSVG
                              id={`restaurant-qr-code-${table.id}`}
                              value={customerUrl}
                              size={130}
                              level={"H"}
                              includeMargin={false}
                            />
                          )}
                        </div>
                        
                        <div className="w-full mt-auto space-y-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-background rounded-md border border-border/50">
                              <div className="flex-1 text-[10px] font-mono text-muted-foreground truncate">
                                {customerUrl === '#' ? '서브도메인 미설정' : customerUrl}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => {
                                  if (customerUrl !== '#') {
                                    navigator.clipboard.writeText(customerUrl);
                                    toast.success('URL이 클립보드에 복사되었습니다.');
                                  } else {
                                    toast.error('QR 코드 URL을 생성할 수 없습니다. 서브도메인을 설정해주세요.');
                                  }
                                }}
                                disabled={customerUrl === '#'}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => {
                                  if (customerUrl !== '#') {
                                    window.open(customerUrl, '_blank');
                                  } else {
                                    toast.error('QR 코드 URL을 생성할 수 없습니다. 서브도메인을 설정해주세요.');
                                  }
                                }}
                                disabled={customerUrl === '#'}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex justify-center">
                              <span className="text-[10px] text-muted-foreground/40 font-mono tracking-wider uppercase">
                                {selectedRestaurantForQr?.id} • {table.tableNumber}
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            className="w-full h-10 rounded-xl bg-background border-transparent shadow-sm hover:border-primary/20 hover:text-primary hover:bg-background transition-all"
                            onClick={() => handleDownloadQrCode(table.id, table.tableNumber)}
                            disabled={customerUrl === '#'}
                          >
                            <Download className="mr-2 h-3.5 w-3.5" />
                            Save Image
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <SheetFooter className="px-8 py-6 border-none sm:justify-between items-center mt-auto">
              <p className="text-[11px] text-muted-foreground/50 hidden sm:block">
                * 고해상도 인쇄를 위해 이미지를 저장하세요.
              </p>
              <Button variant="ghost" onClick={() => setIsQrDialogOpen(false)} className="text-muted-foreground hover:text-foreground">
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DrawerContent className="h-[85vh] max-h-[85vh] flex flex-col bg-background">
            <DrawerHeader className="px-6 py-4 text-left">
              <DrawerTitle className="text-xl font-bold">{selectedRestaurantForQr?.name}</DrawerTitle>
              <DrawerDescription>
                {isLoadingTables ? '테이블 정보를 불러오는 중...' : `총 ${tables.length}개 테이블의 QR 코드입니다.`}
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="flex-1 w-full overflow-y-auto min-h-0">
              {isLoadingTables ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-muted-foreground">로딩 중...</div>
                </div>
              ) : tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="text-muted-foreground text-center mb-4">
                    등록된 테이블이 없습니다.
                  </div>
                  <div className="text-xs text-muted-foreground/70 text-center">
                    상점 관리자 앱에서 테이블을 추가한 후 QR 코드를 생성할 수 있습니다.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 p-6 pt-2">
                  {tables.map((table) => {
                    // 백엔드에서 받은 qrCodeUrl 사용, 없으면 서브도메인 기반으로 생성 시도
                    let customerUrl: string;
                    if (table.qrCodeUrl) {
                      customerUrl = table.qrCodeUrl;
                    } else if (selectedRestaurantForQr?.subdomain) {
                      // 서브도메인이 설정되어 있으면 직접 URL 생성
                      customerUrl = generateSubdomainUrl(selectedRestaurantForQr.subdomain, `/customer/table/${table.tableNumber}`);
                    } else {
                      // 서브도메인이 없는 경우 에러 표시
                      customerUrl = '#';
                      console.warn(`Table ${table.tableNumber} does not have qrCodeUrl. Restaurant may not have subdomain configured.`);
                    }
                    return (
                      <div key={table.id} className="group flex flex-col items-center p-6 rounded-3xl bg-secondary/20 hover:bg-secondary/40 transition-colors duration-300">
                        <div className="flex flex-col items-center mb-5">
                          <span className="text-sm font-medium text-foreground/70">Table {table.tableNumber}</span>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground/60">{table.floor}F</span>
                            <span className="text-[10px] text-muted-foreground/60">•</span>
                            <span className="text-[10px] text-muted-foreground/60">{table.capacity}명</span>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white rounded-2xl shadow-sm mb-6 transition-transform duration-300 group-hover:scale-105">
                          {customerUrl === '#' ? (
                            <div className="w-[130px] h-[130px] flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
                              <div className="text-center p-2">
                                <p className="text-[10px] font-semibold text-red-600 mb-1">서브도메인</p>
                                <p className="text-[10px] text-red-500">미설정</p>
                              </div>
                            </div>
                          ) : (
                            <QRCodeSVG
                              id={`restaurant-qr-code-mobile-${table.id}`}
                              value={customerUrl}
                              size={130}
                              level={"H"}
                              includeMargin={false}
                            />
                          )}
                        </div>
                        
                        <div className="w-full mt-auto space-y-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-background rounded-md border border-border/50">
                              <div className="flex-1 text-[10px] font-mono text-muted-foreground truncate">
                                {customerUrl === '#' ? '서브도메인 미설정' : customerUrl}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => {
                                  if (customerUrl !== '#') {
                                    navigator.clipboard.writeText(customerUrl);
                                    toast.success('URL이 클립보드에 복사되었습니다.');
                                  } else {
                                    toast.error('QR 코드 URL을 생성할 수 없습니다. 서브도메인을 설정해주세요.');
                                  }
                                }}
                                disabled={customerUrl === '#'}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => {
                                  if (customerUrl !== '#') {
                                    window.open(customerUrl, '_blank');
                                  } else {
                                    toast.error('QR 코드 URL을 생성할 수 없습니다. 서브도메인을 설정해주세요.');
                                  }
                                }}
                                disabled={customerUrl === '#'}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex justify-center">
                              <span className="text-[10px] text-muted-foreground/40 font-mono tracking-wider uppercase">
                                {selectedRestaurantForQr?.id} • {table.tableNumber}
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            className="w-full h-10 rounded-xl bg-background border-transparent shadow-sm hover:border-primary/20 hover:text-primary hover:bg-background transition-all"
                            onClick={() => handleDownloadQrCode(table.id, table.tableNumber)}
                            disabled={customerUrl === '#'}
                          >
                            <Download className="mr-2 h-3.5 w-3.5" />
                            Save Image
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DrawerFooter className="px-6 py-4 pt-2">
              <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>
                Close
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Mobile View - Cards (Applied Pagination) */}
      <div className="grid gap-4 md:hidden">
        {paginatedRestaurants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-white rounded-2xl border border-dashed border-zinc-100 shadow-sm">
            검색 결과가 없습니다.
          </div>
        ) : (
          paginatedRestaurants.map((restaurant, index) => (
            <div key={restaurant.id} className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm space-y-4 transition-all active:scale-[0.99]">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-mono text-muted-foreground">#{(currentPage - 1) * itemsPerPage + index + 1}</span>
                      <a
                       href={normalizeShopUrl(
                         restaurant.subdomain 
                           ? generateSubdomainUrl(restaurant.subdomain, '/shop')
                           : `${frontendBaseUrl}/shop/restaurant/${restaurant.id}/login`,
                       )}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="font-bold text-lg text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                       onClick={(e) => {
                         e.stopPropagation();
                       }}
                     >
                       {restaurant.name}
                     </a>
                     <Badge variant="outline" className="text-[10px] h-5 px-1.5">{restaurant.category}</Badge>
                  </div>
                </div>
                {restaurant.status === 'active' && <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">{t('restaurants.status.active')}</Badge>}
                {restaurant.status === 'pending' && <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">{t('restaurants.status.pending')}</Badge>}
                {restaurant.status === 'inactive' && <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">{t('restaurants.status.inactive')}</Badge>}
              </div>
              
              <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tables</span>
                   <span className="font-semibold text-sm">{restaurant.tables}개</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Region</span>
                   <span className="font-semibold text-sm">{restaurant.region}</span>
                </div>
                <div className="flex flex-col col-span-2">
                   <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Category</span>
                   <span className="font-semibold text-sm">{restaurant.category}</span>
                </div>
                <div className="flex flex-col col-span-2">
                   <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Subdomain</span>
                   <span className="font-semibold text-sm">{restaurant.subdomain || '-'}</span>
                </div>
                <div className="flex flex-col col-span-2 pt-1 border-t border-dashed border-muted-foreground/20">
                   <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Joined</span>
                   <span className="font-medium text-sm">{restaurant.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-white border-zinc-100 shadow-sm" onClick={() => handleOpenQrDialog(restaurant)}>
                  <QrCode className="w-4 h-4 mr-2" />
                  QR 관리
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-zinc-100 shadow-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t('restaurants.table.actions')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(restaurant)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      정보 수정
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenQrDialog(restaurant)}>
                      <QrCode className="mr-2 h-4 w-4" />
                      {t('restaurants.action.qr')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {restaurant.status === 'pending' && (
                      <>
                        <DropdownMenuItem className="text-green-600 focus:text-green-700 focus:bg-green-50" onClick={() => handleStatusChange(restaurant.id, 'active')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {t('restaurants.action.approve')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => handleDeleteRestaurant(restaurant.id)}>
                          <XCircle className="mr-2 h-4 w-4" />
                          {t('restaurants.action.reject')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {restaurant.status === 'active' && (
                        <DropdownMenuItem className="text-orange-600 focus:text-orange-700 focus:bg-orange-50" onClick={() => handleStatusChange(restaurant.id, 'inactive')}>
                          <Ban className="mr-2 h-4 w-4" />
                          {t('restaurants.action.suspend')}
                        </DropdownMenuItem>
                    )}
                    {restaurant.status === 'inactive' && (
                        <DropdownMenuItem className="text-green-600 focus:text-green-700 focus:bg-green-50" onClick={() => handleStatusChange(restaurant.id, 'active')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          활성화
                        </DropdownMenuItem>
                    )}
                      <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => handleDeleteRestaurant(restaurant.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                    className="w-[80px] cursor-pointer hover:bg-muted/50 text-center" 
                    onClick={() => requestSort('id')}
                >
                    <div className="flex items-center justify-center">
                        No.
                        {renderSortIcon('id')}
                    </div>
                </TableHead>
                <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => requestSort('name')}
                >
                    <div className="flex items-center">
                        {t('restaurants.table.restaurant')}
                        {renderSortIcon('name')}
                    </div>
                </TableHead>
                <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => requestSort('category')}
                >
                    <div className="flex items-center">
                        카테고리
                        {renderSortIcon('category')}
                    </div>
                </TableHead>
                <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => requestSort('subdomain')}
                >
                    <div className="flex items-center">
                        서브도메인
                        {renderSortIcon('subdomain')}
                    </div>
                </TableHead>
                <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => requestSort('date')}
                >
                    <div className="flex items-center">
                        {t('restaurants.table.joined')}
                        {renderSortIcon('date')}
                    </div>
                </TableHead>
                <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => requestSort('status')}
                >
                    <div className="flex items-center">
                        {t('restaurants.table.status')}
                        {renderSortIcon('status')}
                    </div>
                </TableHead>
                <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => requestSort('tables')}
                >
                    <div className="flex items-center">
                        {t('restaurants.table.tables')}
                        {renderSortIcon('tables')}
                    </div>
                </TableHead>
                <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => requestSort('region')}
                >
                    <div className="flex items-center">
                        지역
                        {renderSortIcon('region')}
                    </div>
                </TableHead>
                <TableHead className="text-right">{t('restaurants.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRestaurants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRestaurants.map((restaurant, index) => {
                  const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium text-center">{displayIndex}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <a
                              href={normalizeShopUrl(
                                restaurant.subdomain 
                                  ? generateSubdomainUrl(restaurant.subdomain, '/shop')
                                  : `${frontendBaseUrl}/shop/restaurant/${restaurant.id}/login`,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-base tracking-tight hover:text-primary hover:underline cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {restaurant.name}
                            </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold tracking-wide text-primary border-primary/30 bg-primary/5">
                        {restaurant.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {restaurant.subdomain || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{restaurant.date}</TableCell>
                    <TableCell>
                      {restaurant.status === 'active' && (
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                          {t('restaurants.status.active')}
                        </Badge>
                      )}
                      {restaurant.status === 'pending' && (
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                          {t('restaurants.status.pending')}
                        </Badge>
                      )}
                      {restaurant.status === 'inactive' && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80">
                          {t('restaurants.status.inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{restaurant.tables}개</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{restaurant.region}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('restaurants.table.actions')}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(restaurant)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            정보 수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenQrDialog(restaurant)}>
                            <QrCode className="mr-2 h-4 w-4" />
                            {t('restaurants.action.qr')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {restaurant.status === 'pending' && (
                            <>
                              <DropdownMenuItem className="text-green-600 focus:text-green-700 focus:bg-green-50" onClick={() => handleStatusChange(restaurant.id, 'active')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {t('restaurants.action.approve')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => handleDeleteRestaurant(restaurant.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                {t('restaurants.action.reject')}
                              </DropdownMenuItem>
                            </>
                          )}
                          {restaurant.status === 'active' && (
                             <DropdownMenuItem className="text-orange-600 focus:text-orange-700 focus:bg-orange-50" onClick={() => handleStatusChange(restaurant.id, 'inactive')}>
                               <Ban className="mr-2 h-4 w-4" />
                               {t('restaurants.action.suspend')}
                             </DropdownMenuItem>
                          )}
                          {restaurant.status === 'inactive' && (
                             <DropdownMenuItem className="text-green-600 focus:text-green-700 focus:bg-green-50" onClick={() => handleStatusChange(restaurant.id, 'active')}>
                               <CheckCircle className="mr-2 h-4 w-4" />
                               활성화
                             </DropdownMenuItem>
                          )}
                           <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => handleDeleteRestaurant(restaurant.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200/70 bg-white/60">
            <div className="flex-1 text-sm text-muted-foreground">
                총 {filteredRestaurants.length}개 중 {paginatedRestaurants.length}개 표시
            </div>
            <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 bg-white/80 border-slate-200/70"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 bg-white/80 border-slate-200/70"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 mx-2">
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">/ {totalPages || 1}</span>
                </div>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 bg-white/80 border-slate-200/70"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 bg-white/80 border-slate-200/70"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
