import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { User, Lock, Bell, Percent, Shield, Plus, MessageSquare, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QuickChipsView } from './QuickChipsView';

export function SettingsView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h2>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-zinc-100 p-1 w-full md:w-auto grid grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="general" className="flex items-center justify-center gap-1">
            <Settings className="w-3 h-3" />
            {t('settings.tab.general')}
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center justify-center gap-1">
            <Percent className="w-3 h-3" />
            {t('settings.tab.commission')}
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center justify-center gap-1">
            <User className="w-3 h-3" />
            {t('settings.tab.admins')}
          </TabsTrigger>
          <TabsTrigger value="quickchips" className="flex items-center justify-center gap-1">
            <MessageSquare className="w-3 h-3" />
            상용구
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-4">
          <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>{t('settings.general.info')}</CardTitle>
              <CardDescription>{t('settings.general.info_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">{t('settings.general.platform_name')}</Label>
                <Input id="platform-name" defaultValue="TableOrder Operator" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">{t('settings.general.support_email')}</Label>
                <Input id="support-email" defaultValue="support@tableorder.com" />
              </div>
              <div className="flex items-center justify-between space-x-2 pt-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.general.maintenance')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.general.maintenance_desc')}
                  </p>
                </div>
                <Switch />
              </div>
              <Button>{t('settings.general.save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission" className="mt-4">
          <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>{t('settings.commission.config')}</CardTitle>
              <CardDescription>{t('settings.commission.config_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0">
              <div className="grid gap-2">
                <Label htmlFor="commission-rate" className="flex items-center">
                  <Percent className="w-4 h-4 mr-2" /> 
                  {t('settings.commission.rate')}
                </Label>
                <Input id="commission-rate" type="number" defaultValue="10.0" />
                <p className="text-xs text-muted-foreground">{t('settings.commission.rate_help')}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="flat-fee">{t('settings.commission.flat')}</Label>
                <Input id="flat-fee" type="number" defaultValue="0.30" />
              </div>
              <Button>{t('settings.commission.update')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
           <Card className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>{t('settings.admins.title')}</CardTitle>
              <CardDescription>{t('settings.admins.desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0">
              <div className="space-y-4">
                {[
                  { name: '슈퍼 관리자', email: 'super@admin.com', role: 'Owner' },
                  { name: '지원 팀', email: 'support@admin.com', role: 'Editor' },
                  { name: '재무 팀', email: 'finance@admin.com', role: 'Viewer' },
                ].map((admin, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 bg-white shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">{admin.role}</span>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" /> 
                {t('settings.admins.add')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quickchips" className="mt-6">
          <QuickChipsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
