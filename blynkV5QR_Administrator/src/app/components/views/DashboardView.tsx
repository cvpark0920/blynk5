import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ArrowUpRight, Users, Store, AlertCircle, DollarSign, Activity, Settings, Calendar, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const monthlyData = [
  { name: '1월', revenue: 4000, commission: 400 },
  { name: '2월', revenue: 3000, commission: 300 },
  { name: '3월', revenue: 2000, commission: 200 },
  { name: '4월', revenue: 2780, commission: 278 },
  { name: '5월', revenue: 1890, commission: 189 },
  { name: '6월', revenue: 2390, commission: 239 },
  { name: '7월', revenue: 3490, commission: 349 },
];

export function DashboardView({ onChangeView }: { onChangeView: (view: string) => void }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('revenue.total_gmv')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩124,592,000</div>
            <p className="text-xs text-muted-foreground flex items-center text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12% {t('dashboard.from_last_month')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('revenue.platform_fees')}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₩12,459,200</div>
            <p className="text-xs text-muted-foreground flex items-center text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12% {t('dashboard.from_last_month')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.active_restaurants')}</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
            <p className="text-xs text-muted-foreground flex items-center text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12 {t('dashboard.new_this_month')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">{t('dashboard.pending_approvals')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">7</div>
            <Button 
                variant="link" 
                className="h-auto p-0 text-xs text-orange-700 underline"
                onClick={() => onChangeView('restaurants')}
            >
                {t('dashboard.review_applications')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 min-w-0">
          <CardHeader>
            <CardTitle>{t('revenue.chart.revenue_vs_commission')}</CardTitle>
            <CardDescription>{t('revenue.chart.breakdown')}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Tabs defaultValue="bar" className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <TabsList>
                    <TabsTrigger value="bar">Monthly</TabsTrigger>
                    <TabsTrigger value="line">Trend</TabsTrigger>
                  </TabsList>
               </div>
               
               <TabsContent value="bar" className="h-[300px] w-full min-w-0 relative">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={monthlyData}>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₩${value}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            cursor={{ fill: 'transparent' }} 
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#e2e8f0" radius={[4, 4, 0, 0]} name={t('revenue.total_gmv')} />
                        <Bar dataKey="commission" fill="#4f46e5" radius={[4, 4, 0, 0]} name={t('revenue.platform_fees')} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
               </TabsContent>
               <TabsContent value="line" className="h-[300px] w-full min-w-0 relative">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <LineChart data={monthlyData}>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₩${value}`} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Legend />
                        <Line type="monotone" dataKey="commission" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} name={t('revenue.platform_fees')} />
                        <Line type="monotone" dataKey="revenue" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} name={t('revenue.total_gmv')} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
               </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('dashboard.recent_activity')}</CardTitle>
            <CardDescription>{t('dashboard.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[
                { type: 'signup', msg: '새로운 식당 "버거 랩" 가입', time: '2분 전', icon: Store, color: 'text-blue-500', bg: 'bg-blue-50' },
                { type: 'sale', msg: '"피자 헤븐" 정산 완료', time: '1시간 전', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
                { type: 'alert', msg: '"스시 고" 높은 트래픽 감지', time: '3시간 전', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-50' },
                { type: 'user', msg: '관리자가 수수료율 업데이트', time: '5시간 전', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50' },
                { type: 'signup', msg: '새로운 식당 "타코 피에스타" 가입', time: '어제', icon: Store, color: 'text-blue-500', bg: 'bg-blue-50' },
              ].map((item, i) => (
                <div key={i} className="flex items-center">
                  <div className={`mr-4 rounded-full p-2 ${item.bg} ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.msg}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
