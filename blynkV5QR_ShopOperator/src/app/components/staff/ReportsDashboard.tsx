import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { formatPriceVND } from '../../utils/priceFormat';
import { apiClient } from '../../../lib/api';
import { BackendSalesReport, BackendSalesHistoryEntry } from '../../types/api';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Clock, Table as TableIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko, vi, enUS, Locale } from 'date-fns/locale';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '../ui/pagination';

// Color palette for categories
const categoryColors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];

export function ReportsDashboard() {
  const { t, language } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<BackendSalesReport | null>(null);
  const [salesHistory, setSalesHistory] = useState<BackendSalesHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (restaurantId) {
      // Don't load if custom period is selected but date range is incomplete
      if (period === 'custom' && (!dateRange.from || !dateRange.to)) {
        return;
      }
      loadReport();
      loadSalesHistory();
    }
  }, [restaurantId, period, language, dateRange.from, dateRange.to]);

  // Reset to first page when period or date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [period, dateRange.from, dateRange.to]);

  const loadReport = async () => {
    if (!restaurantId) return;
    
    // Don't load if custom period is selected but date range is incomplete
    if (period === 'custom' && (!dateRange.from || !dateRange.to)) {
      return;
    }

    setIsLoading(true);
    try {
      const startDate = period === 'custom' && dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
      const endDate = period === 'custom' && dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
      const result = await apiClient.getSalesReport(
        restaurantId, 
        period === 'custom' ? 'today' : period, 
        language,
        startDate,
        endDate
      );
      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        toast.error(t('report.error_failed'));
      }
    } catch (error: unknown) {
      console.error('Error loading report:', error);
      toast.error(t('report.error_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSalesHistory = async () => {
    if (!restaurantId) return;
    
    // Don't load if custom period is selected but date range is incomplete
    if (period === 'custom' && (!dateRange.from || !dateRange.to)) {
      return;
    }

    setIsLoadingHistory(true);
    try {
      const startDate = period === 'custom' && dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
      const endDate = period === 'custom' && dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
      const result = await apiClient.getSalesHistory(
        restaurantId, 
        period === 'custom' ? 'today' : period, 
        language,
        startDate,
        endDate
      );
      if (result.success && result.data) {
        setSalesHistory(result.data);
      } else {
        console.error('Failed to load sales history:', result.error);
      }
    } catch (error: unknown) {
      console.error('Error loading sales history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const formatDateRange = (from: Date | undefined, to: Date | undefined): string => {
    if (!from || !to) return '';
    
    const localeMap: Record<string, Locale> = {
      ko: ko,
      vn: vi,
      en: enUS,
    };
    
    const locale = localeMap[language] || enUS;
    
    if (language === 'ko') {
      return `${format(from, 'yyyy년 MM월 dd일', { locale })} ~ ${format(to, 'yyyy년 MM월 dd일', { locale })}`;
    } else if (language === 'vn') {
      return `${format(from, 'dd/MM/yyyy', { locale })} ~ ${format(to, 'dd/MM/yyyy', { locale })}`;
    } else {
      return `${format(from, 'MMM dd, yyyy', { locale })} ~ ${format(to, 'MMM dd, yyyy', { locale })}`;
    }
  };

  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      setPeriod('custom');
      setIsCalendarOpen(true);
    } else {
      setPeriod(value as 'today' | 'week' | 'month');
      setDateRange({ from: undefined, to: undefined });
    }
  };

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setDateRange(range);
      // 날짜 범위가 완전히 선택되었을 때만 Popover 닫기
      if (range.from && range.to) {
        setIsCalendarOpen(false);
      }
    }
  };

  // Transform weekly data for chart (map date to day name)
  const weeklyData = reportData?.statistics.weekly.map((day) => {
    const date = new Date(day.date);
    // Use date-fns to get localized day names
    const locale = language === 'ko' ? ko : language === 'vn' ? vi : enUS;
    const dayNames = language === 'ko' 
      ? ['일', '월', '화', '수', '목', '금', '토']
      : language === 'vn'
      ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      name: dayNames[date.getDay()],
      revenue: day.revenue,
      orders: day.orders,
    };
  }) || [];

  // Transform hourly data for chart
  const hourlyData = reportData?.hourlyOrders || [];

  // Transform category data for pie chart
  const categoryData = reportData?.categoryDistribution.map((cat, index) => ({
    name: cat.categoryName,
    value: cat.percentage,
    color: categoryColors[index % categoryColors.length],
    revenue: cat.revenue,
  })) || [];

  // Transform top items
  const topItems = reportData?.topMenuItems.map((item) => ({
    name: item.menuItemName,
    count: item.orderCount,
    revenue: item.revenue,
  })) || [];

  // Calculate statistics based on selected period
  const totalRevenue = period === 'today' 
    ? (reportData?.statistics.today.revenue || 0)
    : period === 'week' || period === 'month' || period === 'custom'
    ? (weeklyData.reduce((sum, day) => sum + day.revenue, 0))
    : (reportData?.statistics.today.revenue || 0);
  
  const totalOrders = period === 'today'
    ? (reportData?.statistics.today.orders || 0)
    : period === 'week' || period === 'month' || period === 'custom'
    ? (weeklyData.reduce((sum, day) => sum + day.orders, 0))
    : (reportData?.statistics.today.orders || 0);
  
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const turnoverRate = reportData?.statistics.turnoverRate || 0;

  // Calculate percentage change from yesterday (only for today period)
  const yesterdayRevenue = reportData?.statistics.yesterday.revenue || 0;
  const revenueChangePercent = period === 'today' && yesterdayRevenue > 0
    ? (((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
    : null;
  const isRevenueIncrease = period === 'today' ? (totalRevenue >= yesterdayRevenue) : null;

  // Calculate average orders (simple average of weekly orders)
  const avgOrders = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((sum, day) => sum + day.orders, 0) / weeklyData.length)
    : 0;
  const ordersChange = totalOrders - avgOrders;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2.5 sm:p-3 border border-zinc-200 rounded-lg shadow-lg text-xs">
          <p className="font-semibold mb-1.5 sm:mb-2 text-zinc-900 text-xs">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-zinc-700 text-xs" style={{ color: entry.color || entry.fill }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const currentDate = new Date().toLocaleDateString(language === 'ko' ? 'ko-KR' : language === 'vn' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Show message if custom period is selected but date range is incomplete
  const showDateRangePrompt = period === 'custom' && (!dateRange.from || !dateRange.to);

  // Group sales history by session (table)
  const groupBySession = (orders: BackendSalesHistoryEntry[]) => {
    const grouped = orders.reduce((acc, order) => {
      const sessionKey = order.sessionId || `table-${order.tableNumber}-${order.createdAt}`; // Fallback to table+time if no sessionId
      if (!acc[sessionKey]) {
        acc[sessionKey] = {
          sessionId: order.sessionId,
          tableNumber: order.tableNumber,
          orders: [],
          totalAmount: 0,
          createdAt: order.createdAt, // Use earliest order time
        };
      }
      acc[sessionKey].orders.push(order);
      acc[sessionKey].totalAmount += order.totalAmount;
      // Update createdAt to earliest order time
      if (new Date(order.createdAt) < new Date(acc[sessionKey].createdAt)) {
        acc[sessionKey].createdAt = order.createdAt;
      }
      return acc;
    }, {} as Record<string, {
      sessionId: string;
      tableNumber: number;
      orders: BackendSalesHistoryEntry[];
      totalAmount: number;
      createdAt: string;
    }>);

    // Convert to array and sort by createdAt (most recent first)
    return Object.values(grouped).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const sessionsGrouped = groupBySession(salesHistory);

  // Pagination calculations (for sessions)
  const totalPages = Math.ceil(sessionsGrouped.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = sessionsGrouped.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }
      
      // Show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="p-4 pb-32 md:p-6 md:pb-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {period === 'custom' ? (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="flex-1 sm:min-w-[280px] sm:max-w-[400px] bg-white rounded-lg border border-zinc-200 px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <span className={`${dateRange.from && dateRange.to ? 'text-zinc-900' : 'text-zinc-500'} whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0`}>
                    {dateRange.from && dateRange.to 
                      ? formatDateRange(dateRange.from, dateRange.to)
                      : t('report.select_date_range')}
                  </span>
                  <CalendarIcon size={14} className="text-zinc-400 ml-2 flex-shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={isMobile ? 1 : 2}
                  className="rounded-md"
                />
              </PopoverContent>
            </Popover>
          ) : null}
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[120px] sm:w-[140px] bg-white rounded-lg border-zinc-200 text-xs sm:text-sm">
              <SelectValue placeholder={t('report.period')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t('report.period_today')}</SelectItem>
              <SelectItem value="week">{t('report.period_week')}</SelectItem>
              <SelectItem value="month">{t('report.period_month')}</SelectItem>
              <SelectItem value="custom">{t('report.period_custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showDateRangePrompt && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs sm:text-sm text-blue-700">
          {t('report.date_range_prompt')}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm text-zinc-600 truncate pr-1">
              {period === 'today' ? t('report.today_revenue') :
               period === 'week' ? t('report.week_revenue') :
               period === 'month' ? t('report.month_revenue') :
               t('report.period_revenue')}
            </span>
            <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-md flex-shrink-0">
              <DollarSign size={14} className="sm:w-4 sm:h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-lg sm:text-lg md:text-xl lg:text-2xl font-semibold text-zinc-900 mb-1 sm:mb-2 break-words">
            {formatPriceVND(totalRevenue)}
          </div>
          {revenueChangePercent !== null && (
            <div className={`text-[10px] sm:text-xs flex items-center gap-1 ${isRevenueIncrease ? 'text-emerald-600' : 'text-red-600'}`}>
              <TrendingUp size={10} className="sm:w-3 sm:h-3 flex-shrink-0" style={{ transform: !isRevenueIncrease ? 'rotate(180deg)' : 'none' }} />
              <span className="truncate">{isRevenueIncrease ? '+' : ''}{revenueChangePercent}% {t('report.from_yesterday')}</span>
            </div>
          )}
          {revenueChangePercent === null && totalRevenue === 0 && (
            <div className="text-[10px] sm:text-xs text-zinc-400">
              {t('report.no_data')}
            </div>
          )}
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm text-zinc-600 truncate pr-1">{t('report.total_orders')}</span>
            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-md flex-shrink-0">
              <ShoppingBag size={14} className="sm:w-4 sm:h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-lg sm:text-lg md:text-xl lg:text-2xl font-semibold text-zinc-900 mb-1 sm:mb-2">
            {totalOrders}
          </div>
          {avgOrders > 0 && (
            <div className={`text-[10px] sm:text-xs flex items-center gap-1 ${ordersChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              <span className="truncate">{ordersChange >= 0 ? '+' : ''}{ordersChange} {t('report.orders_from_avg')}</span>
            </div>
          )}
          {avgOrders === 0 && totalOrders === 0 && (
            <div className="text-[10px] sm:text-xs text-zinc-400">
              {t('report.no_data')}
            </div>
          )}
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm text-zinc-600 truncate pr-1">{t('report.avg_order')}</span>
            <div className="p-1.5 sm:p-2 bg-purple-50 rounded-md flex-shrink-0">
              <CalendarIcon size={14} className="sm:w-4 sm:h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-lg sm:text-lg md:text-xl lg:text-2xl font-semibold text-zinc-900 mb-1 sm:mb-2 break-words">
            {formatPriceVND(avgOrderValue)}
          </div>
          <div className="text-[10px] sm:text-xs text-zinc-500">
            {t('report.per_order')}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm text-zinc-600 truncate pr-1">{t('report.turnover')}</span>
            <div className="p-1.5 sm:p-2 bg-orange-50 rounded-md flex-shrink-0">
              <Users size={14} className="sm:w-4 sm:h-4 text-orange-600" />
            </div>
          </div>
          <div className="text-lg sm:text-lg md:text-xl lg:text-2xl font-semibold text-zinc-900 mb-1 sm:mb-2">
            {turnoverRate}x
          </div>
          <div className={`text-[10px] sm:text-xs truncate ${turnoverRate >= 3 ? 'text-orange-600' : turnoverRate >= 2 ? 'text-blue-600' : 'text-zinc-500'}`}>
            {turnoverRate >= 3 ? t('report.high_traffic') : turnoverRate >= 2 ? t('report.moderate') : t('report.low_traffic')}
          </div>
        </div>
      </div>

      {/* Sales History Section */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 mb-1">{t('report.sales_history')}</h3>
          <p className="text-xs sm:text-sm text-zinc-500">
            {period === 'today' ? t('report.sales_history_today') :
             period === 'week' ? t('report.sales_history_week') :
             period === 'month' ? t('report.sales_history_month') :
             period === 'custom' && dateRange.from && dateRange.to 
               ? formatDateRange(dateRange.from, dateRange.to)
               : t('report.sales_history')}
          </p>
        </div>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <Loader2 className="animate-spin text-zinc-400 w-5 h-5 sm:w-6 sm:h-6" size={20} />
            <span className="ml-3 text-zinc-500 text-sm">{t('report.loading')}</span>
          </div>
        ) : salesHistory.length === 0 ? (
          <div className="text-center py-12 sm:py-16 text-zinc-400 text-xs sm:text-sm">
            {t('report.no_sales_history')}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedSessions.map((session) => {
              const sessionKey = session.sessionId || `table-${session.tableNumber}-${session.createdAt}`;
              const isExpanded = expandedOrders.has(sessionKey);
              const sessionDate = new Date(session.createdAt);
              const allItems = session.orders.flatMap(order => order.items);
              const firstItem = allItems[0];
              const remainingItems = allItems.length - 1;

              return (
                <div key={sessionKey} className="border border-zinc-200 rounded-lg overflow-hidden hover:border-zinc-300 transition-colors">
                  {/* Session Header */}
                  <button
                    onClick={() => toggleOrderExpanded(sessionKey)}
                    className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-blue-500 rounded-lg flex items-center justify-center">
                        <TableIcon size={14} className="sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                          <span className="text-xs sm:text-sm font-medium text-zinc-900">
                            {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 flex items-center gap-1">
                            {t('table.number')} {session.tableNumber}
                          </span>
                          <span className="text-[10px] sm:text-xs text-zinc-500">
                            {session.orders.length} {session.orders.length === 1 ? (language === 'ko' ? '주문' : language === 'vn' ? 'đơn' : 'order') : (language === 'ko' ? '주문' : language === 'vn' ? 'đơn' : 'orders')}
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-zinc-500 truncate">
                          {firstItem?.menuItemName} x{firstItem?.quantity}
                          {remainingItems > 0 && ` ${t('report.and_more')} ${remainingItems}${t('report.items')}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-semibold text-zinc-900 whitespace-nowrap">
                            {formatPriceVND(session.totalAmount)}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {t('checkout.total')}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={14} className="sm:w-4 sm:h-4 text-zinc-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="sm:w-4 sm:h-4 text-zinc-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Session Details */}
                  {isExpanded && (
                    <div className="border-t border-zinc-200 bg-zinc-50/50">
                      <div className="p-3 sm:p-4 space-y-3">
                        {session.orders.map((order, orderIdx) => {
                          const orderDate = new Date(order.createdAt);
                          return (
                            <div key={order.orderId} className="bg-white rounded-lg border border-zinc-200 p-3">
                              {/* Order Header */}
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-100">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] sm:text-xs font-semibold text-zinc-500">
                                    #{order.orderNumber}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-zinc-400">
                                    {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                                  {formatPriceVND(order.totalAmount)}
                                </span>
                              </div>
                              {/* Order Items */}
                              <div className="space-y-1.5">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-zinc-800 truncate">{item.menuItemName}</span>
                                      <span className="text-zinc-500 flex-shrink-0">x{item.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                                      <span className="text-zinc-500 text-[10px] sm:text-xs hidden sm:inline">
                                        {formatPriceVND(item.unitPrice)} × {item.quantity}
                                      </span>
                                      <span className="text-zinc-900 font-semibold text-xs sm:text-sm">
                                        {formatPriceVND(item.totalPrice)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {/* Session Total */}
                        <div className="pt-2 mt-2 border-t border-zinc-300 flex items-center justify-between bg-white rounded-lg p-3">
                          <span className="text-sm sm:text-base font-semibold text-zinc-900">{t('checkout.total')}</span>
                          <span className="text-base sm:text-lg font-bold text-zinc-900">
                            {formatPriceVND(session.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-xs sm:text-sm text-zinc-500">
                  {startIndex + 1}-{Math.min(endIndex, sessionsGrouped.length)} / {sessionsGrouped.length}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, index) => {
                      if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page as number);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4 sm:mb-6">{t('report.weekly_trend')}</h3>
          <div className="h-[240px] sm:h-[280px] md:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#71717a' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#71717a' }} 
                  tickFormatter={(value) => `${value / 1000}k`}
                  width={35}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
                <Bar dataKey="revenue" fill="#18181b" radius={[4, 4, 0, 0]} barSize={isMobile ? 28 : 36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Items List */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200 flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4 sm:mb-5">{t('report.top_items')}</h3>
          <div className="flex-1 space-y-2 sm:space-y-3 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar max-h-[240px] sm:max-h-none">
            {topItems.length > 0 ? (
              topItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={`
                      w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-[10px] sm:text-xs font-semibold flex-shrink-0
                      ${i === 0 ? 'bg-amber-100 text-amber-700' : 
                        i === 1 ? 'bg-zinc-100 text-zinc-600' :
                        i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-zinc-50 text-zinc-500'}
                    `}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-zinc-900 truncate">{item.name}</p>
                      <p className="text-[10px] sm:text-xs text-zinc-500">{item.count} {t('report.orders')}</p>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-zinc-900 ml-2 sm:ml-3 flex-shrink-0">
                    {formatPriceVND(item.revenue)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-400 text-xs sm:text-sm">
                {t('report.no_data')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
         {/* Hourly Traffic Line Chart */}
         <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4 sm:mb-6">{t('report.hourly_traffic')}</h3>
            <div className="h-[220px] sm:h-[240px] md:h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} interval={isMobile ? 2 : 1} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} width={30} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Category Pie Chart */}
         <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4 sm:mb-6">{t('report.category_dist')}</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
               <div className="h-[160px] w-[160px] sm:h-[200px] sm:w-[200px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={isMobile ? 45 : 55}
                        outerRadius={isMobile ? 60 : 75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {categoryData.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-lg sm:text-xl font-semibold text-zinc-900">
                        {categoryData.reduce((sum, cat) => sum + cat.value, 0)}%
                      </span>
                    </div>
                  )}
               </div>
               <div className="space-y-2 sm:space-y-2.5 w-full sm:w-auto">
                  {categoryData.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                         <span className="font-medium text-zinc-700 truncate">{cat.name}</span>
                      </div>
                      <span className="font-semibold text-zinc-900 flex-shrink-0">{cat.value}%</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
